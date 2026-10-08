// @ts-check

import {generate} from '@eslint/css-tree';
import {areEqualLiteralColors, isLiteralColor} from './shared/css-colors.js';
import {
	getCanonicalLexerNode,
	hasCommentInRange,
	isCssModulesInteropDeclaration,
	isStyleBlock,
	normalizeCssIdentifier,
	toLocation,
} from './utils/index.js';

/**
@import {CssNode, CssNodePlain, DeclarationPlain} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornRuleFixer} from './rule/to-eslint-rule-fixer.js';
*/

const MESSAGE_ID_ERROR = 'prefer-current-color/error';
const MESSAGE_ID_SUGGESTION = 'prefer-current-color/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `currentcolor` over repeating the foreground color.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `currentcolor`.',
};

/**
Get the literal foreground from the last highest-priority color or all declaration.

@param {{node: DeclarationPlain, property: string}[]} declarations
@param {CssicornContext} context
*/
function getForegroundColor(declarations, context) {
	let winner;
	for (const declaration of declarations) {
		if (
			(declaration.property === 'color' || declaration.property === 'all')
			&& (!winner?.node.important || declaration.node.important)
		) {
			winner = declaration;
		}
	}

	if (
		winner?.property !== 'color'
		|| winner.node.value.type !== 'Value'
		|| winner.node.value.children.length !== 1
	) {
		return;
	}

	const [color] = winner.node.value.children;
	if (
		!isLiteralColor(color, context)
		|| (color.type === 'Function' && color.children.some(child => child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'none'))
	) {
		return;
	}

	return color;
}

/**
Collect matching literal colors without descending into a matched color's components.

@param {CssNodePlain} value
@param {CssNodePlain} foreground
@returns {CssNodePlain[]}
*/
function getMatchingColors(value, foreground) {
	/**
	@type {CssNodePlain[]}
	*/
	const colors = [];
	/**
	@param {CssNodePlain} node
	*/
	const visit = node => {
		if (node.type === foreground.type && areEqualLiteralColors(foreground, node)) {
			colors.push(node);
			return;
		}

		for (const child of 'children' in node ? node.children ?? [] : []) {
			visit(child);
		}
	};

	visit(value);
	return colors;
}

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	context.on('Block', function * (block) {
		const declarations = block.children.filter(node => node.type === 'Declaration').map(node => ({node, property: normalizeCssIdentifier(node.property)}));
		const foreground = getForegroundColor(declarations, context);
		if (
			!foreground
			|| isCssModulesInteropDeclaration(declarations[0].node, context)
			|| !isStyleBlock(block, context)
		) {
			return;
		}

		for (const {node: declaration, property} of declarations) {
			if (property === 'color' || property.startsWith('--') || declaration.value.type !== 'Value') {
				continue;
			}

			let colors = getMatchingColors(declaration.value, foreground);
			if (colors.length === 0) {
				continue;
			}

			let {value} = declaration;
			if (sourceCode.getText(value).includes('\\')) {
				value = getCanonicalLexerNode(value);
				colors = getMatchingColors(value, foreground);
			}

			const match = sourceCode.lexer.matchProperty(property, value);
			if (!match.matched) {
				continue;
			}

			for (const color of colors) {
				if (!match.isType(/** @type {CssNode} */ (color), 'color')) {
					continue;
				}

				const range = sourceCode.getRange(color);
				yield {
					node: declaration,
					loc: toLocation(range, context),
					messageId: MESSAGE_ID_ERROR,
					suggest: hasCommentInRange(context, range)
						? []
						: [{
							messageId: MESSAGE_ID_SUGGESTION,
							/**
						@param {Parameters<CssicornRuleFixer>[0]} fixer
						*/
							fix(fixer) {
								const [valueStart, valueEnd] = sourceCode.getRange(declaration.value);
								const before = sourceCode.text.slice(valueStart, range[0]);
								const after = sourceCode.text.slice(range[1], valueEnd);
								// Preserve the original chunks and let the generator separate tokens that would otherwise merge.
								const replacement = generate({
									type: 'Value',
									children: [
										{type: 'Raw', value: before},
										{type: 'Identifier', name: 'currentcolor'},
										{type: 'Raw', value: after},
									],
								}, {mode: 'spec'});
								return fixer.replaceTextRange(range, replacement.slice(before.length, replacement.length - after.length));
							},
						}],
				};
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
			description: 'Prefer currentcolor over repeating the foreground color.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
