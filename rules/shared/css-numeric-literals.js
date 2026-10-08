// @ts-check

import {normalizeCssIdentifier} from '../utils/index.js';

/**
@import {CssNode, CssNodePlain} from '@eslint/css-tree';
*/

/**
Check whether a number has an exactly comparable integer spelling.

@param {string} value
@returns {boolean}
*/
export function isSafeIntegerSpelling(value) {
	return /^[+\-]?(?:\d+(?:\.0+)?|\.0+)$/v.test(value) && Number.isSafeInteger(Number(value));
}

/**
Get a comparison key that preserves non-integer spellings, units, and signed zeros.

@param {CssNode | CssNodePlain} node
@returns {string | undefined}
*/
export function getNumericLiteralKey(node) {
	if (node.type === 'Identifier') {
		return `Identifier:${normalizeCssIdentifier(node.name)}`;
	}

	if (node.type !== 'Number' && node.type !== 'Dimension' && node.type !== 'Percentage') {
		return;
	}

	// Equivalent integer spellings have the same value at any engine precision. Keep signed zeros, types, and units distinct.
	const numericValue = Number(node.value);
	const value = isSafeIntegerSpelling(node.value) ? (Object.is(numericValue, -0) ? '-0' : numericValue) : node.value;
	return `${node.type}:${value}:${node.type === 'Dimension' ? normalizeCssIdentifier(node.unit) : ''}`;
}
