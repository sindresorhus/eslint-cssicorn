// @ts-check

import {parse} from './parse.js';

/**
@import {Rule, StyleSheet} from '@eslint/css-tree';
*/

/**
Check whether the parser reads this rule text as a rule when it is nested in a style rule.

The parser reads some nested rules as declarations, like `span::before {}` and long selector lists starting with `a:hover`, and rejects others, like `+span {}` and `|span {}`. Use this before a fix writes a nested rule, or the whole file stops linting.

@param {string} ruleText - The rule including its block, like `span::before {}`.
@returns {boolean}
*/
export default function isParsedAsNestedRule(ruleText) {
	let hasParseError = false;
	const stylesheet = /** @type {StyleSheet} */ (parse(`a{${ruleText}}`, {
		positions: false,
		onParseError() {
			hasParseError = true;
		},
	}));
	const parentRule = /** @type {Rule | null} */ (stylesheet.children.first);
	return !hasParseError && parentRule?.block.children.first?.type === 'Rule';
}
