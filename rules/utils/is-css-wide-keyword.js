const cssWideKeywords = new Set(['inherit', 'initial', 'revert', 'revert-layer', 'revert-rule', 'unset']);

/**
Check whether a normalized name (see `normalizeCssIdentifier`) is a CSS-wide keyword, like `inherit`, which every property accepts as its whole value.

@param {string} name - The normalized name.
@returns {boolean}
*/
export default function isCssWideKeyword(name) {
	return cssWideKeywords.has(name);
}
