import {getVendorPrefix} from './shared/css-shorthand-properties.js';
import {areEqualValues, getCondensedValueCount} from './shared/css-shorthand-values.js';
import {
	hasCommentInRange,
	hasSubstitutionOrRandomFunction,
	isCssModulesInteropDeclaration,
	normalizeCssIdentifier,
} from './utils/index.js';

const MESSAGE_ID = 'no-redundant-shorthand-values';
const messages = {
	[MESSAGE_ID]: 'Simplify this shorthand value to `{{replacement}}`.',
};

const fourSideProperties = new Set([
	'border-color',
	'border-style',
	'border-width',
	'inset',
	'margin',
	'padding',
	'scroll-margin',
	'scroll-padding',
]);

const twoSideProperties = new Set([
	'border-block-color',
	'border-block-style',
	'border-block-width',
	'border-inline-color',
	'border-inline-style',
	'border-inline-width',
	'gap',
	'grid-gap',
	'inset-block',
	'inset-inline',
	'margin-block',
	'margin-inline',
	'overflow',
	'overscroll-behavior',
	'padding-block',
	'padding-inline',
	'scroll-margin-block',
	'scroll-margin-inline',
	'scroll-padding-block',
	'scroll-padding-inline',
]);

const placeProperties = new Set([
	'place-content',
	'place-items',
	'place-self',
]);

const getValuesText = (values, sourceCode) => values.map(node => sourceCode.getText(node)).join(' ');

const getRepeatedPlaceValueCount = values => {
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

const getReduction = (values, condensedValueCount, sourceCode) => {
	if (condensedValueCount === values.length) {
		return;
	}

	const retainedValues = values.slice(0, condensedValueCount);
	return {
		replacement: getValuesText(retainedValues, sourceCode),
		removeRange: [
			sourceCode.getRange(values[condensedValueCount - 1])[1],
			sourceCode.getRange(values.at(-1))[1],
		],
	};
};

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

const getBorderRadiusResult = (values, sourceCode) => {
	const slashIndex = values.findIndex(node => node.type === 'Operator' && node.value === '/');
	if (slashIndex === -1) {
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
	const reductions = [horizontalReduction, verticalReduction].filter(Boolean);
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

const getPlaceReduction = (values, sourceCode) => {
	if (values.length < 2 || values.some(node => node.type === 'Operator')) {
		return;
	}

	return getReduction(values, getRepeatedPlaceValueCount(values), sourceCode);
};

/**
@param {import('eslint').Rule.RuleContext} context
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

		const normalizedProperty = normalizeCssIdentifier(declaration.property);
		const vendorPrefix = getVendorPrefix(normalizedProperty);
		const property = normalizedProperty.slice(vendorPrefix.length);
		if (
			!fourSideProperties.has(property)
			&& !twoSideProperties.has(property)
			&& property !== 'border-radius'
			&& !placeProperties.has(property)
		) {
			return;
		}

		if (
			hasSubstitutionOrRandomFunction(value)
			|| !sourceCode.lexer.matchProperty(property, value).matched
		) {
			return;
		}

		const values = value.children;
		let result;
		if (property === 'border-radius') {
			result = getBorderRadiusResult(values, sourceCode);
		} else {
			const reduction = placeProperties.has(property)
				? getPlaceReduction(values, sourceCode)
				: getSimpleReduction(values, fourSideProperties.has(property), sourceCode);
			result = reduction && {
				reductions: [reduction],
				replacement: reduction.replacement,
			};
		}

		if (!result) {
			return;
		}

		const {reductions, replacement} = result;
		return {
			node: value,
			messageId: MESSAGE_ID,
			data: {replacement},
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
@type {import('eslint').Rule.RuleModule}
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
