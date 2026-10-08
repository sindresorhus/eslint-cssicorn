// @ts-check

import {
	ident,
	parse,
	tokenize,
	tokenTypes,
	toPlainObject,
} from '@eslint/css-tree';
import colorFunctionsWithAlpha from './shared/css-color-functions.js';
import {
	decodeCssIdentifier,
	hasCommentInRange,
	isCssModulesInteropDeclaration,
	isCssWideKeyword,
	isStyleDeclaration,
	isSubstitutionFunction,
	normalizeCssIdentifier,
	toLocation,
} from './utils/index.js';

/**
@import {CssLocationRange, CssNodePlain, Dimension, FunctionNodePlain, Hash, NumberNode, ParenthesesPlain, Percentage, ValuePlain} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornProblem} from './rule/to-eslint-problem.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornRuleFixer} from './rule/to-eslint-rule-fixer.js';
*/

/**
@typedef {Array<string | number | boolean | Fingerprint>} Fingerprint
*/

const MESSAGE_ID_ERROR = 'prefer-existing-custom-properties/error';
const MESSAGE_ID_SUGGESTION = 'prefer-existing-custom-properties/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer existing custom property `{{replacement}}` over this literal value.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `{{replacement}}`.',
};

const colorFunctions = new Set([...colorFunctionsWithAlpha, 'color-mix', 'light-dark', 'device-cmyk', 'contrast-color', 'palette-mix']);
const preservedFunctions = new Set(['random', 'element', '-moz-element', 'url']);
const componentTypes = new Set(['Hash', 'Dimension', 'Percentage', 'Function']);
const openingTokens = new Map([
	[tokenTypes.Function, tokenTypes.RightParenthesis],
	[tokenTypes.LeftParenthesis, tokenTypes.RightParenthesis],
	[tokenTypes.LeftSquareBracket, tokenTypes.RightSquareBracket],
	[tokenTypes.LeftCurlyBracket, tokenTypes.RightCurlyBracket],
]);

/**
Get the RGBA channels of a hexadecimal color.
@param {Hash} node
*/
function getHexColorChannels(node) {
	let value = decodeCssIdentifier(node.value);
	if (!/^(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu.test(value)) {
		return;
	}

	if (value.length <= 4) {
		value = [...value].map(character => character.repeat(2)).join('');
	}

	return [
		...[0, 2, 4].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16)),
		value.length === 8 ? Number.parseInt(value.slice(6), 16) / 255 : 1,
	];
}

/**
Get the channel nodes of a supported modern or legacy RGB function.
@param {FunctionNodePlain} node
@param {string} text
*/
function getRgbChannelNodes(node, text) {
	const {children} = node;
	/**
	@param {number} index
	@param {string} value
	*/
	const isOperator = (index, value) => children[index]?.type === 'Operator' && children[index].value === value;
	/**
	@type {CssNodePlain[]}
	*/
	let channels;
	if ((children.length === 5 || children.length === 7) && isOperator(1, ',') && isOperator(3, ',') && (children.length === 5 || isOperator(5, ','))) {
		channels = [children[0], children[2], children[4], children[6]];
		if (channels.slice(0, 3).some(channel => channel.type !== channels[0].type)) {
			return;
		}
	} else if (children.length === 3 || (children.length === 5 && isOperator(3, '/'))) {
		channels = [children[0], children[1], children[2], children[4]];
		for (let index = 1; index < 3; index++) {
			let hasWhitespace = false;
			// These offsets also belong to independently parsed configured values.
			// Both parsers provide locations for value nodes.
			// eslint-disable-next-line internal/no-restricted-property-access
			const previousLocation = /** @type {CssLocationRange} */ (channels[index - 1].loc);
			// eslint-disable-next-line internal/no-restricted-property-access
			const location = /** @type {CssLocationRange} */ (channels[index].loc);

			tokenize(text.slice(previousLocation.end.offset, location.start.offset), type => {
				if (type === tokenTypes.WhiteSpace) {
					hasWhitespace = true;
				}
			});
			if (!hasWhitespace) {
				return;
			}
		}
	} else {
		return;
	}

	return channels;
}

