import {generate} from '@eslint/css-tree';
import {
	getAtRuleContextPart,
	hasCommentInRange,
	isKeyframesAtRule,
	normalizeCssIdentifier,
} from './utils/index.js';
import {LEGACY_PSEUDO_ELEMENTS} from './shared/css-selector-specificity.js';

/**
@import * as ESLint from 'eslint';
*/

const DUPLICATE_SELECTOR = 'duplicate-selector';
const DUPLICATE_SELECTOR_LIST = 'duplicate-selector-list';
const messages = {
	[DUPLICATE_SELECTOR]: 'This selector duplicates the selector on line {{line}}.',
	[DUPLICATE_SELECTOR_LIST]: 'This selector list duplicates the selector list on line {{line}}.',
};

// `:after` is a legacy alias of `::after`
const normalizeLegacyPseudoElement = node => {
	if (
		(node.type !== 'PseudoClassSelector' && node.type !== 'PseudoElementSelector')
		|| node.children
	) {
		return node;
	}

	const name = normalizeCssIdentifier(node.name);
	return LEGACY_PSEUDO_ELEMENTS.has(name) ? {...node, type: 'PseudoElementSelector', name} : node;
};

const getSelectorKey = selector => generate({
	...selector,
	children: selector.children.map(node => normalizeLegacyPseudoElement(node)),
});

const getDuplicateSelectorRemovalRange = (selectors, index, block, context) => {
	const {sourceCode} = context;
	const selector = selectors[index];
	const previousSelector = selectors[index - 1];
	const nextSelector = selectors[index + 1];
	const [, previousSelectorEnd] = sourceCode.getRange(previousSelector);
	const [selectorStart, selectorEnd] = sourceCode.getRange(selector);
	const [commentCheckEnd] = sourceCode.getRange(nextSelector ?? block);
	const separator = sourceCode.text.slice(previousSelectorEnd, selectorStart);
	const removalRange = [previousSelectorEnd, selectorEnd];
	const commentCheckRange = [previousSelectorEnd, commentCheckEnd];

	if (!/^\s*,\s*$/v.test(separator) || hasCommentInRange(context, commentCheckRange)) {
		return;
	}

	return removalRange;
};

const getDuplicateSelectorsFix = (rule, duplicates, sourceCode) => {
	const removalRanges = duplicates.map(({removalRange}) => removalRange).filter(Boolean);
	if (removalRanges.length === 0) {
		return;
	}

	const [selectorListStart, selectorListEnd] = sourceCode.getRange(rule.prelude);
	let replacement = sourceCode.text.slice(selectorListStart, selectorListEnd);
	for (const [start, end] of removalRanges.toReversed()) {
		replacement = replacement.slice(0, start - selectorListStart) + replacement.slice(end - selectorListStart);
	}

	return fixer => fixer.replaceText(rule.prelude, replacement);
};

const getContextKey = (rule, context) => {
	const {sourceCode} = context;
	const parts = [];
	let node = sourceCode.getParent(rule);

	while (node) {
		if (node.type === 'Atrule') {
			// Keyframe selectors, like `from`, are not style rules.
			if (isKeyframesAtRule(node)) {
				return;
			}

			parts.push(getAtRuleContextPart(node, context));
		} else if (node.type === 'Rule') {
			parts.push(['rule', generate(node.prelude)]);
		}

		node = sourceCode.getParent(node);
	}

	return JSON.stringify(parts.toReversed());
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const selectorListsByContext = new Map();

	context.on('Rule', function * (rule) {
		if (rule.prelude.type !== 'SelectorList') {
			return;
		}

		const contextKey = getContextKey(rule, context);
		if (contextKey === undefined) {
			return;
		}

		const selectors = rule.prelude.children;
		const selectorKeys = selectors.map(selector => getSelectorKey(selector));
		const seenSelectors = new Map();
		const duplicates = [];

		for (const [index, selector] of selectors.entries()) {
			const selectorKey = selectorKeys[index];
			const firstSelector = seenSelectors.get(selectorKey);

			if (!firstSelector) {
				seenSelectors.set(selectorKey, selector);
				continue;
			}

			duplicates.push({
				selector,
				firstSelector,
				removalRange: getDuplicateSelectorRemovalRange(selectors, index, rule.block, context),
			});
		}

		const duplicateSelectorsFix = getDuplicateSelectorsFix(rule, duplicates, sourceCode);
		for (const {selector, firstSelector, removalRange} of duplicates) {
			yield {
				node: selector,
				messageId: DUPLICATE_SELECTOR,
				data: {line: String(sourceCode.getLoc(firstSelector).start.line)},
				fix: removalRange ? duplicateSelectorsFix : undefined,
			};
		}

		let selectorLists = selectorListsByContext.get(contextKey);
		if (!selectorLists) {
			selectorLists = new Map();
			selectorListsByContext.set(contextKey, selectorLists);
		}

		const selectorListKey = selectorKeys.join(',');
		const firstSelectorList = selectorLists.get(selectorListKey);
		if (!firstSelectorList) {
			selectorLists.set(selectorListKey, rule.prelude);
			return;
		}

		yield {
			node: rule.prelude,
			messageId: DUPLICATE_SELECTOR_LIST,
			data: {line: String(sourceCode.getLoc(firstSelectorList).start.line)},
		};
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow duplicate CSS selectors.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
