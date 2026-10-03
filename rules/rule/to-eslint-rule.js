import getDocumentationUrl from '../utils/get-documentation-url.js';
import toEslintCreate from './to-eslint-create.js';

/**
@import {CSSRuleDefinition} from '@eslint/css';
@import {CssicornCreate} from './to-eslint-create.js';
*/

/**
@typedef {Omit<CSSRuleDefinition, 'create'> & {
	create: CssicornCreate
}} CssicornRule
*/

/**
Convert Cssicorn rule to ESLint rule

@param {string} ruleId
@param {CssicornRule} cssicornRule
@returns {CSSRuleDefinition}
*/
export default function toEslintRule(ruleId, cssicornRule) {
	return {
		meta: {
			// If there are no options, add `[]` so ESLint can validate that no data is passed to the rule.
			// https://github.com/not-an-aardvark/eslint-plugin-eslint-plugin/blob/master/docs/rules/require-meta-schema.md
			schema: [],
			...cssicornRule.meta,
			docs: {
				...cssicornRule.meta.docs,
				url: getDocumentationUrl(ruleId),
			},
		},
		create: toEslintCreate(cssicornRule.create),
	};
}
