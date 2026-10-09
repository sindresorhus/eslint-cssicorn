import {tokenize, tokenTypes} from '@eslint/css-tree';

/**
Check whether raw text contains a `Delim` token of a given character.

@param {string} text - The raw text to tokenize.
@param {string} character - The character that the delimiter must be.
@returns {boolean}
*/
export default function hasDelimToken(text, character) {
	let hasToken = false;
	tokenize(text, (type, start) => {
		hasToken ||= type === tokenTypes.Delim && text[start] === character;
	});

	return hasToken;
}