/**
Get the RGBA channels of a simple absolute RGB function.
@param {CssNodePlain} node
@param {string} text
*/
function getRgbColorChannels(node, text) {
	if (node.type !== 'Function' || !['rgb', 'rgba'].includes(normalizeCssIdentifier(node.name))) {
		return;
	}

	const channels = getRgbChannelNodes(node, text);
	if (!channels) {
		return;
	}

	const result = [];
	for (const [index, channel] of channels.entries()) {
		if (index === 3 && channel === undefined) {
			result.push(1);
			continue;
		}

		if (channel.type !== 'Number' && channel.type !== 'Percentage') {
			return;
		}

		const maximum = index === 3 ? 1 : 255;
		const value = channel.type === 'Percentage' ? Number(channel.value) * maximum / 100 : Number(channel.value);
		if (!Number.isFinite(value) || value < 0 || value > maximum) {
			return;
		}

		result.push(value);
	}

	return result;
}

/**
Check whether a function contains substitutions or data that must not be tokenized as style values.
@param {CssNodePlain} node
*/
function isPreservedFunction(node) {
	return node.type === 'Function' && (isSubstitutionFunction(node) || preservedFunctions.has(normalizeCssIdentifier(node.name)));
}

/**
Normalize numeric spellings without conflating integer tokens, units, or value types.
@param {NumberNode | Dimension | Percentage} node
@returns {Fingerprint | undefined}
*/
function getNumericFingerprint(node) {
	const value = Number(node.value);
	if (!Number.isFinite(value)) {
		return;
	}

	if (node.type === 'Dimension') {
		const unit = normalizeCssIdentifier(node.unit);
		return ['Dimension', unit === 'ms' ? value / 1000 : value, unit === 'ms' ? 's' : unit];
	}

	if (node.type === 'Number') {
		return ['Number', /^[+-]?\d+$/u.test(node.value), value];
	}

	return ['Percentage', value];
}

/**
Get a structural fingerprint, retaining integer token flags and significant operator whitespace.
@param {CssNodePlain} node
@param {WeakMap<CssNodePlain, Fingerprint | undefined>} cache
@param {string} text
@returns {Fingerprint | undefined}
*/
function getFingerprint(node, cache, text) {
	if (cache.has(node)) {
		return cache.get(node);
	}

	/**
	@type {Fingerprint | undefined}
	*/
	let fingerprint;
	const channels = node.type === 'Hash' ? getHexColorChannels(node) : getRgbColorChannels(node, text);
	if (channels) {
		fingerprint = ['Color', ...channels];
	} else if (node.type === 'Identifier') {
		const normalizedName = normalizeCssIdentifier(node.name);
		if (!isCssWideKeyword(normalizedName) && normalizedName !== 'currentcolor') {
			fingerprint = ['Identifier', decodeCssIdentifier(node.name)];
		}
	} else if (['Number', 'Dimension', 'Percentage'].includes(node.type)) {
		fingerprint = getNumericFingerprint(/** @type {NumberNode | Dimension | Percentage} */ (node));
	} else if (node.type === 'Operator') {
		fingerprint = ['Operator', node.value];
	} else if (['Value', 'Function', 'Parentheses'].includes(node.type) && !isPreservedFunction(node)) {
		const children = /** @type {ValuePlain | FunctionNodePlain | ParenthesesPlain} */ (node).children.map(child => getFingerprint(child, cache, text));
		if (children.every(child => child !== undefined)) {
			if (node.type === 'Value') {
				fingerprint = children.length === 1 ? children[0] : ['Value', children];
			} else if (node.type === 'Function') {
				fingerprint = ['Function', normalizeCssIdentifier(node.name), children];
			} else {
				fingerprint = ['Parentheses', children];
			}
		}
	}

	cache.set(node, fingerprint);
	return fingerprint;
}

