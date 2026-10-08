import {normalizeCssIdentifier} from '../utils/index.js';

/**
Check whether a number has an exactly comparable integer spelling.
*/
export function isSafeIntegerSpelling(value) {
	return /^[+\-]?(?:\d+(?:\.0+)?|\.0+)$/v.test(value) && Number.isSafeInteger(Number(value));
}

/**
Get a comparison key that preserves non-integer spellings, units, and signed zeros.
*/
export function getNumericLiteralKey(node) {
	if (node.type === 'Identifier') {
		return `Identifier:${normalizeCssIdentifier(node.name)}`;
	}

	if (!['Number', 'Dimension', 'Percentage'].includes(node.type)) {
		return;
	}

	// Equivalent integer spellings have the same value at any engine precision. Keep signed zeros, types, and units distinct.
	const numericValue = Number(node.value);
	const value = isSafeIntegerSpelling(node.value) ? (Object.is(numericValue, -0) ? '-0' : numericValue) : node.value;
	return `${node.type}:${value}:${node.type === 'Dimension' ? normalizeCssIdentifier(node.unit) : ''}`;
}
