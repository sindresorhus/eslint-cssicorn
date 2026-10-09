// @ts-check

import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
Check whether a declaration has an `!important` flag. The flag text is case-insensitive.

@param {import('@eslint/css-tree').DeclarationPlain} declaration - The `Declaration` node.
@returns {boolean}
*/
export default function isImportantDeclaration(declaration) {
	return declaration.important === true
		|| (typeof declaration.important === 'string' && normalizeCssIdentifier(declaration.important) === 'important');
}
