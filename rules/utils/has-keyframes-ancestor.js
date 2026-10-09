import isKeyframesAtRule from './is-keyframes-at-rule.js';

/**
@import {CssNodePlain} from '@eslint/css-tree';
@import {CssicornContext} from '../rule/cssicorn-context.js';
*/

/**
Check whether a node is inside a `@keyframes` at-rule, including vendor-prefixed and escaped names.

@param {CssNodePlain} node - The node to check.
@param {CssicornContext} context - The CSS rule context object.
@returns {boolean}
*/
export default function hasKeyframesAncestor(node, context) {
	const {sourceCode} = context;
	return sourceCode.getAncestors(node).some(ancestor => isKeyframesAtRule(ancestor));
}
