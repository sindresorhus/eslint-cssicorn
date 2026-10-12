// @ts-check

import {find} from '@eslint/css-tree';
import {getParentStyleRule, hasNestingSelectorInRawArgument} from './shared/css-selector-specificity.js';
import {isDashedIdentifier, isParsedAsNestedRule} from './utils/index.js';

/**
@import {SelectorPlain} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornRuleFixer} from './rule/to-eslint-rule-fixer.js';
*/

const MESSAGE_ID = 'no-redundant-nesting-selector';
const messages = {
	[MESSAGE_ID]: 'Remove the redundant nesting selector `&`.',
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Rule', function * (rule) {
		if (rule.prelude?.type !== 'SelectorList' || !getParentStyleRule(rule, context)) {
			return;
		}

		// TODO: Remove this assertion once @eslint/css-tree types SelectorListPlain.children as SelectorPlain[].
		for (const selector of /** @type {SelectorPlain[]} */ (rule.prelude.children)) {
			const [nestingSelector, combinator, firstRemainingNode] = selector.children;
			if (
				nestingSelector?.type !== 'NestingSelector'
				|| combinator?.type !== 'Combinator'
				|| ![' ', '>', '+', '~'].includes(combinator.name)
				|| !firstRemainingNode
			) {
				continue;
			}

			if (combinator.name === ' ') {
				// A later nesting reference prevents an implied descendant nesting selector.
				if (selector.children.slice(2).some(child => find(child, node => node.type === 'NestingSelector' || hasNestingSelectorInRawArgument(node)))) {
					continue;
				}

				// Removing & could make the selector look like a custom property declaration.
				if (firstRemainingNode.type === 'TypeSelector' && isDashedIdentifier(firstRemainingNode.name)) {
					continue;
				}
			}

			const [start, end] = sourceCode.getRange(nestingSelector);
			const whitespace = sourceCode.text.slice(end).match(/^[\t ]*/v)?.[0] ?? '';
			const removedRange = /** @type {[number, number]} */ ([start, end + whitespace.length]);
			// The fixed prelude must still parse as a nested rule, or the whole file stops linting. The parser looks ahead a limited number of tokens, so check the whole prelude up to the block.
			const [preludeStart] = sourceCode.getRange(rule.prelude);
			const fixedPreludeText = sourceCode.text.slice(preludeStart, start) + sourceCode.text.slice(removedRange[1], sourceCode.getRange(rule.block)[0]);
			if (!isParsedAsNestedRule(`${fixedPreludeText}{}`)) {
				continue;
			}

			yield {
				node: nestingSelector,
				messageId: MESSAGE_ID,
				/**
				@param {Parameters<CssicornRuleFixer>[0]} fixer
				*/
				// Remove only the `&`, unlike the rules that add tokens to a nested prelude and replace all of it. The parser decides between a rule and a declaration from the start of the prelude, and removing tokens only brings `{` closer, so ESLint can safely apply every `&` removal in a prelude in the same pass. Replacing the whole prelude here would remove one `&` per pass and leave many fixable problems after `--fix` because of ESLint's 10-pass limit. The fixes of the other rules still overlap this range, so they wait for the next pass.
				fix: fixer => fixer.removeRange(removedRange),
			};
		}
	});
};

/**
@type {CssicornRule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow redundant nesting selectors.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
