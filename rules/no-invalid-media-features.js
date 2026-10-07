// @ts-check

import {generate, ident, keyword} from '@eslint/css-tree';
import {rangeMediaFeatureNames, rangeMediaFeatureSyntaxes} from './shared/media-features.js';
import {getFeatureNameRange, normalizeCssIdentifier, toLocation} from './utils/index.js';

/**
@import {CssNodePlain, Feature, FeatureRange, Identifier, Lexer} from '@eslint/css-tree';
@import {CSSSourceCode} from '@eslint/css';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornProblem} from './rule/to-eslint-problem.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID_UNKNOWN = 'no-invalid-media-features/unknown';
const MESSAGE_ID_INVALID_VALUE = 'no-invalid-media-features/invalid-value';
const MESSAGE_ID_MISSING_VALUE = 'no-invalid-media-features/missing-value';
const MESSAGE_ID_INVALID_RANGE = 'no-invalid-media-features/invalid-range';
const MESSAGE_ID_INVALID_CHAIN = 'no-invalid-media-features/invalid-chain';
const messages = {
	[MESSAGE_ID_UNKNOWN]: 'Unknown media feature `{{name}}`.',
	[MESSAGE_ID_INVALID_VALUE]: 'Invalid value `{{value}}` for media feature `{{name}}`. Expected {{expected}}.',
	[MESSAGE_ID_MISSING_VALUE]: 'Media feature `{{name}}` requires a value in plain notation.',
	[MESSAGE_ID_INVALID_RANGE]: 'Media feature `{{name}}` does not support range notation.',
	[MESSAGE_ID_INVALID_CHAIN]: 'Chained media feature comparisons must place the feature between two values and use the same comparison direction.',
};

const mediaFeatureSyntaxes = new Map([
	...rangeMediaFeatureSyntaxes,
	['any-hover', 'none | hover'],
	['any-pointer', 'none | coarse | fine'],
	['color-gamut', 'srgb | p3 | rec2020'],
	['device-posture', 'continuous | folded'],
	['display-state', 'normal | minimized | maximized | fullscreen'],
	['display-mode', 'fullscreen | standalone | minimal-ui | browser | picture-in-picture | window-controls-overlay'],
	['dynamic-range', 'standard | high'],
	['environment-blending', 'opaque | additive | subtractive'],
	['forced-colors', 'none | active'],
	['grid', '0 | 1'],
	['hover', 'none | hover'],
	['inverted-colors', 'none | inverted'],
	['nav-controls', 'none | back'],
	['orientation', 'portrait | landscape'],
	['overflow-block', 'none | scroll | paged'],
	['overflow-inline', 'none | scroll'],
	['pointer', 'none | coarse | fine'],
	['prefers-color-scheme', 'light | dark'],
	['prefers-contrast', 'no-preference | less | more | custom'],
	['prefers-reduced-data', 'no-preference | reduce'],
	['prefers-reduced-motion', 'no-preference | reduce'],
	['prefers-reduced-transparency', 'no-preference | reduce'],
	['resizable', 'true | false'],
	['scan', 'interlace | progressive'],
	['scripting', 'none | initial-only | enabled'],
	['shape', 'rect | round'],
	['ua-color-scheme', 'light | dark'],
	['update', 'none | slow | fast'],
	['video-color-gamut', 'srgb | p3 | rec2020'],
	['video-dynamic-range', 'standard | high'],
]);

for (const [name, syntax] of rangeMediaFeatureSyntaxes) {
	mediaFeatureSyntaxes.set(`min-${name}`, syntax);
	mediaFeatureSyntaxes.set(`max-${name}`, syntax);
}

// The old Firefox form puts the vendor prefix after `min-`/`max-`, for example `min--moz-device-pixel-ratio`.
/**
@param {string} name
*/
function isIgnoredFeatureName(name) {
	const {custom, vendor} = keyword(normalizeCssIdentifier(name).replace(/^(?:min|max)-(?=-)/, ''));
	return custom || vendor !== '';
}

// A function the lexer does not know, like Tailwind CSS `theme()`, is usually replaced at build time, so its value cannot be validated.
/**
@param {CssNodePlain} node
@param {Lexer} lexer
@returns {boolean}
*/
function hasUnknownFunction(node, lexer) {
	if (node.type === 'Function' && !Object.hasOwn(lexer.types, `${normalizeCssIdentifier(node.name)}()`)) {
		return true;
	}

	return 'children' in node && (node.children?.some(child => hasUnknownFunction(child, lexer)) ?? false);
}

/**
@param {string} syntax
*/
function getEnvironmentPlaceholder(syntax) {
	switch (syntax) {
		case '<length>': {
			return '0px';
		}

		case '<integer>': {
			return '0';
		}

		case '<ratio>': {
			return '1 / 1';
		}

		case '<resolution> | infinite': {
			return '1dppx';
		}

		default: {
			return syntax.split(' | ', 1)[0];
		}
	}
}

