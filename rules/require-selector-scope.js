import {find} from '@eslint/css-tree';
import {
	getParentStyleRule,
	hasLeadingCombinator,
	hasNestingSelectorInRawArgument,
	hasScopeAncestor,
} from './shared/css-selector-specificity.js';
import {getPseudoSelectorArgument, isKeyframesAtRule, normalizeCssIdentifier} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID = 'require-selector-scope';
const messages = {
	[MESSAGE_ID]: 'Require a positive scoping boundary for this selector.',
};

const POSITIVE_PSEUDO_CLASSES = new Set(['is', 'where', 'nth-child', 'nth-last-child']);

const hasPositiveAnchor = (node, hasScopedParent, context) => {
	if (!node) {
		return false;
	}

	switch (node.type) {
		case 'ClassSelector':
		case 'IdSelector': {
			return true;
		}

		case 'NestingSelector': {
			return hasScopedParent;
		}

		case 'Selector': {
			return node.children.some(child => hasPositiveAnchor(child, hasScopedParent, context));
		}

		case 'SelectorList': {
			return node.children.length > 0 && node.children.every(selector => hasPositiveAnchor(selector, hasScopedParent, context));
		}

		case 'Nth': {
			return hasPositiveAnchor(node.selector, hasScopedParent, context);
		}

		case 'PseudoClassSelector': {
			const name = normalizeCssIdentifier(node.name);
			if (name === 'host' || name === 'host-context') {
				return true;
			}

			return POSITIVE_PSEUDO_CLASSES.has(name) && hasPositiveAnchor(getPseudoSelectorArgument(node, context), hasScopedParent, context);
		}

		case 'PseudoElementSelector': {
			return normalizeCssIdentifier(node.name) === 'slotted' && hasPositiveAnchor(getPseudoSelectorArgument(node, context), hasScopedParent, context);
		}

		default: {
			return false;
		}
	}
};

const hasExplicitNestingSelector = selector => Boolean(find(selector, node => node.type === 'NestingSelector' || hasNestingSelectorInRawArgument(node)));

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const scopedRules = new WeakMap();

	context.on('Rule', function * (rule) {
		if (
			rule.prelude.type !== 'SelectorList'
			|| sourceCode.getAncestors(rule).some(ancestor => isKeyframesAtRule(ancestor))
		) {
			return;
		}

		if (hasScopeAncestor(rule, context)) {
			scopedRules.set(rule, true);
			return;
		}

		const parentRule = getParentStyleRule(rule, context);
		const hasScopedParent = scopedRules.get(parentRule) === true;
		let isScoped = true;

		for (const selector of rule.prelude.children) {
			if (
				hasPositiveAnchor(selector, hasScopedParent, context)
				// Explicit `&` inside negative or relational arguments can escape the nesting parent.
				|| (hasScopedParent && (hasLeadingCombinator(selector) || !hasExplicitNestingSelector(selector)))
			) {
				continue;
			}

			isScoped = false;
			yield {node: selector, messageId: MESSAGE_ID};
		}

		scopedRules.set(rule, isScoped);
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
			description: 'Require a positive scoping boundary for every selector.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
