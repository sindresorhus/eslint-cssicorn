import {ident} from '@eslint/css-tree';

/**
Lowercase only ASCII letters. CSS keywords are ASCII case-insensitive, so other letters, like `İ` or the Kelvin sign, must not change.

@param {string} string
@returns {string}
*/
export const toAsciiLowerCase = string => /[A-Z]/.test(string) ? string.replaceAll(/[A-Z]/g, character => character.toLowerCase()) : string;

/**
Decode CSS escapes, like `\63 olor` to `color`. Faster than `ident.decode()` for the common case without escapes.

@param {string} identifier - The raw identifier, for example `node.name` or `node.property`.
@returns {string}
*/
export function decodeCssIdentifier(identifier) {
	// Decoding only changes identifiers with escapes.
	return identifier.includes('\\') ? ident.decode(identifier) : identifier;
}

/**
Decode CSS escapes and lowercase ASCII letters, to compare a CSS identifier with a keyword.

@param {string} identifier - The raw identifier, for example `node.name` or `node.property`.
@returns {string}
*/
export default function normalizeCssIdentifier(identifier) {
	return toAsciiLowerCase(decodeCssIdentifier(identifier));
}
