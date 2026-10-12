import {getVendorPrefix} from './shared/css-shorthand-properties.js';
import standardPseudoSelectors from './shared/standard-pseudo-selectors.js';
import {
	decodeCssIdentifier,
	isDashedIdentifier,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-unknown-pseudo-selectors';
const messages = {
	[MESSAGE_ID]: 'Unknown pseudo-selector \'{{selector}}\'.',
};

const getPseudoSelectorKey = pseudoSelector => {
	const colonCount = pseudoSelector.startsWith('::') ? 2 : 1;
	return `${colonCount}:${normalizeCssIdentifier(pseudoSelector.slice(colonCount))}`;
};

// Build tools remove these before the browser sees the CSS.
const frameworkPseudoSelectors = [
	// CSS Modules
	':global',
	':local',
	':export',
	':import',
	// Vue (`:global` is also used by Svelte)
	':deep',
	':slotted',
	'::v-deep',
	'::v-slotted',
	'::v-global',
	// Angular
	'::ng-deep',
];

const knownPseudoSelectorKeys = new Set([...standardPseudoSelectors, ...frameworkPseudoSelectors].map(pseudoSelector => getPseudoSelectorKey(pseudoSelector)));

// WebKit styles scrollbars with unprefixed pseudo-classes on its prefixed pseudo-elements, like `::-webkit-scrollbar-thumb:horizontal`.
const webkitScrollbarPseudoClasses = new Set([
	'corner-present',
	'decrement',
	'double-button',
	'end',
	'horizontal',
	'increment',
	'no-button',
	'single-button',
	'start',
	'vertical',
	'window-inactive',
]);

const getPseudoSelector = node => `${node.type === 'PseudoElementSelector' ? '::' : ':'}${node.name}`;
const isCustomSelector = node => node.type === 'PseudoClassSelector' && isDashedIdentifier(node.name);
const isVendorPrefixed = node => getVendorPrefix(decodeCssIdentifier(node.name)) !== '';

const isAfterVendorPrefixedPseudoElement = (node, sourceCode) => {
	const selector = sourceCode.getParent(node);
	const siblings = selector?.children ?? [];
	for (let index = siblings.indexOf(node) - 1; index >= 0; index--) {
		const sibling = siblings[index];
		if (sibling.type === 'Combinator') {
			return false;
		}

		if (sibling.type === 'PseudoElementSelector' && isVendorPrefixed(sibling)) {
			return true;
		}
	}

	// An argument of a pseudo-class, like `:horizontal` in `::-webkit-scrollbar:not(:horizontal)`, belongs to the outer compound selector.
	const pseudoClass = selector && sourceCode.getParent(sourceCode.getParent(selector));
	return pseudoClass?.type === 'PseudoClassSelector' && isAfterVendorPrefixedPseudoElement(pseudoClass, sourceCode);
};

const isWebkitScrollbarPseudoClass = (node, sourceCode) => node.type === 'PseudoClassSelector'
	&& webkitScrollbarPseudoClasses.has(normalizeCssIdentifier(node.name))
	&& isAfterVendorPrefixedPseudoElement(node, sourceCode);

const getProblem = (node, allowedPseudoSelectorKeys, sourceCode) => {
	if (
		isCustomSelector(node)
		|| isVendorPrefixed(node)
		|| isWebkitScrollbarPseudoClass(node, sourceCode)
	) {
		return;
	}

	const pseudoSelector = getPseudoSelector(node);
	const pseudoSelectorKey = getPseudoSelectorKey(pseudoSelector);

	if (
		knownPseudoSelectorKeys.has(pseudoSelectorKey)
		|| allowedPseudoSelectorKeys.has(pseudoSelectorKey)
	) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID,
		data: {selector: pseudoSelector},
	};
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const [{allow}] = context.options;
	const allowedPseudoSelectorKeys = new Set(allow.map(pseudoSelector => getPseudoSelectorKey(pseudoSelector)));

	const {sourceCode} = context;
	context.on('PseudoClassSelector', node => getProblem(node, allowedPseudoSelectorKeys, sourceCode));
	context.on('PseudoElementSelector', node => getProblem(node, allowedPseudoSelectorKeys, sourceCode));
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow unknown pseudo-class and pseudo-element selectors.',
			recommended: 'unopinionated',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					allow: {
						type: 'array',
						uniqueItems: true,
						items: {
							type: 'string',
							pattern: String.raw`^:{1,2}(?:\\.|[^\\:()])+$`,
						},
						description: 'Additional pseudo-selectors to allow.',
					},
				},
			},
		],
		defaultOptions: [{allow: []}],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
