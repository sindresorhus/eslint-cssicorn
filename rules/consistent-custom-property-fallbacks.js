// @ts-check

import {
	string,
	tokenize,
	tokenTypes,
	toPlainObject,
} from '@eslint/css-tree';
import {areEquivalentColors, isLiteralColor} from './shared/css-colors.js';
import {getNumericLiteralKey} from './shared/css-numeric-literals.js';
import {
	decodeCssIdentifier,
	getCanonicalLexerNode,
	normalizeCssIdentifier,
	parse,
	substitutionFunctions,
	toLocation,
} from './utils/index.js';

/**
@import {CssNode, CssNodePlain, ValuePlain} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';

@typedef {{type: number, start: number, end: number}} Token
@typedef {{opening: number, closing: number, property: string}} Fallback
@typedef {{key: string, text: string, property: string, complete: boolean, line: number, column: number, color?: CssNodePlain | false}} Reference
*/

const openingTokens = new Map([
	[tokenTypes.Function, tokenTypes.RightParenthesis],
	[tokenTypes.LeftParenthesis, tokenTypes.RightParenthesis],
	[tokenTypes.LeftSquareBracket, tokenTypes.RightSquareBracket],
	[tokenTypes.LeftCurlyBracket, tokenTypes.RightCurlyBracket],
]);
const closingTokens = new Set(openingTokens.values());

/**
Get a token comparison key without losing token boundaries or case-sensitive identifiers.
@param {Token} token
@param {string} text
@returns {unknown}
*/
function getTokenKey(token, text) {
	const {type, start, end} = token;
	const value = text.slice(start, end);
	if (type === tokenTypes.Ident) {
		return [type, decodeCssIdentifier(value)];
	}

	if (type === tokenTypes.String) {
		return [type, string.decode(value)];
	}

	if (type === tokenTypes.Function) {
		const name = decodeCssIdentifier(value.slice(0, -1));
		return [type, name.startsWith('--') ? name : normalizeCssIdentifier(name)];
	}

	if ([tokenTypes.Number, tokenTypes.Dimension, tokenTypes.Percentage].includes(type)) {
		const numericValue = /** @type {RegExpMatchArray} */ (/^[+\-]?(?:\d*\.\d+|\d+)(?:e[+\-]?\d+)?/iv.exec(value))[0];
		const nodeType = type === tokenTypes.Dimension ? 'Dimension' : 'Percentage';
		const node = type === tokenTypes.Number
			? {type: 'Number', value: numericValue}
			: {type: nodeType, value: numericValue, unit: value.slice(numericValue.length)};
		return [type, getNumericLiteralKey(/** @type {CssNodePlain} */ (node)), type === tokenTypes.Number && /^[+\-]?\d+$/v.test(numericValue)];
	}

	return [type, value];
}

/**
Get a literal color only when the consuming property's grammar proves its meaning.
@param {Reference} reference
@param {CssicornContext} context
@returns {CssNodePlain | false}
*/
function getColor(reference, context) {
	if (reference.color !== undefined) {
		return reference.color;
	}

	reference.color = false;
	if (!reference.complete || reference.property.startsWith('--') || !reference.text) {
		return false;
	}

	try {
		const value = getCanonicalLexerNode(/** @type {ValuePlain} */ (toPlainObject(parse(reference.text, {context: 'value'}))));
		const node = value.children.at(0);
		if (value.children.length !== 1 || !node || !isLiteralColor(node, context)) {
			return false;
		}

		const match = context.sourceCode.lexer.matchProperty(reference.property, value);
		if (match.matched && match.isType(/** @type {CssNode} */ (node), 'color')) {
			reference.color = node;
		}
	} catch {}

	return reference.color ?? false;
}

