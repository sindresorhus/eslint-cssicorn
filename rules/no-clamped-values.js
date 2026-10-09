import {parse, walk} from '@eslint/css-tree';
import colorFunctionsWithAlpha from './shared/css-color-functions.js';
import {
	evaluateCssMath,
	getBasePropertyName,
	getBlockOwner,
	getCommaSeparatedGroups,
	isCssMathFunction,
	isCssModulesInteropDeclaration,
	isSubstitutionFunction,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID = 'no-clamped-values';
const MESSAGE_ID_FLOOR = 'no-clamped-values/device-pixel';
const messages = {
	[MESSAGE_ID]: '\'{{target}}\' evaluates to {{value}}, which the browser clamps to {{bound}}.{{hint}}',
	[MESSAGE_ID_FLOOR]: '\'{{target}}\' evaluates to {{value}}, which the browser floors to one device pixel.',
};

const opacityProperties = new Set(['opacity', 'fill-opacity', 'stroke-opacity', 'stop-opacity', 'flood-opacity', 'shape-image-threshold']);
const boundedAmountFunctions = new Set(['grayscale', 'invert', 'opacity', 'sepia']);
const filterFunctions = new Set([...boundedAmountFunctions, 'brightness', 'contrast', 'saturate', 'blur']);
const sliceProperties = new Set(['border-image-slice', 'mask-border-slice']);
const shorthandProperties = new Set(['border-image', 'mask-border', 'text-decoration']);
const integerMinimumProperties = new Set(['column-count', 'orphans', 'widows']);
const valueProperties = new Set([...opacityProperties, ...sliceProperties, 'perspective', 'text-decoration-thickness']);
const colorFunctions = new Set([...colorFunctionsWithAlpha, 'device-cmyk', 'alpha']);
const rgbFunctions = new Set(['rgb', 'rgba']);
const hslFunctions = new Set(['hsl', 'hsla']);

function isComponent(node) {
	return ['Number', 'Percentage', 'Dimension'].includes(node.type) || isCssMathFunction(node);
}

function formatQuantity({value, unit}) {
	return `${value}${unit ?? ''}`;
}

function getClampingProblem(node, target, quantity, {minimum, maximum, percentageHint = false, sourceCode}) {
	if (quantity.value >= minimum && quantity.value <= maximum) {
		return;
	}

	const bound = quantity.value < minimum ? minimum : maximum;
	// Suppress insignificant calculation rounding errors without changing intermediate arithmetic or authored literals.
	if (isCssMathFunction(node) && Math.abs(quantity.value - bound) <= 1e-10 * Math.max(1, Math.abs(bound))) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID,
		data: {
			target,
			value: formatQuantity(quantity),
			bound: formatQuantity({value: bound, unit: quantity.unit}),
			hint: percentageHint && quantity.value > maximum && !sourceCode.getText(node).includes('%') ? ' Did you mean a percentage?' : '',
		},
	};
}

/**
Check intrinsic percentages without reporting invalid direct negative filter amounts.
*/
function getAmountProblem(node, target, sourceCode, {minimum = 0, maximum = 1, percentageBasis = maximum, percentageHint = false, checkNegativeLiterals = true} = {}) {
	if (!isComponent(node)) {
		return;
	}

	const quantity = evaluateCssMath(node, isCssMathFunction(node) ? {percentageBasis: {value: percentageBasis, unit: undefined}} : undefined);
	if (!quantity || !Number.isFinite(quantity.value) || (quantity.unit !== undefined && quantity.unit !== '%')) {
		return;
	}

	if (!checkNegativeLiterals && !isCssMathFunction(node) && quantity.value < 0) {
		return;
	}

	const factor = quantity.unit === '%' ? 100 / percentageBasis : 1;
	return getClampingProblem(node, target, quantity, {
		minimum: minimum * factor, maximum: maximum * factor, percentageHint, sourceCode,
	});
}

