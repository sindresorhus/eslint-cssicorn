// @ts-check

import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
@import {DeclarationPlain} from '@eslint/css-tree';
@import {CssicornContext} from '../rule/cssicorn-context.js';
*/

/**
Grouping at-rules that pass style context through to nested style rules. `@scope` is a grouping at-rule, but not transparent to them, so it is added separately below.
*/
const transparentGroupingAtRules = new Set(['media', 'supports', 'container', 'layer', 'starting-style']);

// Grouping at-rules can contain style declarations.
const groupingAtRules = new Set([...transparentGroupingAtRules, 'scope']);

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

export {groupingAtRules, transparentGroupingAtRules};
