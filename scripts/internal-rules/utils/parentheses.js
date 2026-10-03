import iterateSurroundingParentheses from './iterate-surrounding-parentheses.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
@import {
	OpeningParenToken as OpeningParenthesisToken,
	ClosingParenToken as ClosingParenthesisToken,
} from '@eslint-community/eslint-utils';
*/

/**
@typedef {WeakMap<ESTree.Node, (OpeningParenthesisToken | ClosingParenthesisToken)[]>}
*/
const parenthesesCache = new WeakMap();

/**
Get surrounding parenthesis of the node.

@param {ESTree.Node} node
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns [(OpeningParenthesisToken | ClosingParenthesisToken)[]]
*/
export function getParentheses(node, context) {
	if (!node || !parenthesesCache.has(node)) {
		const parenthesis = [];
		for (const [openingParenthesisToken, closingParenthesisToken] of iterateSurroundingParentheses(node, context)) {
			parenthesis.unshift(openingParenthesisToken);
			parenthesis.push(closingParenthesisToken);
		}

		parenthesesCache.set(node, parenthesis);
	}

	return parenthesesCache.get(node);
}

/*
Get the parenthesized range of the node.

@param {ESTree.Node} node - The node to be checked.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {number[]}
*/
export function getParenthesizedRange(node, context) {
	const parentheses = getParentheses(node, context);
	const [start] = context.sourceCode.getRange(parentheses[0] ?? node);
	const [, end] = context.sourceCode.getRange(parentheses.at(-1) ?? node);
	return [start, end];
}
