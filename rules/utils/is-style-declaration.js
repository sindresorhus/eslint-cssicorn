import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
@import {DeclarationPlain} from '@eslint/css-tree';
@import {CssicornContext} from '../rule/cssicorn-context.js';
*/

const groupingAtRules = new Set(['media', 'supports', 'container', 'layer', 'scope', 'starting-style']);

/**
Check for a style declaration, including declarations directly inside nested grouping rules.
@param {DeclarationPlain} declaration
@param {CssicornContext} context
*/
export default function isStyleDeclaration(declaration, {sourceCode}) {
	let parent = sourceCode.getParent(declaration);
	if (parent?.type !== 'Block') {
		return false;
	}

	while (parent) {
		if (parent.type === 'Rule') {
			return true;
		}

		if (parent.type === 'Atrule' && !groupingAtRules.has(normalizeCssIdentifier(parent.name))) {
			return false;
		}

		parent = sourceCode.getParent(parent);
	}

	return false;
}
