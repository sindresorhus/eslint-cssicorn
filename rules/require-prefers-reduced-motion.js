import {keyword} from '@eslint/css-tree';
import {
	getAnimationName,
	getCanonicalLexerNode,
	getGroupAnimationNameNodes,
	getKeyframesName,
} from './shared/css-animations.js';
import {
	getCommaSeparatedGroups,
	getSingleValueIdentifier,
	isCssModulesInteropDeclaration,
	isCssWideKeyword,
	isKeyframesAtRule,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID = 'require-prefers-reduced-motion';
const messages = {
	[MESSAGE_ID]: 'Place `{{property}}` inside a `prefers-reduced-motion: no-preference` media query.',
};

const animationProperties = new Set(['animation', 'animation-name']);
const targetProperties = new Set([...animationProperties, 'transition', 'transition-property', 'transition-duration', 'scroll-behavior']);
const resetKeywords = new Set(['initial', 'unset']);
const transitionKeywords = new Set(['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end', 'normal', 'allow-discrete']);
const easingFunctions = new Set(['cubic-bezier', 'steps', 'linear']);

/**
Check whether a parsed media expression guarantees an explicit positive motion preference.
*/
function hasMotionPreference(node) {
	if (node.type === 'Feature') {
		return node.kind === 'media'
			&& normalizeCssIdentifier(node.name) === 'prefers-reduced-motion'
			&& node.value?.type === 'Identifier'
			&& normalizeCssIdentifier(node.value.name) === 'no-preference';
	}

	if (node.type === 'MediaQuery') {
		return normalizeCssIdentifier(node.modifier ?? '') !== 'not'
			&& Boolean(node.condition && hasMotionPreference(node.condition));
	}

	if (node.type === 'MediaQueryList') {
		return node.children.length > 0 && node.children.every(child => hasMotionPreference(child));
	}

	if (node.type !== 'Condition') {
		return false;
	}

	const operators = new Set(node.children.filter(child => child.type === 'Identifier').map(child => normalizeCssIdentifier(child.name)));
	if (operators.has('not')) {
		return false;
	}

	const operands = node.children.filter(child => child.type !== 'Identifier');
	if (operators.has('or')) {
		return operands.length > 0 && operands.every(child => hasMotionPreference(child));
	}

	return operands.some(child => hasMotionPreference(child));
}

/**
Check only recognized explicit color and opacity properties, rather than guessing all properties that might cause motion.
*/
function isNonMotionProperty(property, lexer) {
	return !property.startsWith('--')
		&& Object.hasOwn(lexer.properties, property)
		&& (property === 'color' || property === 'opacity' || property.endsWith('-color') || property.endsWith('-opacity'));
}

/**
Check whether every declaration in a keyframes definition has a known non-motion effect.
*/
function hasOnlyNonMotionKeyframes(atRule, lexer) {
	return atRule.block.children.every(keyframe => keyframe.type === 'Rule'
		&& keyframe.block?.type === 'Block'
		&& keyframe.block.children.every(declaration => {
			if (declaration.type !== 'Declaration') {
				return false;
			}

			const property = normalizeCssIdentifier(declaration.property);
			return keyword(property).basename === 'animation-timing-function' || isNonMotionProperty(property, lexer);
		}));
}

/**
Check whether a transition layer explicitly selects only non-motion properties, independently of duration.
*/
function hasOnlyNonMotionTransitionTargets(nodes, property, lexer) {
	if (property === 'transition-property' && nodes.some(node => node.type !== 'Identifier')) {
		return false;
	}

	const targets = nodes.filter(node => node.type === 'Identifier' && !transitionKeywords.has(normalizeCssIdentifier(node.name)));
	return targets.length > 0 && targets.every(node => {
		const target = normalizeCssIdentifier(node.name);
		return target === 'none' || isNonMotionProperty(target, lexer);
	});
}

/**
Check the first time component, distinguishing an explicit zero duration from a delay or an unresolved duration.
*/
function hasZeroTransitionDuration(nodes) {
	const duration = nodes.find(node => (node.type === 'Dimension' && ['s', 'ms'].includes(normalizeCssIdentifier(node.unit)))
		|| (node.type === 'Function' && !easingFunctions.has(normalizeCssIdentifier(node.name))));
	return duration === undefined || (duration.type === 'Dimension' && Number(duration.value) === 0);
}

/**
Check whether a duration declaration has exactly one same-block controller that explicitly excludes moving properties.
*/
function hasNonMotionTransitionController(block, lexer) {
	const controllers = block.children.filter(node => node.type === 'Declaration' && ['transition', 'transition-property'].includes(keyword(normalizeCssIdentifier(node.property)).basename));
	if (controllers.length !== 1 || controllers[0].value.type !== 'Value') {
		return false;
	}

	const [controller] = controllers;
	const property = keyword(normalizeCssIdentifier(controller.property)).basename;
	return getCommaSeparatedGroups(controller.value).every(({nodes}) => hasOnlyNonMotionTransitionTargets(nodes, property, lexer));
}

/**
Check whether an animation selection is locally proven to contain no motion.
*/
function hasOnlyNonMotionAnimations(declaration, property, lexer, nonMotionAnimations) {
	return getCommaSeparatedGroups(declaration.value).every(({nodes}) => {
		const names = getGroupAnimationNameNodes(nodes, property, declaration.value, lexer);
		if (names.length > 0) {
			return names.every(node => nonMotionAnimations.get(getAnimationName(node)) === true);
		}

		// The lexer can mistake a dashed animation name for a timeline in ambiguous shorthands.
		if (nodes.some(node => node.type === 'Identifier' && normalizeCssIdentifier(node.name).startsWith('--'))) {
			return false;
		}

		// A valid shorthand without a name selects `none`; unresolved values can supply a name.
		const value = {...declaration.value, children: nodes.map(node => getCanonicalLexerNode(node))};
		return Boolean(lexer.matchProperty(property, value).matched);
	});
}

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {lexer} = sourceCode;
	const nonMotionAnimations = new Map();
	const animationReferences = [];
	const mediaPreferences = new WeakMap();

	const isGuarded = ancestors => ancestors.some(node => {
		if (node.type !== 'Atrule' || normalizeCssIdentifier(node.name) !== 'media') {
			return false;
		}

		if (!mediaPreferences.has(node)) {
			const queries = node.prelude?.type === 'AtrulePrelude' && node.prelude.children.at(0);
			mediaPreferences.set(node, Boolean(queries && hasMotionPreference(queries)));
		}

		return mediaPreferences.get(node);
	});

	const getProblem = (node, property) => ({node, messageId: MESSAGE_ID, data: {property}});

	context.on('Atrule', atRule => {
		const name = getKeyframesName(atRule, lexer);
		if (name !== undefined) {
			nonMotionAnimations.set(name, nonMotionAnimations.get(name) !== false && hasOnlyNonMotionKeyframes(atRule, lexer));
		}
	});

	context.on('Declaration', (declaration, parent) => {
		const property = keyword(normalizeCssIdentifier(declaration.property)).basename;
		if (!targetProperties.has(property) || declaration.value.type !== 'Value' || parent?.type !== 'Block') {
			return;
		}

		const ancestors = sourceCode.getAncestors(declaration);
		if (
			ancestors.every(node => !(node.type === 'Rule' && node.prelude?.type === 'SelectorList'))
			|| ancestors.some(node => isKeyframesAtRule(node))
			|| isCssModulesInteropDeclaration(declaration, context)
			|| isGuarded(ancestors)
		) {
			return;
		}

		const identifier = getSingleValueIdentifier(declaration);
		const value = identifier && normalizeCssIdentifier(identifier.name);
		if (resetKeywords.has(value)) {
			return;
		}

		if (property !== 'transition-duration' && isCssWideKeyword(value)) {
			return getProblem(declaration, property);
		}

		if (animationProperties.has(property)) {
			animationReferences.push({declaration, property});
			return;
		}

		if (property === 'scroll-behavior') {
			return value === 'auto' ? undefined : getProblem(declaration, property);
		}

		if (property === 'transition-duration') {
			const hasOnlyZeroDurations = declaration.value.children.every(node => (node.type === 'Operator' && node.value === ',')
				|| (node.type === 'Dimension' && ['s', 'ms'].includes(normalizeCssIdentifier(node.unit)) && Number(node.value) === 0));
			return hasOnlyZeroDurations || hasNonMotionTransitionController(parent, lexer) ? undefined : getProblem(declaration, property);
		}

		const hasOnlyNonMotionTransitions = getCommaSeparatedGroups(declaration.value).every(({nodes}) => hasOnlyNonMotionTransitionTargets(nodes, property, lexer)
			|| (property === 'transition' && hasZeroTransitionDuration(nodes)));
		return hasOnlyNonMotionTransitions ? undefined : getProblem(declaration, property);
	});

	context.onExit('StyleSheet', function * () {
		for (const {declaration, property} of animationReferences) {
			if (!hasOnlyNonMotionAnimations(declaration, property, lexer, nonMotionAnimations)) {
				yield getProblem(declaration, property);
			}
		}
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
			description: 'Require motion effects inside prefers-reduced-motion: no-preference media queries.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
