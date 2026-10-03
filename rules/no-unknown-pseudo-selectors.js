import {ident} from '@eslint/css-tree';
import standardPseudoSelectors from './shared/standard-pseudo-selectors.js';
import {toAsciiLowerCase} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-unknown-pseudo-selectors';
const messages = {
	[MESSAGE_ID]: 'Unknown pseudo-selector \'{{selector}}\'.',
};

const getPseudoSelectorKey = pseudoSelector => {
	const colonCount = pseudoSelector.startsWith('::') ? 2 : 1;
	return `${colonCount}:${toAsciiLowerCase(ident.decode(pseudoSelector.slice(colonCount)))}`;
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

const getPseudoSelector = node => `${node.type === 'PseudoElementSelector' ? '::' : ':'}${node.name}`;
const isCustomSelector = node => node.type === 'PseudoClassSelector' && ident.decode(node.name).startsWith('--');
const isVendorPrefixed = node => /^-\w+-/.test(ident.decode(node.name));

const getProblem = (node, allowedPseudoSelectorKeys) => {
	if (
		isCustomSelector(node)
		|| isVendorPrefixed(node)
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

	context.on('PseudoClassSelector', node => getProblem(node, allowedPseudoSelectorKeys));
	context.on('PseudoElementSelector', node => getProblem(node, allowedPseudoSelectorKeys));
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
