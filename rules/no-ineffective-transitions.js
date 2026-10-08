import {nonAnimatableProperties, discreteProperties} from './shared/css-property-animation-types.js';
import {shorthandToAffectedProperties} from './shared/css-shorthand-properties.js';
import {
	getCanonicalLexerNode,
	getCommaSeparatedGroups,
	getSingleValueIdentifier,
	hasSubstitutionOrRandomFunction,
	isCssModulesInteropDeclaration,
	isCssWideKeyword,
	isStyleBlock,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornRuleFixer} from './rule/to-eslint-rule-fixer.js';
*/

const MESSAGE_ID_NON_ANIMATABLE = 'no-ineffective-transitions/non-animatable';
const MESSAGE_ID_DISCRETE = 'no-ineffective-transitions/discrete';
const MESSAGE_ID_SUGGESTION = 'no-ineffective-transitions/allow-discrete';
const messages = {
	[MESSAGE_ID_NON_ANIMATABLE]: 'Property `{{property}}` cannot be transitioned.',
	[MESSAGE_ID_DISCRETE]: 'Transitioning `{{property}}` requires `allow-discrete` behavior.',
	[MESSAGE_ID_SUGGESTION]: 'Allow discrete transitions for all targets using this behavior entry.',
};

const nonAnimatablePropertyNames = new Set(nonAnimatableProperties);
const discretePropertyNames = new Set(discreteProperties);
const transitionProperties = new Set(['transition', 'transition-property', 'transition-behavior', 'all']);
const longhandProperties = ['transition-property', 'transition-behavior'];

const targetPropertyAliases = new Map([
	// https://www.w3.org/TR/css-text-3/#overflow-wrap-property
	['word-wrap', 'overflow-wrap'],
	// Explicit legacy name aliases: https://compat.spec.whatwg.org/#css-property-aliases
	...[
		'align-content',
		'align-items',
		'align-self',
		'animation',
		'animation-delay',
		'animation-direction',
		'animation-duration',
		'animation-fill-mode',
		'animation-iteration-count',
		'animation-name',
		'animation-play-state',
		'animation-timing-function',
		'backface-visibility',
		'background-clip',
		'background-origin',
		'border-bottom-left-radius',
		'border-bottom-right-radius',
		'border-radius',
		'border-top-left-radius',
		'border-top-right-radius',
		'box-shadow',
		'box-sizing',
		'filter',
		'flex',
		'flex-basis',
		'flex-direction',
		'flex-flow',
		'flex-grow',
		'flex-shrink',
		'flex-wrap',
		'justify-content',
		'mask',
		'mask-clip',
		'mask-composite',
		'mask-image',
		'mask-origin',
		'mask-position',
		'mask-repeat',
		'mask-size',
		'order',
		'perspective',
		'perspective-origin',
		'transform',
		'transform-origin',
		'transform-style',
		'transition',
		'transition-delay',
		'transition-duration',
		'transition-property',
		'transition-timing-function',
	].map(name => [`-webkit-${name}`, name]),
	['-webkit-mask-box-image', 'mask-border'],
	['-webkit-mask-box-image-outset', 'mask-border-outset'],
	['-webkit-mask-box-image-repeat', 'mask-border-repeat'],
	['-webkit-mask-box-image-slice', 'mask-border-slice'],
	['-webkit-mask-box-image-source', 'mask-border-source'],
	['-webkit-mask-box-image-width', 'mask-border-width'],
]);

const getTransitionLists = (declaration, property, lexer) => {
	const {value} = declaration;
	if (
		value.type !== 'Value'
		|| hasSubstitutionOrRandomFunction(value)
	) {
		return;
	}

	if (property !== 'transition-property') {
		const node = getSingleValueIdentifier(declaration);
		const name = node && normalizeCssIdentifier(node.name);
		if (name === 'initial' || name === 'unset') {
			return {'transition-behavior': [{node: property === 'transition-behavior' ? node : undefined, name: 'normal'}]};
		}
	}

	if (property === 'all' || value.children.some(node => node.type === 'Identifier' && isCssWideKeyword(normalizeCssIdentifier(node.name)))) {
		return;
	}

	const canonicalValue = getCanonicalLexerNode(value);
	const matchResult = lexer.matchProperty(property, canonicalValue);
	if (!matchResult.matched) {
		return;
	}

	const groups = getCommaSeparatedGroups(value);
	const canonicalGroups = getCommaSeparatedGroups(canonicalValue);
	const targets = [];
	const behaviors = [];
	for (const [index, {nodes}] of groups.entries()) {
		const canonicalNodes = canonicalGroups[index].nodes;
		if (property === 'transition') {
			const targetIndex = canonicalNodes.findIndex(node => matchResult.isType(node, 'single-transition-property'));
			const behaviorIndex = canonicalNodes.findIndex(node => matchResult.isType(node, 'transition-behavior-value'));
			const targetNode = nodes[targetIndex];
			const behaviorNode = nodes[behaviorIndex];
			targets.push({node: targetNode, name: targetNode ? normalizeCssIdentifier(targetNode.name) : 'all'});
			behaviors.push({name: behaviorNode ? normalizeCssIdentifier(behaviorNode.name) : 'normal', node: behaviorNode, firstNode: nodes[0]});
		} else {
			const [node] = nodes;
			if (nodes.length !== 1 || node.type !== 'Identifier') {
				return;
			}

			const entry = {node, name: normalizeCssIdentifier(node.name)};
			if (property === 'transition-property') {
				targets.push(entry);
			} else {
				behaviors.push(entry);
			}
		}
	}

	// The lexer accepts `none` in multi-item lists, although the transition grammar does not.
	if (targets.length > 1 && value.children.some(node => node.type === 'Identifier' && normalizeCssIdentifier(node.name) === 'none')) {
		return;
	}

	return {'transition-property': targets, 'transition-behavior': behaviors};
};

