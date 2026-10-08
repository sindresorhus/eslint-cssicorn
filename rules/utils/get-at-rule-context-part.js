import {generate} from '@eslint/css-tree';
import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
@import {AtrulePlain} from '@eslint/css-tree';
@import {CssicornContext} from '../rule/cssicorn-context.js';
*/

/**
Get a JSON-serializable key part for the condition of an at-rule, like `@media (width > 1px)`, to check whether two rules are in the same context. Each anonymous `@layer` block is a separate layer, so it gets a unique part.

@param {AtrulePlain} atRule - The `Atrule` node.
@param {CssicornContext} context - The CSS rule context object.
@returns {Array<string | number>}
*/
export default function getAtRuleContextPart(atRule, context) {
	const {sourceCode} = context;
	const name = normalizeCssIdentifier(atRule.name);
	if (name === 'layer' && !atRule.prelude) {
		return ['anonymous-layer', sourceCode.getRange(atRule)[0]];
	}

	return ['at-rule', name, atRule.prelude ? generate(atRule.prelude) : ''];
}