/**
@param {CssicornContext} context
*/
const create = context => {
	const {customProperties} = /** @type {{customProperties: string[]}} */ (context.options[0]);
	if (customProperties.length === 0) {
		return;
	}

	const names = new Set(customProperties);
	/**
	@type {Map<string, Reference>}
	*/
	const references = new Map();
	const {sourceCode} = context;
	context.on('Declaration', function * (declaration) {
		const text = sourceCode.getText(declaration.value);
		// Escaped function names need tokenization too.
		if (!text.includes('(')) {
			return;
		}

		/**
		@type {Token[]}
		*/
		const tokens = [];
		/**
		@type {number[]}
		*/
		const stack = [];
		/**
		@type {Fallback[]}
		*/
		const fallbacks = [];
		let lastSubstitution = -1;
		let malformed = false;
		// Custom-property values and var() fallbacks can both be opaque Raw nodes.
		tokenize(text, (type, start, end) => {
			if (type === tokenTypes.WhiteSpace || type === tokenTypes.Comment) {
				return;
			}

			const index = tokens.length;
			tokens.push({type, start, end});
			if ([tokenTypes.BadString, tokenTypes.BadUrl].includes(type)) {
				malformed = true;
			}

			if (type === tokenTypes.Function) {
				const name = normalizeCssIdentifier(text.slice(start, end - 1));
				if (substitutionFunctions.has(name) || name.startsWith('--') || name === 'random') {
					lastSubstitution = index;
				}
			}

			if (openingTokens.has(type)) {
				stack.push(index);
				return;
			}

			if (!closingTokens.has(type)) {
				return;
			}

			const opening = stack.pop();
			if (opening === undefined || openingTokens.get(tokens[opening].type) !== type) {
				malformed = true;
				return;
			}

			const token = tokens[opening];
			if (token.type !== tokenTypes.Function || normalizeCssIdentifier(text.slice(token.start, token.end - 1)) !== 'var'
				|| tokens[opening + 1]?.type !== tokenTypes.Ident || tokens[opening + 2]?.type !== tokenTypes.Comma
				|| lastSubstitution >= opening + 3) {
				return;
			}

			const nameToken = tokens[opening + 1];
			const property = decodeCssIdentifier(text.slice(nameToken.start, nameToken.end));
			if (names.has(property)) {
				fallbacks.push({opening, closing: index, property});
			}
		});

		if (malformed || stack.length > 0) {
			return;
		}

		const [offset] = sourceCode.getRange(declaration.value);
		for (const {opening, closing, property} of fallbacks) {
			const loc = toLocation([offset + tokens[opening].start, offset + tokens[closing].end], context);
			/**
			@type {Reference}
			*/
			const reference = {
				key: JSON.stringify(tokens.slice(opening + 3, closing).map(token => getTokenKey(token, text))),
				text: text.slice(tokens[opening + 2].end, tokens[closing].start).trim(),
				property: normalizeCssIdentifier(declaration.property),
				complete: opening === 0 && closing === tokens.length - 1,
				line: loc.start.line,
				column: loc.start.column,
			};
			const first = references.get(property);
			if (!first) {
				references.set(property, reference);
				continue;
			}

			if (reference.key === first.key) {
				continue;
			}

			const firstColor = getColor(first, context);
			const color = getColor(reference, context);
			if (firstColor && color && areEquivalentColors(firstColor, color)) {
				continue;
			}

			yield {
				node: declaration,
				loc,
				messageId: 'consistent-custom-property-fallbacks',
				data: {property, line: first.line, column: first.column},
			};
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
			description: 'Enforce consistent fallbacks for configured custom properties.',
			recommended: true,
		},
		schema: [{
			type: 'object',
			additionalProperties: false,
			properties: {
				customProperties: {
					type: 'array',
					description: 'Shared custom-property names whose fallbacks must agree within each file.',
					uniqueItems: true,
					items: {type: 'string', pattern: '^--', minLength: 3},
				},
			},
		}],
		defaultOptions: [{customProperties: []}],
		messages: {
			'consistent-custom-property-fallbacks': 'Fallback for custom property `{{property}}` differs from its first fallback at {{line}}:{{column}}.',
		},
		languages: ['css/css'],
	},
};

export default config;
