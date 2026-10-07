import {find} from '@eslint/css-tree';
import {getParentStyleRule, hasNestingSelectorInRawArgument} from './shared/css-selector-specificity.js';
import {decodeCssIdentifier} from './utils/index.js';

/**
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

		for (const selector of rule.prelude.children) {
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
				// The parser also rejects nested selectors starting with an empty namespace.
				if (
					firstRemainingNode.type === 'TypeSelector'
					&& (firstRemainingNode.name.startsWith('|') || decodeCssIdentifier(firstRemainingNode.name).startsWith('--'))
				) {
					continue;
				}
			}

			yield {
				node: nestingSelector,
				messageId: MESSAGE_ID,
				/**
				@param {Parameters<CssicornRuleFixer>[0]} fixer
				*/
				fix(fixer) {
					const [start, end] = sourceCode.getRange(nestingSelector);
					const whitespace = sourceCode.text.slice(end).match(/^[\t ]*/u)[0];
					return fixer.removeRange([start, end + whitespace.length]);
				},
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
