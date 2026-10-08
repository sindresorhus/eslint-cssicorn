import {isCssModulesInteropDeclaration, normalizeCssIdentifier} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornRuleFixer} from './rule/to-eslint-rule-fixer.js';
*/

const MESSAGE_ID_ERROR = 'no-disabled-pinch-zoom/error';
const MESSAGE_ID_SUGGESTION = 'no-disabled-pinch-zoom/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'This `touch-action` value disables browser pinch zoom.',
	[MESSAGE_ID_SUGGESTION]: 'Allow browser pinch zoom.',
};

const horizontalPanValues = new Set(['pan-x', 'pan-left', 'pan-right']);
const verticalPanValues = new Set(['pan-y', 'pan-up', 'pan-down']);

/**
@param {CssicornContext} context
*/
const create = context => {
	context.on('Declaration', declaration => {
		const {value} = declaration;
		if (
			normalizeCssIdentifier(declaration.property) !== 'touch-action'
			|| value.type !== 'Value'
			|| value.children.length === 0
			|| value.children.length > 2
			|| value.children.some(node => node.type !== 'Identifier')
		) {
			return;
		}

		const names = value.children.map(node => normalizeCssIdentifier(node.name));
		const isNone = names.length === 1 && names[0] === 'none';
		const isPanOnly = names.every(name => horizontalPanValues.has(name) || verticalPanValues.has(name))
			&& (names.length === 1 || horizontalPanValues.has(names[0]) !== horizontalPanValues.has(names[1]));
		if (
			(!isNone && !isPanOnly)
			|| context.sourceCode.getParent(declaration)?.type !== 'Block'
			|| isCssModulesInteropDeclaration(declaration, context)
		) {
			return;
		}

		const [firstIdentifier] = value.children;
		return {
			node: value,
			messageId: MESSAGE_ID_ERROR,
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					/**
					@param {Parameters<CssicornRuleFixer>[0]} fixer
					*/
					fix: fixer => isNone
						? fixer.replaceText(firstIdentifier, 'pinch-zoom')
						// Prefixing keeps a trailing hexadecimal escape from consuming the separator.
						: fixer.insertTextBefore(firstIdentifier, 'pinch-zoom '),
				},
			],
		};
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
			description: 'Disallow `touch-action` values that disable browser pinch zoom.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