/**
Parse a configured value without accepting the tokenizer's or parser's automatic closing of missing delimiters.
@param {string} value
@param {string} name
*/
function parseConfiguredValue(value, name) {
	try {
		/**
		@type {(number | undefined)[]}
		*/
		const closingTokens = [];
		// A trailing newline exposes unterminated comments, strings, and URLs instead of accepting EOF recovery.
		tokenize(`${value}\n`, (type, start, end) => {
			if (end > value.length && [tokenTypes.Comment, tokenTypes.String, tokenTypes.Url].includes(type)) {
				throw new Error('Unterminated token.');
			}

			if (openingTokens.has(type)) {
				closingTokens.push(openingTokens.get(type));
			} else if ([tokenTypes.RightParenthesis, tokenTypes.RightSquareBracket, tokenTypes.RightCurlyBracket].includes(type)) {
				if (closingTokens.pop() !== type) {
					throw new Error('Unbalanced delimiters.');
				}
			} else if (type === tokenTypes.BadString || type === tokenTypes.BadUrl) {
				throw new Error('Invalid token.');
			}
		});
		if (closingTokens.length > 0) {
			throw new Error('Unbalanced delimiters.');
		}

		const parsed = /** @type {ValuePlain} */ (toPlainObject(parse(value, {
			context: 'value',
			positions: true,
			onParseError(error) {
				throw error;
			},
		})));
		if (parsed.children.length === 0) {
			throw new Error('Empty value.');
		}

		return parsed;
	} catch (error) {
		throw new Error(`Invalid value for custom property ${JSON.stringify(name)}: ${JSON.stringify(value)}.`, {cause: error});
	}
}

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const [{customProperties}] = /** @type {[{customProperties: Record<string, string>}]} */ (context.options);
	/**
	@type {Map<string, string | undefined>}
	*/
	const tokens = new Map();
	/**
	@type {WeakMap<CssNodePlain, Fingerprint | undefined>}
	*/
	const cache = new WeakMap();
	/**
	@param {CssNodePlain} node
	*/
	const getKey = (node, text = sourceCode.text) => {
		const fingerprint = getFingerprint(node, cache, text);
		return fingerprint === undefined ? undefined : JSON.stringify(fingerprint);
	};

	for (const [name, value] of Object.entries(customProperties)) {
		const key = getKey(parseConfiguredValue(value, name), value);
		if (key !== undefined) {
			tokens.set(key, tokens.has(key) ? undefined : `var(${ident.encode(name)})`);
		}
	}

	if (tokens.size === 0) {
		return;
	}

	context.on('Declaration', declaration => {
		if (
			decodeCssIdentifier(declaration.property).startsWith('--')
			|| declaration.value.type !== 'Value'
			|| !isStyleDeclaration(declaration, context)
			|| isCssModulesInteropDeclaration(declaration, context)
		) {
			return;
		}

		/**
		@type {CssicornProblem[]}
		*/
		const problems = [];
		/**
		@param {CssNodePlain} node
		*/
		const visit = node => {
			if (isPreservedFunction(node)) {
				return;
			}

			if (node.type === 'Value' || componentTypes.has(node.type)) {
				const key = getKey(node);
				if (key !== undefined && tokens.has(key)) {
					const replacement = tokens.get(key);
					/**
					@type {[number, number]}
					*/
					const range = node.type === 'Value'
						? [sourceCode.getRange(/** @type {CssNodePlain} */ (node.children.at(0)))[0], sourceCode.getRange(/** @type {CssNodePlain} */ (node.children.at(-1)))[1]]
						: sourceCode.getRange(node);
					if (replacement !== undefined && !hasCommentInRange(context, range)) {
						problems.push({
							node: declaration,
							loc: toLocation(range, context),
							messageId: MESSAGE_ID_ERROR,
							data: {replacement},
							suggest: [{
								messageId: MESSAGE_ID_SUGGESTION,
								data: {replacement},
								/**
								@param {Parameters<CssicornRuleFixer>[0]} fixer
								*/
								fix: fixer => fixer.replaceTextRange(range, replacement),
							}],
						});
					}

					return;
				}
			}

			if (node.type === 'Function' && colorFunctions.has(normalizeCssIdentifier(node.name))) {
				return;
			}

			for (const child of 'children' in node ? node.children ?? [] : []) {
				visit(child);
			}
		};

		visit(declaration.value);
		return problems;
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
			description: 'Prefer existing custom properties over matching literal values.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [{
			type: 'object',
			additionalProperties: false,
			properties: {
				customProperties: {
					type: 'object',
					description: 'Eligible custom-property names and their literal CSS values.',
					propertyNames: {pattern: '^--', minLength: 3},
					additionalProperties: {type: 'string'},
				},
			},
		}],
		defaultOptions: [{customProperties: {}}],
		messages,
		languages: ['css/css'],
	},
};

export default config;
