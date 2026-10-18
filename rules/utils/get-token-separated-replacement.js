import {generate} from '@eslint/css-tree';

/**
Get replacement text with any spacing needed to keep it separate from surrounding CSS tokens, preserving the original surrounding text.

@param {string} before
@param {string} replacement
@param {string} after
@returns {string}
*/
export default function getTokenSeparatedReplacement(before, replacement, after) {
	const value = generate({
		type: 'Value',
		children: [before, replacement, after].map(value => ({type: 'Raw', value})),
	}, {mode: 'spec'});
	return value.slice(before.length, value.length - after.length);
}