function isLength(node, quantity, lexer) {
	// The unitless-zero exception applies to literals, not calculated numbers.
	if (quantity.unit === undefined && isCssMathFunction(node)) {
		return false;
	}

	return Boolean(lexer.matchType('length', formatQuantity(quantity)).matched);
}

function getBlurProblem(node, sourceCode, lexer) {
	if (!isCssMathFunction(node)) {
		return;
	}

	const quantity = evaluateCssMath(node);
	if (!quantity || !Number.isFinite(quantity.value) || !isLength(node, quantity, lexer)) {
		return;
	}

	return getClampingProblem(node, 'blur()', quantity, {minimum: 0, maximum: Infinity, sourceCode});
}

function getPerspectiveProblem(node, target, sourceCode, lexer) {
	let quantity = evaluateCssMath(node);
	if (!quantity || !Number.isFinite(quantity.value) || !isLength(node, quantity, lexer) || (quantity.value < 0 && !isCssMathFunction(node))) {
		return;
	}

	if (quantity.value === 0) {
		quantity = {value: 0, unit: 'px'};
	}

	if (quantity.unit !== 'px') {
		return isCssMathFunction(node) ? getClampingProblem(node, target, quantity, {minimum: 0, maximum: Infinity, sourceCode}) : undefined;
	}

	return getClampingProblem(node, target, quantity, {minimum: 1, maximum: Infinity, sourceCode});
}

function getThicknessProblem(node, target, lexer) {
	const quantity = evaluateCssMath(node);
	if (!quantity || !Number.isFinite(quantity.value) || quantity.value > 0 || (quantity.unit !== '%' && !isLength(node, quantity, lexer))) {
		return;
	}

	return {node, messageId: MESSAGE_ID_FLOOR, data: {target, value: formatQuantity(quantity)}};
}

function getSliceProblem(node, target, sourceCode) {
	const quantity = evaluateCssMath(node);
	if (!quantity || !Number.isFinite(quantity.value) || (!isCssMathFunction(node) && quantity.value < 0)) {
		return;
	}

	if (quantity.unit === '%') {
		return getClampingProblem(node, target, quantity, {minimum: 0, maximum: 100, sourceCode});
	}

	if (quantity.unit === undefined && isCssMathFunction(node)) {
		return getClampingProblem(node, target, quantity, {minimum: 0, maximum: Infinity, sourceCode});
	}
}

function getPropertyProblem(node, property, {sourceCode, lexer}) {
	if (opacityProperties.has(property)) {
		return getAmountProblem(node, property, sourceCode, {percentageHint: true});
	}

	if (sliceProperties.has(property)) {
		return getSliceProblem(node, property, sourceCode);
	}

	if (property === 'text-decoration-thickness') {
		return getThicknessProblem(node, property, lexer);
	}

	return getPerspectiveProblem(node, property, sourceCode, lexer);
}

/**
Find channels only when substitutions cannot change their positions. A slash identifies alpha independently of the channels.
*/
function getColorComponents(node, name) {
	const children = [...node.children];
	const slashIndex = children.findIndex(child => child.type === 'Operator' && child.value === '/');
	let alpha = slashIndex === -1 ? undefined : children[slashIndex + 1];
	let channels = slashIndex === -1 ? children : children.slice(0, slashIndex);
	const groups = getCommaSeparatedGroups(node);
	if (groups.length > 1 && (rgbFunctions.has(name) || hslFunctions.has(name))) {
		if (![3, 4].includes(groups.length) || groups.some(group => group.nodes.length !== 1) || groups.slice(0, 3).some(group => isSubstitutionFunction(group.nodes[0]))) {
			return {alpha};
		}

		channels = groups.slice(0, 3).map(group => group.nodes[0]);
		alpha = groups[3]?.nodes[0];
	}

	const first = channels[0];
	if (first?.type === 'Identifier' && normalizeCssIdentifier(first.name) === 'from') {
		return {alpha};
	}

	if (name === 'color') {
		if (first?.type !== 'Identifier' || !first.name.startsWith('--')) {
			return {alpha};
		}

		channels = channels.slice(1);
	} else if (channels.length !== (name === 'device-cmyk' ? 4 : 3)) {
		return {alpha};
	}

	if (channels.some(channel => !isComponent(channel) && !(channel.type === 'Identifier' && normalizeCssIdentifier(channel.name) === 'none'))) {
		return {alpha};
	}

	return {alpha, channels};
}