/**
Serialize identifiers for the lexer without changing the source AST or merging numbers with escaped units.

@param {CssNodePlain} node
@param {Lexer} lexer
@param {string} environmentPlaceholder
@returns {string}
*/
function getValueForMatching(node, lexer, environmentPlaceholder) {
	return generate(node, {
		decorator: handlers => ({
			...handlers,
			node(node) {
				if (node.type === 'Identifier' || node.type === 'Function') {
					const name = normalizeCssIdentifier(node.name);
					if (node.type === 'Function' && name === 'env') {
						handlers.node({...node, type: 'Raw', value: environmentPlaceholder});
						return;
					}

					node = {...node, name: ident.encode(name)};
				} else if (node.type === 'Dimension' && node.unit.includes('\\')) {
					const unit = normalizeCssIdentifier(node.unit);
					// Only known units are safe to serialize beside a number. For example, decoding `\\65 2px` could turn `1\\65 2px` into `1e2px`.
					if (Object.values(lexer.units).some(units => units.includes(unit))) {
						node = {...node, unit};
					}
				}

				handlers.node(node);
			},
		}),
	});
}

/**
@param {Feature | Identifier} node
@param {string} name
@param {CssicornContext} context
@returns {CssicornProblem}
*/
function getUnknownFeatureProblem(node, name, context) {
	return {
		node,
		loc: node.type === 'Feature' ? toLocation(getFeatureNameRange(node, context), context) : context.sourceCode.getLoc(node),
		messageId: MESSAGE_ID_UNKNOWN,
		data: {name},
	};
}

/**
@param {CSSSourceCode} sourceCode
@param {NonNullable<Feature['value']>} valueNode
@param {string} name
@param {string} syntax
@returns {CssicornProblem | undefined}
*/
function getInvalidValueProblem(sourceCode, valueNode, name, syntax) {
	// CSSTree's feature value types use lists for function children, but @eslint/css supplies plain nodes with arrays.
	const node = /** @type {CssNodePlain} */ (valueNode);
	const {error} = sourceCode.lexer.match(syntax, node);

	if (!error || hasUnknownFunction(node, sourceCode.lexer)) {
		return;
	}

	const normalizedValue = getValueForMatching(node, sourceCode.lexer, getEnvironmentPlaceholder(syntax));
	if (!sourceCode.lexer.match(syntax, normalizedValue).error) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID_INVALID_VALUE,
		data: {
			name,
			value: sourceCode.getText(node),
			expected: syntax,
		},
	};
}

/**
@param {FeatureRange} node
@returns {Identifier | undefined}
*/
function getRangeFeatureNameNode(node) {
	const identifierNodes = [node.left, node.middle, node.right].filter(node => node?.type === 'Identifier');

	return identifierNodes.find(node => mediaFeatureSyntaxes.has(normalizeCssIdentifier(node.name)))
		?? identifierNodes.find(node => isIgnoredFeatureName(node.name))
		?? identifierNodes[0];
}

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Feature', node => {
		if (node.kind !== 'media') {
			return;
		}

		if (isIgnoredFeatureName(node.name)) {
			return;
		}

		const name = normalizeCssIdentifier(node.name);
		const syntax = mediaFeatureSyntaxes.get(name);
		if (!syntax) {
			return getUnknownFeatureProblem(node, node.name, context);
		}

		if (node.value) {
			return getInvalidValueProblem(sourceCode, node.value, node.name, syntax);
		}

		if (name.startsWith('min-') || name.startsWith('max-')) {
			return {
				node,
				loc: toLocation(getFeatureNameRange(node, context), context),
				messageId: MESSAGE_ID_MISSING_VALUE,
				data: {name: node.name},
			};
		}
	});

	context.on('FeatureRange', function * (node) {
		if (node.kind !== 'media') {
			return;
		}

		const nameNode = getRangeFeatureNameNode(node);
		if (!nameNode) {
			return;
		}

		if (isIgnoredFeatureName(nameNode.name)) {
			return;
		}

		const name = normalizeCssIdentifier(nameNode.name);
		const syntax = mediaFeatureSyntaxes.get(name);
		if (!syntax) {
			yield getUnknownFeatureProblem(nameNode, nameNode.name, context);
			return;
		}

		if (!rangeMediaFeatureNames.has(name)) {
			yield {
				node: nameNode,
				messageId: MESSAGE_ID_INVALID_RANGE,
				data: {name: nameNode.name},
			};
			return;
		}

		if (
			node.right
			&& (
				nameNode !== node.middle
				|| !['<', '>'].includes(node.leftComparison[0])
				|| node.leftComparison[0] !== node.rightComparison?.[0]
			)
		) {
			yield {node, messageId: MESSAGE_ID_INVALID_CHAIN};
			return;
		}

		for (const valueNode of [node.left, node.middle, node.right]) {
			if (!valueNode || valueNode === nameNode) {
				continue;
			}

			const problem = getInvalidValueProblem(sourceCode, valueNode, nameNode.name, syntax);
			if (problem) {
				yield problem;
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
		type: 'problem',
		docs: {
			description: 'Disallow unknown media features, invalid values, and invalid notation.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
