import {keyword, parse, walk} from '@eslint/css-tree';
import colorFunctionsWithAlpha from './shared/css-color-functions.js';
import {isLiteralColor, areEqualLiteralColors} from './shared/css-colors.js';
import {getNumericLiteralKey, isSafeIntegerSpelling} from './shared/css-numeric-literals.js';
import mathFunctions from './shared/css-math-functions.js';
import {areEqualValues, getCondensedValueCount} from './shared/css-shorthand-values.js';
import {
	getCommaSeparatedGroups,
	hasCommentInRange,
	isCssModulesInteropDeclaration,
	isSubstitutionFunction,
	normalizeCssIdentifier,
	toLocation,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID = 'no-redundant-functions';
const messages = {
	[MESSAGE_ID]: 'Simplify this redundant use of `{{functionName}}()`.',
};

const simplifiableFunctions = new Set(['calc', 'min', 'max', 'clamp', 'abs', 'sign', 'hypot', 'round', 'pow', 'random']);
const easingFunctions = new Set(['steps', 'cubic-bezier', 'linear']);
const easingProperties = new Set(['animation', 'transition', 'animation-timing-function', 'transition-timing-function']);
const defaultFunctions = new Set(['blur', 'brightness', 'contrast', 'drop-shadow', 'grayscale', 'hue-rotate', 'invert', 'opacity', 'saturate', 'sepia', 'translate', 'skew', 'scale']);
const contentFunctionDefaults = new Map([
	['counter', [2, 'decimal']],
	['counters', [3, 'decimal']],
	['target-counter', [3, 'decimal']],
	['target-counters', [4, 'decimal']],
	['target-text', [2, 'content']],
	['string', [2, 'first']],
	['element', [2, 'first']],
	['content', [1, 'text']],
]);
const contentFunctions = new Set([...contentFunctionDefaults.keys(), 'symbols']);
// Only sizing properties remap explicit anchor-size axes when flip-start swaps axes.
// Keep logical axes: engines differ when the box and its containing block have orthogonal writing modes.
const anchorSizeAxes = new Map([
	...['width', 'min-width', 'max-width'].map(property => [property, 'width']),
	...['height', 'min-height', 'max-height'].map(property => [property, 'height']),
]);
const shapeFunctions = new Set(['circle', 'ellipse', 'polygon', 'inset', 'rect', 'xywh', 'ray', 'shape', 'path']);
const defaultFillRuleProperties = new Set(['clip-path', 'shape-outside', 'offset-path', 'offset']);
const timelineFunctions = new Set(['scroll', 'view']);
const timelineAxes = new Set(['block', 'inline', 'x', 'y']);
const mixFunctions = new Set(['color-mix', 'palette-mix', 'calc-mix', 'cross-fade']);
const gradientFunctions = new Set(['linear-gradient', 'radial-gradient', 'conic-gradient', 'repeating-linear-gradient', 'repeating-radial-gradient', 'repeating-conic-gradient']);
const gradientPreludeKeywords = new Set(['to', 'in', 'at', 'from', 'circle', 'ellipse', 'closest-side', 'closest-corner', 'farthest-side', 'farthest-corner']);
const treeCountingFunctions = new Set(['sibling-count', 'sibling-index']);
const numberFunctions = new Set(['sin', 'cos', 'tan', 'sign', 'pow', 'sqrt', 'log', 'exp']);
const functionProblemGetters = new Map([
	['light-dark', getLightDarkProblem],
	['superellipse', getSuperellipseProblem],
	['dynamic-range-limit-mix', getDynamicRangeLimitProblem],
	['calc-size', getCalcSizeProblem],
	['stripes', getStripesProblem],
	['device-cmyk', getAlphaProblem],
	['image-set', getImageSetProblem],
]);
const functionNames = [
	...simplifiableFunctions,
	...easingFunctions,
	...defaultFunctions,
	...gradientFunctions,
	...contentFunctions,
	...shapeFunctions,
	...timelineFunctions,
	...mixFunctions,
	...functionProblemGetters.keys(),
	'attr',
	'anchor-size',
];
const functionPattern = new RegExp(String.raw`(?:${functionNames.join('|')})\(|\\`, 'iv');
const colorFunctionPattern = new RegExp(String.raw`(?:${[...colorFunctionsWithAlpha].join('|')})\(`, 'iv');
// Check the coefficient rather than converting to a number, which can underflow to zero. Negative zero is deliberately retained.
const positiveZeroPattern = /^\+?[.0]+(?:e[+\-]?\d+)?$/iv;
const cubicBezierKeywords = new Map([
	['0.25,0.1,0.25,1', 'ease'],
	['0.42,0,1,1', 'ease-in'],
	['0,0,0.58,1', 'ease-out'],
	['0.42,0,0.58,1', 'ease-in-out'],
]);
const superellipseKeywords = new Map([
	[0, 'bevel'],
	[1, 'round'],
	[2, 'squircle'],
	[-1, 'scoop'],
	['infinity', 'square'],
	['-infinity', 'notch'],
]);
const isMathFunction = node => node?.type === 'Function' && mathFunctions.has(normalizeCssIdentifier(node.name));
const isTreeCountingFunction = node => node?.type === 'Function' && treeCountingFunctions.has(normalizeCssIdentifier(node.name)) && [...node.children].length === 0;

function isCalculationArgument(node, parentFunction) {
	if (isMathFunction(parentFunction)) {
		return true;
	}

	const name = parentFunction && normalizeCssIdentifier(parentFunction.name);
	const argumentCount = name === 'calc-size' ? 2 : (['media-progress', 'container-progress'].includes(name) ? 3 : 0);
	if (!argumentCount || [...parentFunction.children].some(child => isSubstitutionFunction(child))) {
		return false;
	}

	const arguments_ = getCommaSeparatedGroups(parentFunction);
	// Query descriptors are not calculations. Calc-size's basis and calculation both accept calc-sum.
	return arguments_.length === argumentCount && arguments_.some((argument, index) => (name === 'calc-size' || index > 0) && argument.nodes.includes(node));
}

function getFunctionProblem(node, context, fix) {
	return {
		loc: toLocation(context.sourceCode.getRange(node), context),
		messageId: MESSAGE_ID,
		data: {functionName: normalizeCssIdentifier(node.name)},
		fix,
	};
}

function getTokenRemovalProblem(node, tokens, context) {
	if (tokens.length === 0) {
		return;
	}

	return getFunctionProblem(node, context, function * (fixer) {
		for (const token of tokens) {
			yield fixer.removeRange(context.sourceCode.getRange(token));
		}
	});
}

function getFunctionReplacementSeparator(node, context) {
	// A closing parenthesis separates tokens even without whitespace. Keep that separation when replacing a function with a literal.
	const nextCharacter = context.sourceCode.text[context.sourceCode.getRange(node)[1]] ?? '';
	return /[\w\(\-.\\]/v.test(nextCharacter) || nextCharacter.codePointAt(0) >= 0x80 ? ' ' : '';
}

function getFunctionReplacementProblem(node, replacement, context) {
	return getFunctionProblem(node, context, (fixer, {abort}) => {
		const range = context.sourceCode.getRange(node);
		if (hasCommentInRange(context, range)) {
			return abort();
		}

		return fixer.replaceText(node, replacement + getFunctionReplacementSeparator(node, context));
	});
}

function getLiteralCalculationProblem(node, declaration, parentFunction, context) {
	const property = normalizeCssIdentifier(declaration.property);
	const container = parentFunction ?? declaration.value;
	const values = [...container.children ?? []];
	if ((!parentFunction && property.startsWith('-')) || !values.includes(node)) {
		return;
	}

	const children = [...node.children];
	const [literal] = children;
	if (children.length !== 1 || !['Number', 'Dimension', 'Percentage'].includes(literal.type) || !Number.isFinite(Number(literal.value)) || literal.value.startsWith('-')
		|| (literal.type === 'Number' && Number(literal.value) === 0)
	) {
		return;
	}

	// Validate the containing grammar to preserve integer rounding and shorthand arguments. Negative values and unitless zeros stay wrapped to preserve clamping and numeric types.
	const value = literal.type === 'Dimension' ? {...literal, unit: normalizeCssIdentifier(literal.unit)} : literal;
	const replacementValue = {...container, children: values.map(child => child === node ? value : child)};
	if (parentFunction) {
		replacementValue.name = normalizeCssIdentifier(parentFunction.name);
		// The minimum step count depends on the strategy, which the grammar cannot validate. Keep counts below the strictest minimum wrapped.
		if (replacementValue.name.startsWith('-') || (replacementValue.name === 'steps' && Number(literal.value) < 2)) {
			return;
		}
	}

	const matchesGrammar = parentFunction
		? [
			'filter-function',
			'transform-function',
			'color',
			'basic-shape',
			'gradient',
			'track-list',
			'auto-track-list',
			'name-repeat',
			'easing-function',
			'image-set()',
			'palette-mix()',
			'dynamic-range-limit-mix()',
			'ray()',
			'view()',
			'anchor()',
			'anchor-size()',
		].some(type => context.sourceCode.lexer.matchType(type, replacementValue).matched)
		: context.sourceCode.lexer.matchProperty(property, replacementValue).matched;
	if (!matchesGrammar) {
		return;
	}

	const [start, end] = context.sourceCode.getRange(node);
	return getFunctionProblem(node, context, function * (fixer) {
		yield fixer.removeRange([start, start + node.name.length + 1]);
		yield fixer.replaceTextRange([end - 1, end], getFunctionReplacementSeparator(node, context));
	});
}

function getDominatingComparisonProblem(node, name, arguments_, context) {
	if (!['min', 'max', 'clamp'].includes(name) || arguments_.length < 2 || (name === 'clamp' && arguments_.length !== 3)
		|| arguments_.some(argument => argument.nodes.length !== 1 || !isNumberCalculationLiteral(argument.nodes[0]))) {
		return;
	}

	// Literal NaN wins over every comparison, including a dominant infinity. Restrict inputs to numbers to preserve types and exclude deferred browser evaluation.
	let retainedIndex = arguments_.findIndex(argument => isIdentifierArgument(argument, 'nan'));
	if (retainedIndex === -1) {
		if (name === 'clamp') {
			if (!isIdentifierArgument(arguments_[0], 'infinity') && !isIdentifierArgument(arguments_[2], '-infinity')) {
				return;
			}

			retainedIndex = 0;
		} else {
			retainedIndex = arguments_.findIndex(argument => isIdentifierArgument(argument, name === 'min' ? '-infinity' : 'infinity'));
		}
	}

	if (retainedIndex === -1) {
		return;
	}

	const [start] = context.sourceCode.getRange(node);
	return getFunctionProblem(node, context, function * (fixer) {
		yield fixer.replaceTextRange([start, start + node.name.length], 'calc');
		for (const [index, argument] of arguments_.entries()) {
			if (index !== retainedIndex) {
				yield fixer.removeRange(context.sourceCode.getRange(argument.nodes[0]));
				yield fixer.removeRange(context.sourceCode.getRange(index < retainedIndex ? argument.nextComma : argument.previousComma));
			}
		}
	});
}

function getRedundantComparisonArgumentsProblem(node, name, context) {
	const arguments_ = getCommaSeparatedGroups(node);
	const neutralValue = name === 'min' ? 'infinity' : '-infinity';
	// Restrict neutral bounds to literals: deferred browser comparisons can mask NaN from functions.
	const firstRetainedIndex = arguments_.every(argument => argument.nodes.length === 1 && isNumberCalculationLiteral(argument.nodes[0]))
		? arguments_.findIndex(argument => !isIdentifierArgument(argument, neutralValue))
		: -1;
	const seen = new Set();
	const tokens = [];
	for (const [index, argument] of arguments_.entries()) {
		const [child] = argument.nodes;
		if (firstRetainedIndex >= 0 && isIdentifierArgument(argument, neutralValue)) {
			tokens.push(child, index < firstRetainedIndex ? argument.nextComma : argument.previousComma);
			continue;
		}

		if (argument.nodes.length !== 1 || (!['Number', 'Dimension', 'Percentage'].includes(child.type) && !isNumberCalculationLiteral(child))) {
			continue;
		}

		const text = getNumericLiteralKey(child);
		if (seen.has(text)) {
			tokens.push(argument.previousComma, child);
		} else {
			seen.add(text);
		}
	}

	return getTokenRemovalProblem(node, tokens, context);
}

function getWrapperProblem(node, parentFunction, siblings, context) {
	const children = [...node.children];
	const [start, end] = context.sourceCode.getRange(node);
	// Calc-mix returns a calculation, but its weight arguments require percentages rather than bare calculations.
	const wrapsMathFunction = children.length === 1 && (isMathFunction(children[0]) || isTreeCountingFunction(children[0])
		|| (children[0].type === 'Function' && normalizeCssIdentifier(children[0].name) === 'calc-mix'));
	if (!wrapsMathFunction && !isCalculationArgument(node, parentFunction)) {
		if (normalizeCssIdentifier(node.name) === 'calc') {
			return;
		}

		return getFunctionProblem(node, context, fixer => fixer.replaceTextRange([start, start + node.name.length], 'calc'));
	}

	// Keep parentheses around substitutions so they cannot introduce extra arguments or change precedence. Also keep calculation-only keywords from becoming ordinary keywords, like clamp()'s `none`.
	const unwrap = wrapsMathFunction || (
		children.every(child => !(isSubstitutionFunction(child) || child.type === 'Identifier'))
		&& getCommaSeparatedGroups({children: siblings}).some(group => group.nodes.length === 1 && group.nodes[0] === node)
	);
	return getFunctionProblem(node, context, function * (fixer) {
		yield fixer.removeRange([start, start + node.name.length + (unwrap ? 1 : 0)]);
		if (unwrap) {
			yield fixer.removeRange([end - 1, end]);
		}
	});
}

const isIdentifierArgument = (argument, name) => argument.nodes.length === 1
	&& argument.nodes[0].type === 'Identifier'
	&& normalizeCssIdentifier(argument.nodes[0].name) === name;
const isNumberArgument = (argument, value) => argument.nodes.length === 1
	&& argument.nodes[0].type === 'Number'
	&& Number(argument.nodes[0].value) === value;

function getComparisonProblem(node, parentFunction, siblings, context) {
	const name = normalizeCssIdentifier(node.name);
	const children = [...node.children];
	if (name === 'min' || name === 'max') {
		const argumentProblem = getRedundantComparisonArgumentsProblem(node, name, context);
		if (argumentProblem) {
			return argumentProblem;
		}
	}

	if (
		children.some(child => child.type === 'Operator' && child.value === ',')
		|| (name !== 'calc' && children.some(child => isSubstitutionFunction(child)))
	) {
		return;
	}

	return getWrapperProblem(node, parentFunction, siblings, context);
}

function isPositiveZero(node, type, context) {
	if (!node || !positiveZeroPattern.test(node.value ?? '')) {
		return false;
	}

	if (node.type === 'Number' || (type === 'length-percentage' && node.type === 'Percentage')) {
		return true;
	}

	return node.type === 'Dimension' && Boolean(context.sourceCode.lexer.matchType(type, {...node, unit: normalizeCssIdentifier(node.unit)}).matched);
}

function getDropShadowProblem(node, children, context) {
	const lengths = children.filter(child => child.type === 'Number' || child.type === 'Dimension' || isMathFunction(child));
	const tokens = children.filter(child => child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'currentcolor');
	if (lengths.length === 3 && isPositiveZero(lengths[2], 'length', context)) {
		tokens.push(lengths[2]);
	}

	return getTokenRemovalProblem(node, tokens, context);
}

function getDefaultFunctionProblem(node, context) {
	const name = normalizeCssIdentifier(node.name);
	const children = [...node.children];
	if (children.some(child => isSubstitutionFunction(child))) {
		return;
	}

	if (name === 'drop-shadow') {
		return getDropShadowProblem(node, children, context);
	}

	if (['translate', 'skew', 'scale'].includes(name)) {
		const arguments_ = getCommaSeparatedGroups(node);
		if (arguments_.length !== 2 || arguments_.some(argument => argument.nodes.length !== 1)) {
			return;
		}

		const [first, second] = arguments_.map(argument => argument.nodes[0]);
		const redundant = name === 'scale'
			? areEqualScaleValues(first, second)
			: isPositiveZero(second, name === 'skew' ? 'angle' : 'length-percentage', context);
		return redundant ? getTokenRemovalProblem(node, [arguments_[1].previousComma, second], context) : undefined;
	}

	if (children.length !== 1) {
		return;
	}

	const [child] = children;
	const defaultAmount = child.type === 'Percentage' ? 100 : 1;
	const redundant = name === 'blur' || name === 'hue-rotate'
		? isPositiveZero(child, name === 'blur' ? 'length' : 'angle', context)
		: ['Number', 'Percentage'].includes(child.type) && Number(child.value) === defaultAmount;
	return redundant ? getTokenRemovalProblem(node, [child], context) : undefined;
}

function areEqualScaleValues(first, second) {
	if (!['Number', 'Percentage'].includes(first.type) || first.type !== second.type) {
		return false;
	}

	return getNumericLiteralKey(first) === getNumericLiteralKey(second);
}

function getAlphaProblem(node, context) {
	const children = [...node.children];
	const [first] = children;
	const isRelative = first?.type === 'Identifier' && normalizeCssIdentifier(first.name) === 'from';
	// An origin-color substitution is bounded by the fixed channel arguments. Other substitutions can change the slash alpha's grammar.
	if (children.some((child, index) => isSubstitutionFunction(child) && !(isRelative && index === 1))) {
		return;
	}

	const separator = children.at(-2);
	if (separator?.type !== 'Operator' || separator.value !== '/') {
		return;
	}

	const alpha = children.at(-1);
	// Preserve over-range absolute alpha for diagnostics; relative colors inherit their origin's alpha when omitted.
	const redundant = isRelative
		? alpha.type === 'Identifier' && normalizeCssIdentifier(alpha.name) === 'alpha'
		: (alpha.type === 'Number' && Number(alpha.value) === 1) || (alpha.type === 'Percentage' && Number(alpha.value) === 100);
	if (redundant) {
		return getTokenRemovalProblem(node, [separator, alpha], context);
	}
}

function getLightDarkProblem(node, context, parentFunction) {
	const arguments_ = getCommaSeparatedGroups(node);
	if (arguments_.length !== 2 || arguments_.some(argument => argument.nodes.length !== 1)) {
		return;
	}

	const [first, second] = arguments_.map(argument => argument.nodes[0]);
	// Both calls use the same element's color scheme. Require literal inner colors so removing the unused branch cannot change validity or random indexing.
	if (parentFunction && normalizeCssIdentifier(parentFunction.name) === 'light-dark' && [first, second].every(color => isLiteralColor(color, context))) {
		const parentArguments = getCommaSeparatedGroups(parentFunction);
		const index = parentArguments.findIndex(argument => argument.nodes.length === 1 && argument.nodes[0] === node);
		if (parentArguments.length === 2 && parentArguments.every(argument => argument.nodes.length === 1) && index !== -1) {
			return getFunctionReplacementProblem(node, context.sourceCode.getText(arguments_[index].nodes[0]), context);
		}
	}

	// Dynamic colors and images have their own resolution and inheritance behavior. Only collapse equivalent literal colors in the same color space.
	if (!areEqualLiteralColors(first, second)) {
		return;
	}

	if (isLiteralColor(first, context)) {
		return getFunctionReplacementProblem(node, context.sourceCode.getText(first), context);
	}
}

function getSuperellipseProblem(node, context) {
	const children = [...node.children];
	if (children.length !== 1) {
		return;
	}

	const [child] = children;
	const value = child.type === 'Number' ? Number(child.value) : (child.type === 'Identifier' ? normalizeCssIdentifier(child.name) : undefined);
	if (value === 0 && !positiveZeroPattern.test(child.value)) {
		return;
	}

	const replacement = superellipseKeywords.get(value);
	if (replacement) {
		return getFunctionReplacementProblem(node, replacement, context);
	}
}

function getDynamicRangeLimitProblem(node, context) {
	const arguments_ = getCommaSeparatedGroups(node);
	// Earlier implementations require multiple inputs and reject all-zero mixes. Only collapse a mix with a positive contributor.
	if (arguments_.length < 2) {
		return;
	}

	let contributingValue;
	for (const {nodes} of arguments_) {
		const value = nodes.find(child => child.type === 'Identifier');
		const percentage = nodes.find(child => child.type === 'Percentage');
		if (nodes.length !== 2 || !value || !percentage || !['standard', 'constrained', 'no-limit'].includes(normalizeCssIdentifier(value.name))
			|| percentage.value.startsWith('-') || !isSafeIntegerSpelling(percentage.value) || Number(percentage.value) > 100
		) {
			return;
		}

		if (Number(percentage.value) === 0) {
			continue;
		}

		if (contributingValue && !areEqualValues(contributingValue, value)) {
			return;
		}

		contributingValue ??= value;
	}

	if (contributingValue) {
		return getFunctionReplacementProblem(node, context.sourceCode.getText(contributingValue), context);
	}
}

function getContentProblem(node, context) {
	const name = normalizeCssIdentifier(node.name);
	const children = [...node.children];
	if (children.some(child => isSubstitutionFunction(child))) {
		return;
	}

	if (name === 'symbols') {
		if (children.length > 1 && children[0].type === 'Identifier' && normalizeCssIdentifier(children[0].name) === 'symbolic') {
			return getTokenRemovalProblem(node, [children[0]], context);
		}

		return;
	}

	const arguments_ = getCommaSeparatedGroups(node);
	const [argumentCount, defaultKeyword] = contentFunctionDefaults.get(name);
	if (arguments_.length !== argumentCount || !isIdentifierArgument(arguments_.at(-1), defaultKeyword)) {
		return;
	}

	// Running elements and named strings take names, unlike the image form element(#id).
	if ((name === 'element' || name === 'string') && (arguments_[0].nodes.length !== 1 || arguments_[0].nodes[0].type !== 'Identifier')) {
		return;
	}

	const argument = arguments_.at(-1);
	return getTokenRemovalProblem(node, [argument.nodes[0], ...(argument.previousComma ? [argument.previousComma] : [])], context);
}

function getAnchorSizeProblem(node, declaration, context) {
	const axis = anchorSizeAxes.get(normalizeCssIdentifier(declaration.property));
	if (!axis || [...node.children].some(child => isSubstitutionFunction(child))) {
		return;
	}

	const arguments_ = getCommaSeparatedGroups(node);
	const [argument] = arguments_;
	if (arguments_.length > 2 || argument.nodes.length > 2 || argument.nodes.some(child => child.type !== 'Identifier')) {
		return;
	}

	const axisNode = argument.nodes.find(child => normalizeCssIdentifier(child.name) === axis);
	if (!axisNode || argument.nodes.some(child => child !== axisNode && !normalizeCssIdentifier(child.name).startsWith('--'))) {
		return;
	}

	// With no anchor name left, the fallback becomes the sole argument and no longer needs its comma.
	const tokens = [axisNode];
	if (argument.nodes.length === 1 && argument.nextComma) {
		tokens.push(argument.nextComma);
	}

	return getTokenRemovalProblem(node, tokens, context);
}

function getCalcSizeProblem(node, context) {
	const arguments_ = getCommaSeparatedGroups(node);
	const basis = arguments_[0].nodes[0];
	if (arguments_.length !== 2 || arguments_[0].nodes.length !== 1 || basis.type !== 'Function'
		|| normalizeCssIdentifier(basis.name) !== 'calc-size' || !isIdentifierArgument(arguments_[1], 'size')
	) {
		return;
	}

	const [start, end] = context.sourceCode.getRange(node);
	// Retain the inner calc-size, including its sizing basis and interpolation behavior.
	return getFunctionProblem(node, context, function * (fixer) {
		yield fixer.removeRange([start, start + node.name.length + 1]);
		yield fixer.removeRange([end - 1, end]);
		yield fixer.removeRange(context.sourceCode.getRange(arguments_[1].previousComma));
		yield fixer.removeRange(context.sourceCode.getRange(arguments_[1].nodes[0]));
	});
}

function getStripesProblem(node, context) {
	if ([...node.children].some(child => isSubstitutionFunction(child))) {
		return;
	}

	const tokens = [];
	for (const {nodes} of getCommaSeparatedGroups(node)) {
		if (nodes.length !== 2) {
			continue;
		}

		const thickness = nodes.find(child => child.type === 'Dimension' && normalizeCssIdentifier(child.unit) === 'fr' && Number(child.value) === 1);
		if (thickness && matchesType(nodes.find(child => child !== thickness), 'color', context)) {
			tokens.push(thickness);
		}
	}

	return getTokenRemovalProblem(node, tokens, context);
}

function getImageSetProblem(node, context) {
	if ([...node.children].some(child => isSubstitutionFunction(child))) {
		return;
	}

	const tokens = [];
	for (const {nodes} of getCommaSeparatedGroups(node)) {
		const [image, ...descriptors] = nodes;
		if (nodes.length < 2 || nodes.length > 3 || image.type !== 'Function' || !gradientFunctions.has(normalizeCssIdentifier(image.name))) {
			continue;
		}

		const resolution = descriptors.find(child => child.type === 'Dimension');
		// Gradients have no embedded density. Explicit resolutions on external images can override their metadata.
		if (resolution && Number(resolution.value) === {x: 1, dppx: 1, dpi: 96}[normalizeCssIdentifier(resolution.unit)]
			&& descriptors.every(child => child === resolution || (child.type === 'Function' && normalizeCssIdentifier(child.name) === 'type'))
		) {
			tokens.push(resolution);
		}
	}

	return getTokenRemovalProblem(node, tokens, context);
}

function getAttributeProblem(node, context) {
	const arguments_ = getCommaSeparatedGroups(node);
	if (arguments_.length !== 2) {
		return;
	}

	const [attribute, fallback] = arguments_;
	const [name, type] = attribute.nodes;
	if (name?.type !== 'Identifier' || attribute.nodes.length > 2 || (type && (type.type !== 'Identifier' || normalizeCssIdentifier(type.name) !== 'raw-string'))
		|| fallback.nodes.length !== 1 || fallback.nodes[0].type !== 'String'
	) {
		return;
	}

	const tokens = type ? [type] : [];
	// Without an explicit fallback, raw-string uses the guaranteed-invalid value while an omitted type uses an empty string.
	if (fallback.nodes[0].value === '') {
		tokens.push(fallback.previousComma, fallback.nodes[0]);
	}

	return getTokenRemovalProblem(node, tokens, context);
}

const isCenterPosition = nodes => (nodes.length === 2 || nodes.length === 3)
	&& nodes[0].type === 'Identifier' && normalizeCssIdentifier(nodes[0].name) === 'at'
	&& nodes.slice(1).every(node => (node.type === 'Identifier' && normalizeCssIdentifier(node.name) === 'center') || (node.type === 'Percentage' && Number(node.value) === 50));

function getRepeatedLengthTokens(values, context) {
	return values.length >= 2 && values.length <= 4
		&& values.every(child => ['Dimension', 'Percentage'].includes(child.type) || isPositiveZero(child, 'length-percentage', context))
		? values.slice(getCondensedValueCount(values, false, (first, second) => getNumericLiteralKey(first) === getNumericLiteralKey(second)))
		: [];
}

function getRectangleProblem(node, children, context) {
	const roundIndex = children.findIndex(child => child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'round');
	const offsets = roundIndex === -1 ? children : children.slice(0, roundIndex);
	const tokens = [];
	if (normalizeCssIdentifier(node.name) === 'inset') {
		tokens.push(...getRepeatedLengthTokens(offsets, context));
	}

	if (roundIndex !== -1) {
		const radii = children.slice(roundIndex + 1);
		if (radii.length > 0 && radii.every(child => isPositiveZero(child, 'length-percentage', context) || (child.type === 'Operator' && child.value === '/'))) {
			tokens.push(...children.slice(roundIndex));
		} else {
			const slashIndex = radii.findIndex(child => child.type === 'Operator' && child.value === '/');
			const axes = slashIndex === -1 ? [radii] : [radii.slice(0, slashIndex), radii.slice(slashIndex + 1)];
			const [horizontal, vertical] = axes;
			if (vertical && horizontal.length > 0 && horizontal.length <= 4 && horizontal.length === vertical.length
				&& horizontal.every((value, index) => (['Dimension', 'Percentage'].includes(value.type) || isPositiveZero(value, 'length-percentage', context)) && getNumericLiteralKey(value) === getNumericLiteralKey(vertical[index]))) {
				tokens.push(...radii.slice(slashIndex));
				axes.pop();
			}

			for (const axis of axes) {
				tokens.push(...getRepeatedLengthTokens(axis, context));
			}
		}
	}

	return getTokenRemovalProblem(node, tokens, context);
}

function getShapeCommandTokens(node, context) {
	const tokens = [];
	for (const {nodes} of getCommaSeparatedGroups(node).slice(1)) {
		const [command, mode] = nodes;
		if (command?.type !== 'Identifier') {
			continue;
		}

		const name = normalizeCssIdentifier(command.name);
		if (name === 'arc') {
			tokens.push(...nodes.filter(child => child.type === 'Identifier' && ['small', 'ccw'].includes(normalizeCssIdentifier(child.name))));
			const radiusIndex = nodes.findIndex(child => child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'of');
			if (radiusIndex !== -1) {
				const radii = nodes.slice(radiusIndex + 1, radiusIndex + 3);
				// A single percentage radius uses the direction-agnostic size instead of the separate width and height.
				if (radii.every(child => child.type !== 'Percentage')) {
					tokens.push(...getRepeatedLengthTokens(radii, context));
				}
			}

			const rotationIndex = nodes.findIndex(child => child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'rotate');
			if (rotationIndex !== -1 && isPositiveZero(nodes[rotationIndex + 1], 'angle', context)) {
				tokens.push(...nodes.slice(rotationIndex, rotationIndex + 2));
			}
		} else if (['curve', 'smooth'].includes(name) && mode?.type === 'Identifier') {
			// Absolute commands default to the reference-box origin; relative commands default to their starting point.
			const defaultOrigin = {to: 'origin', by: 'start'}[normalizeCssIdentifier(mode.name)];
			for (const [index, child] of nodes.entries()) {
				if (child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'from'
					&& nodes[index + 1]?.type === 'Identifier' && normalizeCssIdentifier(nodes[index + 1].name) === defaultOrigin
				) {
					tokens.push(child, nodes[index + 1]);
				}
			}
		}
	}

	return tokens;
}

function getDefaultFillRuleTokens(node, property) {
	const arguments_ = getCommaSeparatedGroups(node);
	const fillRule = arguments_[0]?.nodes[0];
	// SVG geometry and custom properties can inherit their fill rule instead of defaulting to nonzero.
	if (!defaultFillRuleProperties.has(property) || fillRule?.type !== 'Identifier' || normalizeCssIdentifier(fillRule.name) !== 'nonzero') {
		return [];
	}

	if (normalizeCssIdentifier(node.name) === 'path') {
		return arguments_.length === 2 && arguments_[0].nodes.length === 1 && arguments_[1].nodes.length === 1 && arguments_[1].nodes[0].type === 'String'
			? [fillRule, arguments_[0].nextComma]
			: [];
	}

	return [fillRule];
}

function getShapeProblem(node, declaration, context) {
	const name = normalizeCssIdentifier(node.name);
	const children = [...node.children];
	if (children.some(child => isSubstitutionFunction(child))) {
		return;
	}

	const property = keyword(normalizeCssIdentifier(declaration.property)).basename;
	if (['shape', 'path'].includes(name)) {
		const tokens = getDefaultFillRuleTokens(node, property);
		if (name === 'shape') {
			tokens.push(...getShapeCommandTokens(node, context));
		}

		return getTokenRemovalProblem(node, tokens, context);
	}

	if (['inset', 'rect', 'xywh'].includes(name)) {
		return getRectangleProblem(node, children, context);
	}

	if (name === 'ray') {
		// The origin still depends on offset-position, so only the default size is removed.
		return getTokenRemovalProblem(node, children.filter(child => child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'closest-side'), context);
	}

	if (name === 'polygon') {
		const [argument] = getCommaSeparatedGroups(node);
		const tokens = argument.nodes.filter(child => child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'nonzero');
		const roundIndex = argument.nodes.findIndex(child => child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'round');
		if (roundIndex !== -1 && argument.nodes.length === roundIndex + 2 && isPositiveZero(argument.nodes[roundIndex + 1], 'length', context)) {
			tokens.push(...argument.nodes.slice(roundIndex));
		}

		if (tokens.length === argument.nodes.length && argument.nextComma) {
			tokens.push(argument.nextComma);
		}

		return getTokenRemovalProblem(node, tokens, context);
	}

	const positionIndex = children.findIndex(child => child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'at');
	const radii = positionIndex === -1 ? children : children.slice(0, positionIndex);
	const tokens = [];
	if (radii.length === (name === 'circle' ? 1 : 2) && radii.every(child => child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'closest-side')) {
		tokens.push(...radii);
	}

	// Motion paths can use offset-position when `at` is omitted. Custom properties can later be used in that context too.
	if (['clip-path', 'shape-outside'].includes(property) && positionIndex !== -1 && isCenterPosition(children.slice(positionIndex))) {
		tokens.push(...children.slice(positionIndex));
	}

	return getTokenRemovalProblem(node, tokens, context);
}

function getTimelineProblem(node, context) {
	const name = normalizeCssIdentifier(node.name);
	const children = [...node.children];
	if (children.some(child => isSubstitutionFunction(child))) {
		return;
	}

	const tokens = children.filter(child => child.type === 'Identifier' && (normalizeCssIdentifier(child.name) === 'block'
		|| (name === 'scroll' && normalizeCssIdentifier(child.name) === 'nearest')));
	if (name === 'view') {
		const insets = children.filter(child => !(child.type === 'Identifier' && timelineAxes.has(normalizeCssIdentifier(child.name))));
		if (insets.length > 0 && insets.length <= 2 && insets.every(child => child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'auto')) {
			tokens.push(...insets);
		} else if (insets.length === 2) {
			tokens.push(...getRepeatedLengthTokens(insets, context));
		}
	}

	return getTokenRemovalProblem(node, tokens, context);
}

function getDefaultLinearDirectionTokens(nodes) {
	const [direction] = nodes;
	if (direction?.type === 'Dimension' && Number(direction.value) === {deg: 180, grad: 200, turn: 0.5}[normalizeCssIdentifier(direction.unit)]) {
		return [direction];
	}

	return nodes.length >= 2 && nodes.slice(0, 2).every((node, index) => node.type === 'Identifier' && normalizeCssIdentifier(node.name) === ['to', 'bottom'][index])
		&& (nodes.length === 2 || (nodes[2].type === 'Identifier' && normalizeCssIdentifier(nodes[2].name) === 'in'))
		? nodes.slice(0, 2)
		: [];
}

function getDefaultGradientTokens(name, nodes, context) {
	if (name.endsWith('linear-gradient')) {
		return getDefaultLinearDirectionTokens(nodes);
	}

	const tokens = [];
	const positionIndex = nodes.findIndex(node => node.type === 'Identifier' && normalizeCssIdentifier(node.name) === 'at');
	if (positionIndex !== -1 && isCenterPosition(nodes.slice(positionIndex))) {
		tokens.push(...nodes.slice(positionIndex));
	}

	if (name.endsWith('conic-gradient')) {
		if (nodes[0]?.type === 'Identifier' && normalizeCssIdentifier(nodes[0].name) === 'from' && isPositiveZero(nodes[1], 'angle', context)) {
			tokens.push(...nodes.slice(0, 2));
		}

		return tokens;
	}

	const endIndex = nodes.findIndex(node => node.type === 'Identifier' && ['at', 'in'].includes(normalizeCssIdentifier(node.name)));
	const prefix = endIndex === -1 ? nodes : nodes.slice(0, endIndex);
	const shape = prefix.find(node => node.type === 'Identifier' && ['circle', 'ellipse'].includes(normalizeCssIdentifier(node.name)));
	const sizes = prefix.filter(node => node !== shape);
	if (sizes.length === 1 && sizes[0].type === 'Identifier' && normalizeCssIdentifier(sizes[0].name) === 'farthest-corner') {
		tokens.push(sizes[0]);
	}

	if (shape && isImpliedRadialShape(shape, sizes, context)) {
		tokens.push(shape);
	}

	return tokens;
}

function isImpliedRadialShape(shape, sizes, context) {
	if (normalizeCssIdentifier(shape.name) === 'circle') {
		return sizes.length === 1 && (isPositiveZero(sizes[0], 'length', context)
			|| (sizes[0].type === 'Dimension' && matchesType({...sizes[0], unit: normalizeCssIdentifier(sizes[0].unit)}, 'length', context)));
	}

	return sizes.length === 0
		|| (sizes.length === 1 && sizes[0].type === 'Identifier' && ['closest-side', 'closest-corner', 'farthest-side', 'farthest-corner'].includes(normalizeCssIdentifier(sizes[0].name)))
		|| (sizes.length === 2 && sizes.every(node => ['Dimension', 'Percentage'].includes(node.type) || isPositiveZero(node, 'length-percentage', context)));
}

function matchesType(node, type, context) {
	if (node.type === 'Identifier' || node.type === 'Function') {
		node = {...node, name: normalizeCssIdentifier(node.name)};
	}

	return Boolean(context.sourceCode.lexer.matchType(type, node).matched);
}

function getDefaultHueTokens(nodes) {
	const names = nodes.map(node => node.type === 'Identifier' ? normalizeCssIdentifier(node.name) : undefined);
	const index = names.indexOf('in');
	return index !== -1 && ['hsl', 'hwb', 'lch', 'oklch'].includes(names[index + 1]) && names[index + 2] === 'shorter' && names[index + 3] === 'hue'
		? nodes.slice(index + 2, index + 4)
		: [];
}

function getMixProblem(node, context) {
	const arguments_ = getCommaSeparatedGroups(node);
	const name = normalizeCssIdentifier(node.name);
	const [prelude] = arguments_;
	const hasPrelude = ['color-mix', 'palette-mix'].includes(name) && prelude.nodes[0]?.type === 'Identifier' && normalizeCssIdentifier(prelude.nodes[0].name) === 'in';
	const inputs = arguments_.slice(hasPrelude ? 1 : 0);
	if (inputs.length === 0 || inputs.some(argument => argument.nodes.length === 0) || [...node.children].some(child => isSubstitutionFunction(child))) {
		return;
	}

	const tokens = hasPrelude ? getDefaultHueTokens(prelude.nodes) : [];
	tokens.push(...getMixWeightTokens(inputs, name, context));
	return getTokenRemovalProblem(node, tokens, context);
}

function getMixPercentage(nodes, name) {
	if (name === 'calc-mix') {
		// Numeric values can themselves be percentages, and arithmetic can consume a trailing percentage. Only check a single-token value followed by a weight.
		return nodes.length === 2 && nodes[1].type === 'Percentage' ? nodes[1] : undefined;
	}

	return nodes.find(child => child.type === 'Percentage');
}

function getMixPercentages(arguments_, name, context) {
	const percentages = [];
	const valueType = name === 'color-mix' ? 'color' : (name === 'calc-mix' ? 'calc-sum' : 'image');
	for (const {nodes} of arguments_) {
		const percentage = getMixPercentage(nodes, name);
		if (nodes.length !== (percentage ? 2 : 1) || (percentage && (percentage.value.startsWith('-') || !isSafeIntegerSpelling(percentage.value) || Number(percentage.value) > 100))) {
			return;
		}

		const value = nodes.find(child => child !== percentage);
		const matchesValue = name === 'palette-mix'
			? Boolean(context.sourceCode.lexer.matchProperty('font-palette', {...value, name: normalizeCssIdentifier(value.name ?? '')}).matched)
			: matchesType(value, valueType, context) || (name === 'cross-fade' && matchesType(value, 'color', context));
		if (!matchesValue) {
			return;
		}

		percentages.push(percentage);
	}

	return percentages;
}

function getMixWeightTokens(arguments_, name, context) {
	const percentages = getMixPercentages(arguments_, name, context);
	if (!percentages) {
		return [];
	}

	// Omitted weights can match every explicit weight only when each equals 100% divided by the input count.
	const values = percentages.map(percentage => percentage ? Number(percentage.value) : 100 / percentages.length);
	let total = 0;
	for (const value of values) {
		total += value;
	}

	// Cross-fade normalizes totals above 100% only when sizing/painting, so retain those computed weights.
	// Palette-mix also retains those weights in its computed value.
	if (values.every(value => value === values[0]) && (['cross-fade', 'palette-mix'].includes(name) ? total === 100 : total >= 100)) {
		return percentages.filter(Boolean);
	}

	// With every weight specified and a total of 100%, the final weight is exactly the unassigned remainder.
	return percentages.every(Boolean) && total === 100 ? [percentages.at(-1)] : [];
}

function getGradientProblem(node, context) {
	if ([...node.children].some(child => isSubstitutionFunction(child))) {
		return;
	}

	const arguments_ = getCommaSeparatedGroups(node);
	if (arguments_.length < 2 || arguments_.some(argument => argument.nodes.length === 0)) {
		return;
	}

	const tokens = getDefaultHueTokens(arguments_[0].nodes);
	const name = normalizeCssIdentifier(node.name);
	tokens.push(...getDefaultGradientTokens(name, arguments_[0].nodes, context));
	if (tokens.length === arguments_[0].nodes.length) {
		tokens.push(arguments_[0].nextComma);
	}

	// Identify the prelude positively: an unrecognized color must never turn the second stop into the first.
	const firstNode = arguments_[0].nodes[0];
	const hasPrelude = ['Number', 'Dimension', 'Percentage'].includes(firstNode.type) || isMathFunction(firstNode)
		|| (firstNode.type === 'Identifier' && gradientPreludeKeywords.has(normalizeCssIdentifier(firstNode.name)));
	const firstColorIndex = hasPrelude ? 1 : 0;
	for (const [argument, position] of [[arguments_[firstColorIndex], 0], [arguments_.at(-1), 100]]) {
		const [color, stop] = argument.nodes;
		if (argument.nodes.length !== 2) {
			continue;
		}

		const isDefaultPercentage = stop.type === 'Percentage' && Number(stop.value) === position && (position !== 0 || positiveZeroPattern.test(stop.value));
		const isDefaultAngle = name.endsWith('conic-gradient') && (position === 0
			? isPositiveZero(stop, 'angle', context)
			: stop.type === 'Dimension' && Number(stop.value) === {deg: 360, grad: 400, turn: 1}[normalizeCssIdentifier(stop.unit)]);
		if ((isDefaultPercentage || isDefaultAngle) && matchesType(color, 'color', context)) {
			tokens.push(stop);
		}
	}

	return getTokenRemovalProblem(node, tokens, context);
}

function isNonnegativeFunction(node) {
	if (isTreeCountingFunction(node)) {
		return true;
	}

	const name = normalizeCssIdentifier(node.name);
	if (!['abs', 'hypot', 'exp', 'acos', 'pow'].includes(name)) {
		return false;
	}

	const arguments_ = getCommaSeparatedGroups(node);
	if (name === 'pow') {
		return hasEvenPowerExponent(arguments_);
	}

	return arguments_.length > 0 && (name === 'hypot' || arguments_.length === 1) && arguments_.every(argument => argument.nodes.length > 0);
}

function isNonnegativeArgument(argument, context) {
	if (argument.nodes.length !== 1) {
		return false;
	}

	const value = argument.nodes[0];
	if (value.type === 'Identifier') {
		return ['e', 'pi', 'infinity', 'nan'].includes(normalizeCssIdentifier(value.name));
	}

	if (value.type === 'Function') {
		// Retain the function itself: its result proves the resolved value nonnegative, including percentages and signed zero.
		return isNonnegativeFunction(value);
	}

	// Percentages can have negative bases. Retain negative-zero spellings too.
	return !value.value?.startsWith('-')
		&& (value.type === 'Number' || (value.type === 'Dimension'
			&& ['length', 'angle', 'time', 'frequency', 'resolution', 'flex'].some(type => matchesType({...value, unit: normalizeCssIdentifier(value.unit)}, type, context))));
}

function isNonnegativeMathFunction(node, context) {
	const name = normalizeCssIdentifier(node.name);
	if (isNonnegativeFunction(node)) {
		return true;
	}

	// Mod/rem can produce an oppositely signed residual through floating-point cancellation in Firefox.
	if (!['pow', 'min', 'max', 'clamp', 'atan2', 'sqrt', 'asin', 'atan', 'sign', 'round', 'random', 'log'].includes(name)) {
		return false;
	}

	const arguments_ = getCommaSeparatedGroups(node);
	if (name === 'log') {
		// Retain log() to preserve precision. Operands at least one give a nonnegative result or NaN; exact-one spellings exclude fractions rounded across the sign boundary.
		return (arguments_.length === 1 || arguments_.length === 2) && arguments_.every(argument => {
			const [value] = argument.nodes;
			return argument.nodes.length === 1 && ((value.type === 'Number' && (Number(value.value) > 1 || (Number(value.value) === 1 && isSafeIntegerSpelling(value.value))))
				|| (value.type === 'Identifier' && isNonnegativeArgument(argument, context)));
		});
	}

	if (name === 'min') {
		// Every input must prove the minimum nonnegative.
		return arguments_.length > 0 && arguments_.every(argument => isNonnegativeArgument(argument, context));
	}

	if (name === 'random') {
		// Random raises its maximum to its minimum. Retain an unkeyed, unstepped call; substitutions can introduce a step.
		return arguments_.length === 2 && [...node.children].every(child => !isSubstitutionFunction(child)) && isNonnegativeArgument(arguments_[0], context);
	}

	if (name === 'round') {
		const step = getRoundStepArgument(arguments_);
		const argument = getUnsteppedRoundValue(arguments_) ?? (step && arguments_.at(-2));
		return argument !== undefined && (Boolean(step) || argument.nodes[0]?.type === 'Function' || isNumberCalculationLiteral(argument.nodes[0])) && isNonnegativeArgument(argument, context);
	}

	if (name === 'max') {
		// Deferred browser comparisons can retain an earlier negative zero when a later bound is positive zero.
		return isNonnegativeArgument(arguments_[0], context);
	}

	if (name === 'clamp') {
		return arguments_.length === 3 && isNonnegativeArgument(arguments_[0], context);
	}

	if (name === 'atan2') {
		return arguments_.length === 2 && isNonnegativeArgument(arguments_[0], context);
	}

	if (['sqrt', 'asin', 'atan', 'sign'].includes(name)) {
		return arguments_.length === 1 && (name === 'sign' || arguments_[0].nodes[0]?.type === 'Function' || isNumberCalculationLiteral(arguments_[0].nodes[0]))
			&& isNonnegativeArgument(arguments_[0], context);
	}

	return arguments_.length === 2 && (arguments_[0].nodes[0]?.type === 'Function' || isNumberCalculationLiteral(arguments_[0].nodes[0])) && isNonnegativeArgument(arguments_[0], context);
}

function hasEvenPowerExponent(arguments_) {
	const exponent = arguments_[1]?.nodes[0];
	if (arguments_.length !== 2 || arguments_[1].nodes.length !== 1 || exponent?.type !== 'Number' || !isIntegerMathInput(exponent)) {
		return false;
	}

	const value = Number(exponent.value);
	return value % 2 === 0;
}

function getSignProblem(node, parentFunction, siblings, context) {
	const name = normalizeCssIdentifier(node.name);
	const children = [...node.children];
	const [start, end] = context.sourceCode.getRange(node);
	const [child] = children;
	if (name === 'abs' && isNonnegativeArgument({nodes: children}, context)) {
		return getWrapperProblem(node, parentFunction, siblings, context);
	}

	if (
		children.length !== 1 || child.type !== 'Function'
		|| !(normalizeCssIdentifier(child.name) === name || (name === 'abs' && isNonnegativeMathFunction(child, context)))
	) {
		return;
	}

	return getFunctionProblem(node, context, function * (fixer) {
		yield fixer.removeRange([start, start + node.name.length + 1]);
		yield fixer.removeRange([end - 1, end]);
	});
}

function getRedundantRoundArguments(arguments_) {
	const strategy = ['nearest', 'up', 'down', 'to-zero', 'line-width'].find(name => isIdentifierArgument(arguments_[0], name));
	const removedArguments = [];
	if (strategy === 'nearest' && (arguments_.length === 2 || arguments_.length === 3)) {
		removedArguments.push(arguments_[0]);
	}

	const step = getRoundStepArgument(arguments_);
	if (step && (isNumberArgument(step, 1) || (step.nodes.length === 1 && step.nodes[0].type === 'Number' && /^-0*1(?:\.0+)?(?:e[+\-]?0+)?$/iv.test(step.nodes[0].value)))) {
		removedArguments.push(step);
	}

	return removedArguments;
}

function getRoundStepArgument(arguments_) {
	const strategy = ['nearest', 'up', 'down', 'to-zero', 'line-width'].find(name => isIdentifierArgument(arguments_[0], name));
	const stepIndex = strategy ? 2 : 1;
	if (strategy !== 'line-width' && arguments_.length === stepIndex + 1) {
		return arguments_[stepIndex];
	}
}

function getUnsteppedRoundValue(arguments_) {
	if (arguments_.length === 1 || (arguments_.length === 2 && ['nearest', 'up', 'down', 'to-zero'].some(strategy => isIdentifierArgument(arguments_[0], strategy)))) {
		return arguments_.at(-1);
	}
}

function isIntegerMathInput(node) {
	if (node?.type === 'Number') {
		return isSafeIntegerSpelling(node.value);
	}

	if (node?.type !== 'Function') {
		return false;
	}

	if (isTreeCountingFunction(node)) {
		return true;
	}

	const name = normalizeCssIdentifier(node.name);
	const arguments_ = getCommaSeparatedGroups(node);
	return (name === 'sign' && arguments_.length === 1 && arguments_[0].nodes.length > 0)
		|| (name === 'round' && [...node.children].every(child => !isSubstitutionFunction(child)) && Boolean(getUnsteppedRoundValue(arguments_)?.nodes.length));
}

function isIntegerMathValue(node) {
	if (isIntegerMathInput(node)) {
		return true;
	}

	if (node?.type !== 'Function') {
		return false;
	}

	const name = normalizeCssIdentifier(node.name);
	const arguments_ = getCommaSeparatedGroups(node);
	// These functions retain an integer input or its magnitude. Keep the proof to whole arguments without recursively inferring arithmetic.
	return ((name === 'abs' && arguments_.length === 1)
		|| (['min', 'max'].includes(name) && arguments_.length > 0)
		|| (name === 'clamp' && arguments_.length === 3))
	&& arguments_.every(argument => argument.nodes.length === 1 && isIntegerMathInput(argument.nodes[0]));
}

function isRedundantIntegerRoundStep(value, step) {
	if (value.nodes.length !== 1 || step.nodes.length !== 1
		|| value.nodes[0].type !== step.nodes[0].type
		|| (value.nodes[0].type === 'Dimension' && normalizeCssIdentifier(value.nodes[0].unit) !== normalizeCssIdentifier(step.nodes[0].unit))
		|| [value.nodes[0], step.nodes[0]].some(node => !((node.type === 'Number' || (node.type === 'Dimension' && ['px', 'deg', 's', 'dppx', 'x'].includes(normalizeCssIdentifier(node.unit))))
			&& isSafeIntegerSpelling(node.value)))) {
		return false;
	}

	// Zero and equal magnitudes are already step multiples. Canonical units avoid conversion rounding; relative units/percentages can have zero steps. Pixels fold before zoom.
	const numericValue = Number(value.nodes[0].value);
	const numericStep = Number(step.nodes[0].value);
	// For nonzero multiples within 2^24, both operands and the integer quotient are exact in float32.
	return numericStep !== 0 && (numericValue === 0 || Math.abs(numericValue) === Math.abs(numericStep)
		|| (Math.abs(numericValue) <= 2 ** 24 && numericValue % numericStep === 0));
}

function getRoundWrapperProblem(node, arguments_, context) {
	const step = getRoundStepArgument(arguments_);
	const value = getUnsteppedRoundValue(arguments_) ?? (step && arguments_.at(-2));
	const child = value?.nodes[0];
	if (step && !isRedundantIntegerRoundStep(value, step)) {
		return;
	}

	if (value?.nodes.length === 1 && ((child.type === 'Number' && isIntegerMathValue(child)) || (step && child.type === 'Dimension'))) {
		const [start] = context.sourceCode.getRange(node);
		// The literal is already a step multiple. Keep the calculation boundary, including signed zero.
		return getFunctionProblem(node, context, function * (fixer) {
			yield fixer.replaceTextRange([start, start + node.name.length], 'calc');
			for (const argument of arguments_) {
				if (argument !== value) {
					yield fixer.removeRange(context.sourceCode.getRange(argument.nodes[0]));
					yield fixer.removeRange(context.sourceCode.getRange(argument.previousComma ?? argument.nextComma));
				}
			}
		});
	}

	if (value?.nodes.length !== 1 || child?.type !== 'Function') {
		return;
	}

	if (!isIntegerMathValue(child)) {
		return;
	}

	const [start, end] = context.sourceCode.getRange(node);
	// An omitted step requires a number and rounds to an integer. Unit-step rounding preserves integer-valued functions, including signed zero.
	return getFunctionProblem(node, context, function * (fixer) {
		yield fixer.removeRange([start, start + node.name.length + 1]);
		yield fixer.removeRange([end - 1, end]);
		if (arguments_.length === 2) {
			yield fixer.removeRange(context.sourceCode.getRange(arguments_[0].nodes[0]));
			yield fixer.removeRange(context.sourceCode.getRange(arguments_[0].nextComma));
		}
	});
}

function getRedundantRandomArguments(arguments_) {
	if (arguments_.length !== 3 && arguments_.length !== 4) {
		return [];
	}

	const removedArguments = isIdentifierArgument(arguments_[0], 'auto') ? [arguments_[0]] : [];
	const values = arguments_.slice(-3).map(argument => argument.nodes.length === 1 ? argument.nodes[0] : undefined);
	const [minimum, , step] = values;
	// Removing a step must retain the calculation's type. Restrict this to matching literal types and units.
	// Percentage bases can be negative, so a negative percentage is not necessarily a nonpositive step.
	if (minimum && ['Number', 'Dimension', 'Percentage'].includes(minimum.type)
		&& values.every(value => value?.type === minimum.type && (minimum.type !== 'Dimension' || normalizeCssIdentifier(value.unit) === normalizeCssIdentifier(minimum.unit)))
		&& (positiveZeroPattern.test(step.value) || (step.type !== 'Percentage' && step.value.startsWith('-')))
	) {
		removedArguments.push(arguments_.at(-1));
	}

	return removedArguments;
}

function getClampWrapperProblem(node, arguments_, context) {
	const child = arguments_[1]?.nodes[0];
	if (arguments_.length !== 3 || arguments_[1].nodes.length !== 1 || child.type !== 'Function' || normalizeCssIdentifier(child.name) !== 'clamp') {
		return;
	}

	const innerArguments = getCommaSeparatedGroups(child);
	if (innerArguments.length !== 3 || [0, 2].some(index => arguments_[index].nodes.length !== 1 || innerArguments[index].nodes.length !== 1)) {
		return;
	}

	const outerBounds = [0, 2].map(index => arguments_[index].nodes[0]);
	const innerBounds = [0, 2].map(index => innerArguments[index].nodes[0]);
	const hasEqualBounds = outerBounds.every((bound, index) => (['Number', 'Dimension', 'Percentage'].includes(bound.type) || isNumberCalculationLiteral(bound))
		&& getNumericLiteralKey(bound) === getNumericLiteralKey(innerBounds[index]));
	// Integers cannot underflow to oppositely signed zeros in deferred browser comparisons. Keep zero signs distinct and require an ordered inner interval.
	const hasWiderNumberBounds = [...outerBounds, ...innerBounds].every(bound => bound.type === 'Number' && isIntegerMathInput(bound))
		&& Number(innerBounds[0].value) < Number(innerBounds[1].value)
		&& outerBounds.every((bound, index) => getNumericLiteralKey(bound) === getNumericLiteralKey(innerBounds[index])
			|| (index === 0 ? Number(bound.value) < Number(innerBounds[index].value) : Number(bound.value) > Number(innerBounds[index].value)));
	if (!hasEqualBounds && !hasWiderNumberBounds) {
		return;
	}

	const [start, end] = context.sourceCode.getRange(node);
	// Retain the inner clamp and its bounds, including their types and percentage hints.
	return getFunctionProblem(node, context, function * (fixer) {
		yield fixer.removeRange([start, start + node.name.length + 1]);
		yield fixer.removeRange([end - 1, end]);
		for (const argument of [arguments_[0], arguments_[2]]) {
			yield fixer.removeRange(context.sourceCode.getRange(argument.nodes[0]));
			yield fixer.removeRange(context.sourceCode.getRange(argument.nextComma ?? argument.previousComma));
		}
	});
}

function getClampSimplification(arguments_) {
	const hasNumberLiterals = arguments_.every(argument => argument.nodes.length === 1 && isNumberCalculationLiteral(argument.nodes[0]));
	const [minimumIsNone, maximumIsNone] = [0, 2].map(index => isIdentifierArgument(arguments_[index], 'none')
		|| (hasNumberLiterals && isIdentifierArgument(arguments_[index], index === 0 ? '-infinity' : 'infinity')));
	if (minimumIsNone || maximumIsNone) {
		return {
			replacementName: minimumIsNone ? (maximumIsNone ? 'calc' : 'min') : 'max',
			removedArguments: arguments_.filter((argument, index) => (index === 0 && minimumIsNone) || (index === 2 && maximumIsNone)),
		};
	}

	const [center, maximum] = arguments_.slice(1);
	if (center.nodes.length === 1 && maximum.nodes.length === 1 && (['Number', 'Dimension', 'Percentage'].includes(center.nodes[0].type) || isNumberCalculationLiteral(center.nodes[0]))
		&& getNumericLiteralKey(center.nodes[0]) === getNumericLiteralKey(maximum.nodes[0])
	) {
		// Clamp(A, B, B) is max(A, min(B, B)). Retain A and B so their types and percentage hints remain.
		return {replacementName: 'max', removedArguments: [maximum]};
	}

	const values = arguments_.map(argument => argument.nodes[0]);
	const [minimumValue] = values;
	if (arguments_.every(argument => argument.nodes.length === 1)
		&& values.every(value => (isFiniteNumberCalculationLiteral(value) && isFiniteNumberCalculationLiteral(minimumValue))
			|| (value.type === 'Dimension' && minimumValue.type === 'Dimension' && Number.isFinite(Number(value.value))
				&& normalizeCssIdentifier(value.unit) === normalizeCssIdentifier(minimumValue.unit)))
			&& (getNumericLiteralKey(minimumValue) === getNumericLiteralKey(values[1]) || getNumericLiteralKey(minimumValue) === getNumericLiteralKey(values[2])
				|| (minimumValue.type === 'Number' && values[2].type === 'Number' && Number(minimumValue.value) > Number(values[2].value)))
	) {
		// Equivalent minimum/center or bounds, and inverted number bounds, select the minimum. Matching numeric types and units preserve the calculation type and exclude expressions that could be NaN.
		return {replacementName: 'calc', removedArguments: [center, maximum]};
	}
}

function getHypotZeroProblem(node, arguments_, context) {
	if (arguments_.length < 3 || arguments_.some(argument => argument.nodes.length !== 1)) {
		return;
	}

	const values = arguments_.map(argument => argument.nodes[0]);
	const [first] = values;
	if (values.some(value => !(['Number', 'Dimension'].includes(value.type) && value.type === first.type && Number.isFinite(Number(value.value))
		&& (value.type !== 'Dimension' || normalizeCssIdentifier(value.unit) === normalizeCssIdentifier(first.unit))))
	) {
		return;
	}

	const zeros = values.map(value => positiveZeroPattern.test(value.value.replace(/^-/, '')));
	// Keep at least two nonzero components: browsers can use a different precision algorithm for a single-argument hypot().
	if (zeros.filter(isZero => !isZero).length < 2) {
		return;
	}

	const firstNonzeroIndex = zeros.indexOf(false);
	const tokens = [];
	for (const [index, argument] of arguments_.entries()) {
		if (zeros[index] === true) {
			// Removing toward the first retained argument keeps comma ranges distinct, including adjacent leading zeros.
			tokens.push(argument.nodes[0], index < firstNonzeroIndex ? argument.nextComma : argument.previousComma);
		}
	}

	return getTokenRemovalProblem(node, tokens, context);
}

function getArgumentProblem(node, name, arguments_, context) {
	const [start] = context.sourceCode.getRange(node);
	let replacementName;
	let removedArguments;
	if (name === 'pow' && arguments_.length === 2 && arguments_[0].nodes.length === 1 && isNumberCalculationValue(arguments_[0].nodes[0]) && isNumberArgument(arguments_[1], 1)) {
		// Exponent one preserves a number. Keep calculation context for signed zero, range clamping, and integer rounding.
		replacementName = 'calc';
		removedArguments = [arguments_[1]];
	} else if (name === 'clamp' && arguments_.length === 3) {
		const simplification = getClampSimplification(arguments_);
		if (!simplification) {
			return;
		}

		({replacementName, removedArguments} = simplification);
	} else if (['round', 'random'].includes(name)) {
		removedArguments = name === 'round' ? getRedundantRoundArguments(arguments_) : getRedundantRandomArguments(arguments_);
		if (removedArguments.length === 0) {
			return;
		}
	} else if (name === 'steps' && arguments_.length === 2 && ['end', 'jump-end'].some(position => isIdentifierArgument(arguments_[1], position))) {
		removedArguments = [arguments_[1]];
	} else {
		return;
	}

	return getFunctionProblem(node, context, function * (fixer) {
		if (replacementName) {
			yield fixer.replaceTextRange([start, start + node.name.length], replacementName);
		}

		// Remove tokens separately so comments between the argument and its comma stay in place.
		for (const argument of removedArguments) {
			yield fixer.removeRange(context.sourceCode.getRange(argument.nodes[0]));
			yield fixer.removeRange(context.sourceCode.getRange(argument.previousComma ?? argument.nextComma));
		}
	});
}

function isNumberCalculationLiteral(node) {
	return node?.type === 'Number' || (node?.type === 'Identifier' && ['e', 'pi', 'infinity', '-infinity', 'nan'].includes(normalizeCssIdentifier(node.name)));
}

function isFiniteNumberCalculationLiteral(node) {
	return (node.type === 'Number' && Number.isFinite(Number(node.value)))
		|| (node.type === 'Identifier' && ['e', 'pi'].includes(normalizeCssIdentifier(node.name)));
}

function isNumberCalculationInput(node) {
	return isNumberCalculationLiteral(node)
		|| (node.type === 'Function' && numberFunctions.has(normalizeCssIdentifier(node.name)))
		|| isIntegerMathInput(node);
}

function isNumberCalculationValue(node) {
	if (isNumberCalculationInput(node)) {
		return true;
	}

	const name = node.type === 'Function' && normalizeCssIdentifier(node.name);
	if (!['abs', 'hypot', 'min', 'max', 'clamp', 'round', 'mod', 'rem', 'random', 'progress'].includes(name)) {
		return false;
	}

	// Whole known-number inputs prove the result's type without evaluating or recursively inferring arithmetic, and avoid percentage hints in progress().
	let arguments_ = getCommaSeparatedGroups(node);
	if (name === 'round' && arguments_.length === 3 && getRoundStepArgument(arguments_)) {
		arguments_ = arguments_.slice(1);
	}

	return arguments_.every(argument => argument.nodes.length === 1 && isNumberCalculationInput(argument.nodes[0]));
}

function getLinearPositionProblem(node, arguments_, context) {
	if (arguments_.length < 2) {
		return;
	}

	const intervals = arguments_.length - 1;
	// Power-of-two intervals keep implicit spacing exactly representable in binary.
	const hasUniformPositions = Number.isSafeInteger(Math.log2(intervals)) && arguments_.every((argument, index) => {
		const output = argument.nodes.find(node => node.type === 'Number');
		const position = argument.nodes.find(node => node.type === 'Percentage');
		return output && (argument.nodes.length === 1 || (argument.nodes.length === 2 && position
			&& Number(position.value) === index * (100 / intervals) && (index !== 0 || positiveZeroPattern.test(position.value))));
	});
	const positions = hasUniformPositions ? arguments_.map((argument, index) => [argument, index * (100 / intervals)]) : [[arguments_[0], 0], [arguments_.at(-1), 100]];
	const tokens = [];
	for (const [argument, value] of positions) {
		const output = argument.nodes.find(node => node.type === 'Number');
		const position = argument.nodes.find(node => node.type === 'Percentage');
		if (argument.nodes.length === 2 && output && position && Number(position.value) === value && (value !== 0 || positiveZeroPattern.test(position.value))) {
			tokens.push(position);
		}
	}

	return getTokenRemovalProblem(node, tokens, context);
}

function getEasingKeyword(name, arguments_) {
	if (name === 'steps' && (arguments_.length === 1 || arguments_.length === 2) && isNumberArgument(arguments_[0], 1) && /^[+\-]?\d+$/v.test(arguments_[0].nodes[0].value)) {
		if (arguments_.length === 1 || ['end', 'jump-end'].some(position => isIdentifierArgument(arguments_[1], position))) {
			return 'step-end';
		}

		if (['start', 'jump-start'].some(position => isIdentifierArgument(arguments_[1], position))) {
			return 'step-start';
		}
	}

	if (name === 'cubic-bezier' && arguments_.length === 4 && arguments_.every(argument => argument.nodes.length === 1 && argument.nodes[0].type === 'Number')) {
		// Even linear endpoint tangents can produce different sampled values from linear timing because browsers approximate cubic curves.
		const values = arguments_.map(argument => Number(argument.nodes[0].value));
		return cubicBezierKeywords.get(values.join(','));
	}

	if (name === 'linear' && arguments_.length === 2 && arguments_.every((argument, index) => {
		const [output, position] = argument.nodes;
		return argument.nodes.length <= 2 && output?.type === 'Number' && Number(output.value) === index
			&& (!position || (position.type === 'Percentage' && Number(position.value) === index * 100));
	})) {
		return 'linear';
	}
}

function getEasingProblem(node, declaration, context) {
	const property = keyword(normalizeCssIdentifier(declaration.property)).basename;
	if (!easingProperties.has(property) || [...declaration.value.children].some(child => isSubstitutionFunction(child))) {
		return;
	}

	const arguments_ = getCommaSeparatedGroups(node);
	if (arguments_.some(argument => argument.nodes.length === 0 || argument.nodes.some(child => isSubstitutionFunction(child)))) {
		return;
	}

	const name = normalizeCssIdentifier(node.name);
	const replacement = getEasingKeyword(name, arguments_);
	if (!replacement) {
		return name === 'linear' ? getLinearPositionProblem(node, arguments_, context) : getArgumentProblem(node, name, arguments_, context);
	}

	return getFunctionReplacementProblem(node, replacement, context);
}

function isRedundantAbsoluteValueArgument(node, parentFunction) {
	const name = parentFunction && normalizeCssIdentifier(parentFunction.name);
	if (!['hypot', 'pow', 'round', 'rem'].includes(name)) {
		return false;
	}

	const arguments_ = getCommaSeparatedGroups(parentFunction);
	if (name === 'hypot') {
		return arguments_.some(argument => argument.nodes.length === 1 && argument.nodes[0] === node);
	}

	if (name === 'pow') {
		return hasEvenPowerExponent(arguments_) && arguments_[0].nodes.length === 1 && arguments_[0].nodes[0] === node;
	}

	if ([...parentFunction.children].some(child => isSubstitutionFunction(child))) {
		return false;
	}

	const step = name === 'round' ? getRoundStepArgument(arguments_) : (arguments_.length === 2 ? arguments_[1] : undefined);
	// Both operations use the divisor's magnitude. Retain grouping so substitutions cannot introduce arguments or strategy keywords.
	return step?.nodes.length === 1 && step.nodes[0] === node;
}

function getRedundantFunctionProblem(node, parentFunction, siblings, context) {
	const name = normalizeCssIdentifier(node.name);
	if (!simplifiableFunctions.has(name) || !node.children) {
		return;
	}

	const arguments_ = getCommaSeparatedGroups(node);
	if (arguments_.some(argument => argument.nodes.length === 0)) {
		return;
	}

	const dominatingComparisonProblem = getDominatingComparisonProblem(node, name, arguments_, context);
	if (dominatingComparisonProblem) {
		return dominatingComparisonProblem;
	}

	if (['calc', 'min', 'max'].includes(name)) {
		return getComparisonProblem(node, parentFunction, siblings, context);
	}

	if (['abs', 'sign'].includes(name)) {
		if (name === 'abs' && isRedundantAbsoluteValueArgument(node, parentFunction)) {
			return getWrapperProblem(node, parentFunction, siblings, context);
		}

		return getSignProblem(node, parentFunction, siblings, context);
	}

	// Direct substitutions can introduce extra arguments or turn a calculation into a strategy keyword. Retained parentheses and functions keep those boundaries intact.
	if ([...node.children].some(child => isSubstitutionFunction(child))) {
		return;
	}

	if (name === 'round' || name === 'clamp') {
		const wrapperProblem = name === 'round' ? getRoundWrapperProblem(node, arguments_, context) : getClampWrapperProblem(node, arguments_, context);
		if (wrapperProblem) {
			return wrapperProblem;
		}
	} else if (name === 'hypot') {
		const zeroProblem = getHypotZeroProblem(node, arguments_, context);
		if (zeroProblem) {
			return zeroProblem;
		}
	}

	return getArgumentProblem(node, name, arguments_, context);
}

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	context.on('Declaration', declaration => {
		const valueText = sourceCode.getText(declaration.value);
		if (
			!(functionPattern.test(valueText) || (valueText.includes('/') && colorFunctionPattern.test(valueText)))
			|| sourceCode.getParent(declaration).type !== 'Block'
			|| isCssModulesInteropDeclaration(declaration, context)
		) {
			return;
		}

		let {value} = declaration;
		if (value.type === 'Raw') {
			if (!declaration.property.startsWith('--')) {
				return;
			}

			try {
				({value} = parse(sourceCode.getText(declaration), {
					context: 'declaration',
					parseCustomProperty: true,
					positions: true,
					offset: sourceCode.getRange(declaration)[0],
				}));
			} catch {
				return;
			}
		}

		const problems = [];
		walk(value, {
			visit: 'Function',
			enter(node, item, siblings) {
				const name = normalizeCssIdentifier(node.name);
				const getProblem = functionProblemGetters.get(name);
				let problem;
				if (getProblem) {
					problem = getProblem(node, context, this.function);
				} else if (defaultFunctions.has(name)) {
					problem = getDefaultFunctionProblem(node, context);
				} else if (colorFunctionsWithAlpha.has(name)) {
					problem = getAlphaProblem(node, context);
				} else if (mixFunctions.has(name)) {
					problem = getMixProblem(node, context);
				} else if (name === 'attr') {
					problem = getAttributeProblem(node, context);
				} else if (name === 'anchor-size') {
					problem = getAnchorSizeProblem(node, declaration, context);
				} else if (contentFunctions.has(name)) {
					problem = getContentProblem(node, context);
				} else if (shapeFunctions.has(name)) {
					problem = getShapeProblem(node, declaration, context);
				} else if (timelineFunctions.has(name)) {
					problem = getTimelineProblem(node, context);
				} else if (gradientFunctions.has(name)) {
					problem = getGradientProblem(node, context);
				} else if (easingFunctions.has(name)) {
					problem = this.function ? undefined : getEasingProblem(node, declaration, context);
				} else {
					if (name === 'calc' && !isCalculationArgument(node, this.function)) {
						problem = getLiteralCalculationProblem(node, declaration, this.function, context);
					}

					problem ??= getRedundantFunctionProblem(node, this.function, siblings, context);
				}

				if (problem) {
					problems.push({node: declaration, ...problem});
				}
			},
		});
		return problems;
	});
};

/**
@type {CssicornRule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow redundant function calls and arguments.',
			recommended: true,
		},
		fixable: 'code',
		messages,
		languages: ['css/css'],
	},
};

export default config;
