// @ts-check

import getBlockOwner from './get-block-owner.js';
import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
@import {CssicornContext} from '../rule/cssicorn-context.js';
*/

/**
Get the at-rule that owns a declaration when the declaration is a descriptor, like `src` in `@font-face`. Descriptors have their own grammars, distinct from properties.

@param {import('@eslint/css-tree').DeclarationPlain} declaration - The `Declaration` node.
@param {CssicornContext} context
@returns {import('@eslint/css-tree').AtrulePlain | undefined} The at-rule with descriptors.
*/
export default function getDescriptorAtRule(declaration, context) {
	const {sourceCode} = context;
	const owner = getBlockOwner(declaration, context);
	if (owner?.type !== 'Atrule') {
		return;
	}

	return sourceCode.lexer.getAtrule(normalizeCssIdentifier(owner.name))?.descriptors ? owner : undefined;
}
