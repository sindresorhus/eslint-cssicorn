import {walk} from '@eslint/css-tree';
import colorFunctionsWithAlpha from './shared/css-color-functions.js';
import {LEGACY_PSEUDO_ELEMENTS} from './shared/css-selector-specificity.js';
import {
	getContainingDeclaration,
	isCssModulesInteropDeclaration,
	isSubstitutionFunction,
	normalizeCssIdentifier,
	parseCustomPropertyDeclaration,
	toLocation,
} from './utils/index.js';

const MESSAGE_ID_COLOR = 'prefer-modern-syntax/color';
const MESSAGE_ID_ALPHA = 'prefer-modern-syntax/alpha';
const MESSAGE_ID_PSEUDO_ELEMENT = 'prefer-modern-syntax/pseudo-element';
const messages = {
	[MESSAGE_ID_COLOR]: 'Prefer modern color syntax for `{{name}}()`.',
	[MESSAGE_ID_ALPHA]: 'Prefer percentage alpha in `{{name}}()`.',
	[MESSAGE_ID_PSEUDO_ELEMENT]: 'Use `::{{name}}` instead of `:{{name}}`.',
};

const legacyColorFunctions = new Set(['rgb', 'rgba', 'hsl', 'hsla']);
// Matches the start of every function in `colorFunctionsWithAlpha` (`lab(` and `lch(` also match `oklab(` and `oklch(`), and backslashes because a name can be escaped.
const colorFunctionPattern = /(?:rgba?|hsla?|hwb|lab|lch|color)\(|\\/iv;
const decimalPattern = /^(?<sign>[+\-]?)(?<integer>\d*)(?:\.(?<fraction>\d+))?$/v;

const hasLinebreak = text => /[\n\f\r]/v.test(text);
const hasKnownColorComponents = (children, commas, slash) => (
	(commas.length === 2 || commas.length === 3)
	&& !slash
	&& children.length === (commas.length * 2) + 1
	&& children.slice(0, 5).every(child => child.type !== 'Function')
);

function toPercentage(number) {
	const match = decimalPattern.exec(number);
	if (!match) {
		return;
	}

	const {sign, fraction = ''} = match.groups;
	const integer = match.groups.integer || '0';
	const decimalIndex = integer.length + 2;
	const digits = (integer + fraction).padEnd(decimalIndex, '0');
	const whole = digits.slice(0, decimalIndex).replace(/^0+(?=\d)/v, '');
	const remainder = digits.slice(decimalIndex).replace(/0+$/v, '');
	return `${sign}${whole}${remainder ? `.${remainder}` : ''}%`;
}

function getAlpha(children, commas, slash, hasKnownComponents) {
	if ((hasKnownComponents && commas.length === 3) || (slash && children.at(-2) === slash)) {
		return children.at(-1);
	}
}

function getSeparatorFixes(children, commas, sourceCode) {
	const fixes = [];
	for (const comma of commas) {
		const index = children.indexOf(comma);
		const previousRange = sourceCode.getRange(children[index - 1]);
		const nextRange = sourceCode.getRange(children[index + 1]);
		const commaRange = sourceCode.getRange(comma);
		const betweenRange = [previousRange[1], nextRange[0]];
		const between = sourceCode.text.slice(...betweenRange);
		const isAlphaSeparator = comma === commas[2];
		const beforeComma = sourceCode.text.slice(previousRange[1], commaRange[0]);
		if (hasLinebreak(beforeComma)) {
			return [];
		}

		if (hasLinebreak(between)) {
			const afterComma = sourceCode.text.slice(commaRange[1], nextRange[0]).replace(/^[\t ]+(?=[\n\f\r])/v, '');
			fixes.push({span: betweenRange, replacement: `${isAlphaSeparator ? ' /' : ''}${afterComma}`});
		} else {
			fixes.push({span: betweenRange, replacement: isAlphaSeparator ? ' / ' : ' '});
		}
	}

	return fixes;
}

function getColorFixes({node, name, children, commas, hasKnownComponents, alpha, sourceCode}) {
	const span = sourceCode.getRange(node);
	const fixes = [];
	if (name === 'rgba' || name === 'hsla') {
		fixes.push({span: [span[0], span[0] + node.name.length], replacement: name.slice(0, -1)});
	}

	if (hasKnownComponents) {
		const separatorFixes = getSeparatorFixes(children, commas, sourceCode);
		if (separatorFixes.length === 0) {
			return [];
		}

		fixes.push(...separatorFixes);
	}

	if (alpha?.type === 'Number') {
		const replacement = toPercentage(alpha.value);
		if (replacement) {
			fixes.push({span: sourceCode.getRange(alpha), replacement});
		}
	}

	return fixes;
}

function getColorProblem(node, context, reportNode = node) {
	const {sourceCode} = context;
	const name = normalizeCssIdentifier(node.name);
	if (!colorFunctionsWithAlpha.has(name)) {
		return;
	}

	const children = [...node.children];
	const operators = children.filter(child => child.type === 'Operator');
	const commas = operators.filter(child => child.value === ',');
	const slash = operators.find(child => child.value === '/');
	const isAlias = name === 'rgba' || name === 'hsla';
	const hasLegacyCommas = legacyColorFunctions.has(name) && commas.length > 0;
	// A substitution can hold any number of comma-separated components, so the legacy syntax cannot be converted.
	if (hasLegacyCommas && children.some(child => isSubstitutionFunction(child))) {
		return;
	}

	const hasKnownComponents = hasLegacyCommas && hasKnownColorComponents(children, commas, slash);
	const alpha = getAlpha(children, commas, slash, hasKnownComponents);
	const hasNumericAlpha = alpha?.type === 'Number';
	if (!isAlias && !hasLegacyCommas && !hasNumericAlpha) {
		return;
	}

	const span = sourceCode.getRange(node);
	const problem = {
		node: reportNode,
		loc: toLocation(span, context),
		messageId: isAlias || hasLegacyCommas ? MESSAGE_ID_COLOR : MESSAGE_ID_ALPHA,
		data: {name},
	};
	if (
		sourceCode.text.slice(...span).includes('/*')
		|| (hasLegacyCommas && (!hasKnownComponents || !sourceCode.lexer.matchType('color', {...node, name}).matched))
	) {
		return problem;
	}

	const fixes = getColorFixes({
		node,
		name,
		children,
		commas,
		hasKnownComponents,
		alpha,
		sourceCode,
	});
	if (fixes.length === 0) {
		return problem;
	}

	return {
		...problem,
		* fix(fixer) {
			for (const {span, replacement} of fixes) {
				yield fixer.replaceTextRange(span, replacement);
			}
		},
	};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('Function', node => {
		const problem = getColorProblem(node, context);
		if (!problem) {
			return;
		}

		const declaration = getContainingDeclaration(node, context);
		if (declaration && isCssModulesInteropDeclaration(declaration, context)) {
			return;
		}

		return problem;
	});

	context.on('Declaration', declaration => {
		if (
			!declaration.property.startsWith('--')
			|| declaration.value.type !== 'Raw'
			// Skip parsing values that cannot contain a color function.
			|| !colorFunctionPattern.test(declaration.value.value)
			|| isCssModulesInteropDeclaration(declaration, context)
		) {
			return;
		}

		const parsed = parseCustomPropertyDeclaration(declaration, context);
		if (parsed?.value.type !== 'Value') {
			return;
		}

		const problems = [];
		walk(parsed.value, node => {
			if (node.type !== 'Function') {
				return;
			}

			const problem = getColorProblem(node, context, declaration);
			if (problem) {
				problems.push(problem);
			}
		});
		return problems;
	});

	context.on('PseudoClassSelector', node => {
		const name = normalizeCssIdentifier(node.name);
		if (!LEGACY_PSEUDO_ELEMENTS.has(name)) {
			return;
		}

		const [start] = context.sourceCode.getRange(node);
		return {
			node,
			messageId: MESSAGE_ID_PSEUDO_ELEMENT,
			data: {name},
			fix: fixer => fixer.replaceTextRange([start, start + 1], '::'),
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer modern CSS color and pseudo-element syntax.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