const getBlockTransitions = (declarations, lexer) => {
	const controls = new Map();
	for (const {declaration, property} of declarations) {
		const important = declaration.important === true
			|| (typeof declaration.important === 'string' && normalizeCssIdentifier(declaration.important) === 'important');
		const properties = property === 'transition' || property === 'all' ? longhandProperties : [property];
		const lists = getTransitionLists(declaration, property, lexer);
		for (const affectedProperty of properties) {
			if (controls.get(affectedProperty)?.important && !important) {
				continue;
			}

			// Unresolved winning declarations still override earlier known values.
			controls.set(affectedProperty, {entries: lists?.[affectedProperty], important});
		}
	}

	return controls;
};

const getAllowDiscreteSuggestion = behavior => ({
	messageId: MESSAGE_ID_SUGGESTION,
	/**
	@param {Parameters<CssicornRuleFixer>[0]} fixer
	*/
	fix: fixer => behavior.node
		? fixer.replaceText(behavior.node, 'allow-discrete')
		: fixer.insertTextBefore(behavior.firstNode, 'allow-discrete '),
});

const getTransitionProblems = function * (targets, behaviors, lexer) {
	const coveredProperties = new Set();
	for (let index = targets.length - 1; index >= 0; index--) {
		const {node, name: targetName} = targets[index];
		const name = targetPropertyAliases.get(targetName) ?? targetName;
		const affectedProperties = shorthandToAffectedProperties.get(name);
		if (
			coveredProperties.has('all')
			|| coveredProperties.has(name)
			|| affectedProperties?.values().every(property => shorthandToAffectedProperties.has(property) || coveredProperties.has(property))
		) {
			continue;
		}

		coveredProperties.add(name);
		for (const affectedProperty of affectedProperties ?? []) {
			coveredProperties.add(affectedProperty);
		}

		// The lexer catalog may omit prefixed aliases, so recognize their canonical properties.
		if (!node || !Object.hasOwn(lexer.properties, targetName.startsWith('-') ? name : targetName)) {
			continue;
		}

		const data = {property: node.name};
		if (nonAnimatablePropertyNames.has(name)) {
			yield {node, messageId: MESSAGE_ID_NON_ANIMATABLE, data};
			continue;
		}

		const behavior = behaviors?.[index % behaviors.length];
		if (discretePropertyNames.has(name) && behavior?.name === 'normal') {
			yield {
				node,
				messageId: MESSAGE_ID_DISCRETE,
				data,
				suggest: behavior.node || behavior.firstNode ? [getAllowDiscreteSuggestion(behavior)] : undefined,
			};
		}
	}
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {lexer} = sourceCode;

	context.on('Block', function * (block) {
		const declarations = [];
		for (const declaration of block.children) {
			if (declaration.type !== 'Declaration') {
				continue;
			}

			const property = normalizeCssIdentifier(declaration.property);
			if (transitionProperties.has(property)) {
				declarations.push({declaration, property});
			}
		}

		if (
			declarations.every(({property}) => !(property === 'transition' || property === 'transition-property'))
			|| !isStyleBlock(block, context)
			|| isCssModulesInteropDeclaration(declarations[0].declaration, context)
		) {
			return;
		}

		const controls = getBlockTransitions(declarations, lexer);
		const targets = controls.get('transition-property')?.entries;
		if (!targets) {
			return;
		}

		const behaviors = controls.get('transition-behavior')?.entries;
		yield * getTransitionProblems(targets, behaviors, lexer);
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
			description: 'Disallow transition targets that cannot transition under the declared behavior.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