function * getColorProblems(node, name, sourceCode, handled) {
	const {alpha, channels} = getColorComponents(node, name);
	if (alpha) {
		handled.add(alpha);
		const problem = getAmountProblem(alpha, `${name}() alpha`, sourceCode, {percentageHint: true});
		if (problem) {
			yield problem;
		}
	}

	if (!channels) {
		return;
	}

	let components = [];
	if (rgbFunctions.has(name)) {
		components = channels.map((channel, index) => ({
			channel, target: `${name}() ${['red', 'green', 'blue'][index]}`, maximum: 255, percentageBasis: 255,
		}));
	} else if (hslFunctions.has(name)) {
		components = [{
			channel: channels[1], target: `${name}() saturation`, maximum: Infinity, percentageBasis: 100,
		}];
	} else if (['lab', 'lch', 'oklab', 'oklch'].includes(name)) {
		const maximum = name.startsWith('ok') ? 1 : 100;
		components.push({
			channel: channels[0], target: `${name}() lightness`, maximum, percentageBasis: maximum,
		});
		if (name === 'lch' || name === 'oklch') {
			components.push({
				channel: channels[1], target: `${name}() chroma`, maximum: Infinity, percentageBasis: name === 'lch' ? 150 : 0.4,
			});
		}
	} else if (name === 'device-cmyk' || name === 'color') {
		components = channels.map((channel, index) => ({
			channel, target: `${name}() channel ${index + 1}`, maximum: 1, percentageBasis: 1,
		}));
	}

	for (const {channel, target, maximum, percentageBasis} of components) {
		handled.add(channel);
		const problem = getAmountProblem(channel, target, sourceCode, {maximum, percentageBasis});
		if (problem) {
			yield problem;
		}
	}
}

/**
Resolve dimensioned range endpoints, like `0s`, to the canonical calculation units.
*/
function getRangeEndpoint(endpoint, unit, fallback) {
	if (endpoint === null || endpoint === undefined) {
		return fallback;
	}

	if (typeof endpoint === 'number') {
		return endpoint;
	}

	const quantity = evaluateCssMath(parse(String(endpoint), {context: 'value'}));
	return quantity?.unit === unit ? quantity.value : undefined;
}

function getCalculationProblem(node, trace, declarationProperty, sourceCode) {
	if (!trace) {
		return;
	}

	const property = trace.findLast(part => part.type === 'Property')?.name ?? declarationProperty;
	let range = trace.findLast(part => part.type === 'Type' && part.opts?.type === 'Range');
	// The bundled grammar omits this bound for the font-style longhand and descriptor.
	if (!range && declarationProperty === 'font-style' && trace.some(part => part.type === 'Type' && part.name === 'angle')) {
		range = {name: 'angle', opts: {min: '-90deg', max: '90deg'}};
	}

	if (!range && !integerMinimumProperties.has(property)) {
		return;
	}

	// Percentages retain their type or stay unresolved without an intrinsic basis.
	let quantity = evaluateCssMath(node);
	if (!quantity || !Number.isFinite(quantity.value)) {
		return;
	}

	const type = range?.name ?? 'integer';
	const integer = trace.some(part => part.type === 'Type' && part.name === 'integer');
	const {lexer} = sourceCode;
	if (!lexer.matchType(integer ? 'number' : type, formatQuantity(quantity)).matched) {
		return;
	}

	if (integer) {
		quantity = {...quantity, value: Math.round(quantity.value)};
	}

	const minimum = range ? getRangeEndpoint(range.opts.min, quantity.unit, -Infinity) : 1;
	const maximum = range ? getRangeEndpoint(range.opts.max, quantity.unit, Infinity) : Infinity;
	if (minimum === undefined || maximum === undefined) {
		return;
	}

	return getClampingProblem(node, property, quantity, {minimum, maximum, sourceCode});
}

