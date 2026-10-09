/**
@import {CssNodePlain} from '@eslint/css-tree';
@import {CssicornContext} from '../rule/cssicorn-context.js';
*/

/**
Get the nearest at-rule that contains a node, like the `@media` rule for a feature in its prelude.

@param {CssNodePlain} node - The node to check.
@param {CssicornContext} context - The CSS rule context object.
@returns {import('@eslint/css-tree').AtrulePlain | undefined}
*/
export default function getContainingAtRule(node, context) {
	const {sourceCode} = context;
	return sourceCode.getAncestors(node).findLast(ancestor => ancestor.type === 'Atrule');
}
