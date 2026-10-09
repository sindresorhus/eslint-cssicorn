// @ts-check

import {parse} from '@eslint/css-tree';

/**
Parse a value with absolute positions, for example the raw value of a custom property. Values of custom properties need not be valid, so invalid values are not an error.

@param {string} text - The value text.
@param {number} [offset] - The offset of the value in the source text.
@returns {import('@eslint/css-tree').Value | undefined} The parsed value with private `List` children, or `undefined` when the value is invalid.
*/
export default function parseValue(text, offset = 0) {
	try {
		return /** @type {import('@eslint/css-tree').Value} */ (parse(text, {
			context: 'value',
			positions: true,
			offset,
		}));
	} catch {}
}
