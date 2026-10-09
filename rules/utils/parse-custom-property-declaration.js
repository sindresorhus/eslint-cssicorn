// @ts-check

import {parse} from '@eslint/css-tree';

/**
@import {CssicornContext} from '../rule/cssicorn-context.js';
*/

/**
Re-parse a declaration with custom-property parsing enabled. The main parser produces a `Raw` value for custom properties, so a declaration like `--foo: 1px + 2px` must be parsed again to walk its value.

@param {import('@eslint/css-tree').DeclarationPlain} declaration - The `Declaration` node.
@param {CssicornContext} context
@returns {import('@eslint/css-tree').DeclarationPlain | undefined} The parsed declaration with absolute positions, or `undefined` when the value is invalid.
*/
export default function parseCustomPropertyDeclaration(declaration, {sourceCode}) {
	try {
		return /** @type {import('@eslint/css-tree').DeclarationPlain} */ (parse(sourceCode.getText(declaration), {
			context: 'declaration',
			parseCustomProperty: true,
			positions: true,
			offset: sourceCode.getRange(declaration)[0],
		}));
	} catch {}
}