/**
Choose the property's or known descriptor's grammar without assuming an unknown at-rule's declaration semantics.
*/
function getDeclarationContext(declaration, sourceCode) {
	const owner = getBlockOwner(declaration, {sourceCode});
	const atRule = owner?.type === 'Atrule' ? normalizeCssIdentifier(owner.name) : undefined;
	const atRuleDefinition = atRule && sourceCode.lexer.getAtrule(atRule);
	if (atRule && !atRuleDefinition) {
		return;
	}

	return {
		atRule,
		isDescriptor: Boolean(atRuleDefinition?.descriptors),
	};
}

function hasClampingCandidate(property, value) {
	return valueProperties.has(property) || shorthandProperties.has(property) || value.children.some(node => node.type === 'Function');
}

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {lexer} = sourceCode;
	context.on('Declaration', (declaration, parent) => {
		if (declaration.value.type !== 'Value' || parent?.type !== 'Block' || declaration.property.startsWith('--')) {
			return;
		}

		const property = getBasePropertyName(declaration.property);
		if (!hasClampingCandidate(property, declaration.value) || isCssModulesInteropDeclaration(declaration, context)) {
			return;
		}

		const declarationContext = getDeclarationContext(declaration, sourceCode);
		if (!declarationContext) {
			return;
		}

		const {isDescriptor, atRule} = declarationContext;
		const problems = [];
		const handled = new WeakSet();
		let match;
		const getTrace = node => {
			match ??= isDescriptor ? lexer.matchAtruleDescriptor(atRule, property, declaration.value) : lexer.matchProperty(property, declaration.value);
			return match.getTrace(node);
		};

		const addProblem = (node, problem) => {
			handled.add(node);
			if (problem) {
				problems.push(problem);
			}
		};

		// These properties accept a single component only.
		const needsSingleComponent = opacityProperties.has(property) || property === 'perspective';
		if (!isDescriptor) {
			for (const node of declaration.value.children) {
				if (!isComponent(node)) {
					continue;
				}

				const effectiveProperty = shorthandProperties.has(property) ? getTrace(node)?.findLast(part => part.type === 'Property')?.name : property;
				if (!valueProperties.has(effectiveProperty)) {
					continue;
				}

				if (needsSingleComponent && declaration.value.children.length !== 1) {
					continue;
				}

				addProblem(node, getPropertyProblem(node, effectiveProperty, {sourceCode, lexer}));
			}
		}

		walk(declaration.value, {
			enter(node) {
				if (node.type !== 'Function') {
					return;
				}

				const name = normalizeCssIdentifier(node.name);
				if (isCssMathFunction(node)) {
					if (!handled.has(node)) {
						const problem = getCalculationProblem(node, getTrace(node), property, sourceCode);
						if (problem) {
							problems.push(problem);
						}
					}

					return walk.skip;
				}

				if (isDescriptor || !node.children) {
					return;
				}

				if (colorFunctions.has(name)) {
					problems.push(...getColorProblems(node, name, sourceCode, handled));
				} else if (filterFunctions.has(name) && ['filter', 'backdrop-filter'].includes(property) && declaration.value.children.includes(node) && node.children.length === 1) {
					const argument = node.children.at(0);
					const problem = name === 'blur'
						? getBlurProblem(argument, sourceCode, lexer)
						: getAmountProblem(argument, `${name}() amount`, sourceCode, {
							maximum: boundedAmountFunctions.has(name) ? 1 : Infinity, percentageBasis: 1, percentageHint: boundedAmountFunctions.has(name), checkNegativeLiterals: false,
						});
					addProblem(argument, problem);
				} else if (name === 'perspective' && property === 'transform' && declaration.value.children.includes(node) && node.children.length === 1) {
					const length = node.children.at(0);
					addProblem(length, getPerspectiveProblem(length, 'perspective()', sourceCode, lexer));
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
		type: 'problem',
		docs: {
			description: 'Disallow CSS values that browsers silently clamp.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
