// @ts-check

import {fourSideShorthands, pairShorthands} from './shared/css-shorthand-properties.js';
import {areEqualValues, getCondensedValueCount} from './shared/css-shorthand-values.js';
import {getDefaultShorthandReduction, hasShorthandDefaults} from './shared/css-shorthand-defaults.js';
import {
	getBasePropertyName,
	getCommaSeparatedGroups,
	hasCommentInRange,
	hasSubstitutionOrRandomFunction,
	isCssModulesInteropDeclaration,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {CSSSourceCode} from '@eslint/css';
@import {CssNodePlain} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornRuleFixer} from './rule/to-eslint-rule-fixer.js';
*/

/**
@typedef {{replacement: string, removeRange: [number, number]}} ValueReduction
@typedef {NonNullable<ReturnType<typeof getDefaultShorthandReduction>>} ShorthandReduction
*/

const MESSAGE_ID = 'no-redundant-shorthand-values';
const messages = {
	[MESSAGE_ID]: 'Simplify this shorthand value to `{{replacement}}`.',
};

// `grid-gap` is excluded from the shared set because `grid-row-gap`/`grid-column-gap` are reported as `gap` instead.
const twoSideProperties = new Set([...pairShorthands, 'grid-gap', 'background-repeat']);

const repeatedGroupProperties = new Set([
	'contain-intrinsic-size',
	'place-content',
	'place-items',
	'place-self',
]);

/**
@param {CssNodePlain[]} values
@param {CSSSourceCode} sourceCode
*/
const getValuesText = (values, sourceCode) => values.map(node => sourceCode.getText(node)).join(' ');

/**
@param {CssNodePlain[]} values
*/
const getRepeatedGroupValueCount = values => {
	if (values.length % 2 !== 0) {
		return values.length;
	}

	const halfLength = values.length / 2;
	for (let index = 0; index < halfLength; index++) {
		if (!areEqualValues(values[index], values[index + halfLength])) {
			return values.length;
		}
	}

	return halfLength;
};

/**
@param {CssNodePlain[]} values
@param {number} condensedValueCount
@param {CSSSourceCode} sourceCode
@returns {ValueReduction | undefined}
*/
const getReduction = (values, condensedValueCount, sourceCode) => {
	if (condensedValueCount === values.length) {
		return;
	}

	const retainedValues = values.slice(0, condensedValueCount);
	return {
		replacement: getValuesText(retainedValues, sourceCode),
		removeRange: [
			sourceCode.getRange(values[condensedValueCount - 1])[1],
			sourceCode.getRange(/** @type {CssNodePlain} */ (values.at(-1)))[1],
		],
	};
};

/**
@param {CssNodePlain[]} values
@param {boolean} preserveFourValueEdges
@param {CSSSourceCode} sourceCode
*/
const getSimpleReduction = (values, preserveFourValueEdges, sourceCode) => {
	if (
		values.length < 2
		|| values.length > 4
		|| values.some(node => node.type === 'Operator')
	) {
		return;
	}

	return getReduction(values, getCondensedValueCount(values, preserveFourValueEdges), sourceCode);
};

/**
@param {CssNodePlain[]} values
@param {CSSSourceCode} sourceCode
@returns {ShorthandReduction | undefined}
*/
const getLayeredResult = (values, sourceCode) => {
	const layers = getCommaSeparatedGroups({children: values}).map(({nodes}) => {
		const reduction = getSimpleReduction(nodes, false, sourceCode);
		return {
			reduction,
			replacement: reduction?.replacement ?? getValuesText(nodes, sourceCode),
		};
	});
	const reductions = layers.flatMap(({reduction}) => reduction ? [reduction] : []);
	if (reductions.length === 0) {
		return;
	}

	return {
		reductions,
		replacement: layers.map(({replacement}) => replacement).join(', '),
	};
};

