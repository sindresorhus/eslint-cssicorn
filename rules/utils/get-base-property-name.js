// @ts-check

import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
Get the normalized property name without its vendor prefix, for example `-WEBKIT-Transition` to `transition`. It decodes escapes and lowercases only ASCII letters, like `normalizeCssIdentifier`.

@param {string} property - The raw property name, for example `node.property`.
@returns {string}
*/
export default function getBasePropertyName(property) {
	return normalizeCssIdentifier(property).replace(/^-\w+-/v, '');
}
