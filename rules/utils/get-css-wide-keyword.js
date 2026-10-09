// @ts-check

import getSingleValueIdentifier from './get-single-value-identifier.js';
import isCssWideKeyword from './is-css-wide-keyword.js';
import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
Get the CSS-wide keyword of a declaration when its whole value is one, like `inherit` in `color: inherit`.

@param {import('@eslint/css-tree').DeclarationPlain} declaration - The `Declaration` node.
@returns {string | undefined} The normalized keyword.
*/
export default function getCssWideKeyword(declaration) {
	const identifier = getSingleValueIdentifier(declaration);
	if (!identifier) {
		return;
	}

	const keyword = normalizeCssIdentifier(identifier.name);
	return isCssWideKeyword(keyword) ? keyword : undefined;
}