/**
@param {CssNodePlain[]} values
@param {boolean} isWebkitBorderRadius
@param {CSSSourceCode} sourceCode
@returns {ShorthandReduction | undefined}
*/
const getBorderRadiusResult = (values, isWebkitBorderRadius, sourceCode) => {
	const slashIndex = values.findIndex(node => node.type === 'Operator' && node.value === '/');
	if (slashIndex === -1) {
		// WebKit and Blink parse `-webkit-border-radius: 1px 2px` as `1px / 2px`, so it must not be reduced to two values.
		if (isWebkitBorderRadius && getCondensedValueCount(values, false) === 2) {
			return;
		}

		const reduction = getSimpleReduction(values, false, sourceCode);
		return reduction && {
			reductions: [reduction],
			replacement: reduction.replacement,
		};
	}

	const horizontalValues = values.slice(0, slashIndex);
	const verticalValues = values.slice(slashIndex + 1);
	const horizontalReduction = getSimpleReduction(horizontalValues, false, sourceCode);
	const verticalReduction = getSimpleReduction(verticalValues, false, sourceCode);
	const reductions = /** @type {ValueReduction[]} */ ([horizontalReduction, verticalReduction].filter(Boolean));
	if (reductions.length === 0) {
		return;
	}

	const horizontalReplacement = horizontalReduction?.replacement ?? getValuesText(horizontalValues, sourceCode);
	const verticalReplacement = verticalReduction?.replacement ?? getValuesText(verticalValues, sourceCode);
	return {
		reductions,
		replacement: `${horizontalReplacement} / ${verticalReplacement}`,
	};
};

/**
@param {CssNodePlain[]} values
@param {CSSSourceCode} sourceCode
*/
const getRepeatedGroupReduction = (values, sourceCode) => {
	if (values.length < 2 || values.some(node => node.type === 'Operator')) {
		return;
	}

	return getReduction(values, getRepeatedGroupValueCount(values), sourceCode);
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Declaration', declaration => {
		const {value} = declaration;
		if (
			value.type !== 'Value'
			|| isCssModulesInteropDeclaration(declaration, context)
		) {
			return;
		}

		const property = getBasePropertyName(declaration.property);
		const canOmitDefaults = normalizeCssIdentifier(declaration.property) === property
			&& hasShorthandDefaults(property)
			&& sourceCode.getParent(declaration)?.type === 'Block';
		if (
			!fourSideShorthands.has(property)
			&& !twoSideProperties.has(property)
			&& property !== 'border-radius'
			&& !repeatedGroupProperties.has(property)
			&& !canOmitDefaults
		) {
			return;
		}

		if (hasSubstitutionOrRandomFunction(value)) {
			return;
		}

		const values = value.children;
		let result;
		if (canOmitDefaults) {
			result = getDefaultShorthandReduction(property, value, context);
		} else if (property === 'border-radius') {
			result = getBorderRadiusResult(values, normalizeCssIdentifier(declaration.property) === '-webkit-border-radius', sourceCode);
		} else if (property === 'background-repeat') {
			result = getLayeredResult(values, sourceCode);
		} else {
			const reduction = repeatedGroupProperties.has(property)
				? getRepeatedGroupReduction(values, sourceCode)
				: getSimpleReduction(values, fourSideShorthands.has(property), sourceCode);
			result = reduction && {
				reductions: [reduction],
				replacement: reduction.replacement,
			};
		}

		// Match the grammar last, as it is slow and most values cannot be simplified.
		if (
			!result
			|| (!canOmitDefaults && !sourceCode.lexer.matchProperty(property, value).matched)
		) {
			return;
		}

		const {reductions, replacement} = result;
		return {
			node: value,
			messageId: MESSAGE_ID,
			data: {replacement},

			/**
			@param {Parameters<CssicornRuleFixer>[0]} fixer
			@param {Parameters<CssicornRuleFixer>[1]} options
			*/
			* fix(fixer, {abort}) {
				if (reductions.some(({removeRange}) => hasCommentInRange(context, removeRange))) {
					return abort();
				}

				for (const {removeRange} of reductions) {
					yield fixer.removeRange(removeRange);
				}
			},
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
			description: 'Disallow redundant values in CSS shorthand properties.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
