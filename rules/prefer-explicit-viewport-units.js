import sizeProperties from './shared/css-size-properties.js';
import {isCssModulesInteropDeclaration, normalizeCssIdentifier} from './utils/index.js';

const MESSAGE_ID_ERROR = 'prefer-explicit-viewport-units/error';
const MESSAGE_ID_SUGGESTION = 'prefer-explicit-viewport-units/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			unit: {
				enum: ['dvh', 'svh', 'lvh'],
				description: 'The viewport height unit to prefer.',
			},
		},
	},
];

const isSizeDeclaration = (node, context) => {
	const {sourceCode} = context;
	let currentNode = node;

	while (currentNode) {
		if (currentNode.type === 'Declaration') {
			return sourceCode.getParent(currentNode).type === 'Block'
				&& sizeProperties.has(normalizeCssIdentifier(currentNode.property))
				&& !isCssModulesInteropDeclaration(currentNode, context);
		}

		currentNode = sourceCode.getParent(currentNode);
	}

	return false;
};

const getReplacement = (unit, preferredUnit) => `${preferredUnit.slice(0, -1)}${unit.at(-1)}`;

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const [{unit: preferredUnit}] = context.options;

	context.on('Dimension', node => {
		const unit = normalizeCssIdentifier(node.unit);
		if (
			(unit !== 'vh' && unit !== 'vw')
			|| Number(node.value) !== 100
			|| !isSizeDeclaration(node, context)
		) {
			return;
		}

		const value = `${node.value}${node.unit}`;
		const replacement = `${node.value}${getReplacement(unit, preferredUnit)}`;

		return {
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {value, replacement},
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {value, replacement},
					fix: fixer => fixer.replaceText(node, replacement),
				},
			],
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
			description: 'Prefer explicit viewport units.',
			recommended: true,
		},
		hasSuggestions: true,
		schema,
		defaultOptions: [{unit: 'dvh'}],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
