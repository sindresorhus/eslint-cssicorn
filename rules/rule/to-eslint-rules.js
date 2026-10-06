// @ts-check

import toEslintRule from './to-eslint-rule.js';

/**
@import {CSSRuleDefinition} from '@eslint/css';
@import {CssicornRule} from './to-eslint-rule.js';
*/

/**
@param {Record<string, CssicornRule>} rules
@returns {Record<string, CSSRuleDefinition>}
*/
export default function toEslintRules(rules) {
	return Object.fromEntries(Object.entries(rules).map(([ruleId, rule]) => [
		ruleId,
		toEslintRule(ruleId, rule),
	]));
}

