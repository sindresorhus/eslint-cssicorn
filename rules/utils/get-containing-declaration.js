/**
@import {CssNodePlain} from '@eslint/css-tree';
@import {CssicornContext} from '../rule/cssicorn-context.js';
*/

/**
Get the nearest declaration that contains a node, like `color: red` for the `red` in its value.

@param {CssNodePlain} node - The node to check.
@param {CssicornContext} context - The CSS rule context object.
@returns {import('@eslint/css-tree').DeclarationPlain | undefined}
*/
export default function getContainingDeclaration(node, context) {
	const {sourceCode} = context;
	return sourceCode.getAncestors(node).findLast(ancestor => ancestor.type === 'Declaration');
}
