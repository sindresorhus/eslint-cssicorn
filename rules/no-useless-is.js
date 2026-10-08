import {
	find,
	ident,
} from '@eslint/css-tree';
import {
	canBeRepresentedByNestingSelector,
	canMatchSelector,
	hasAncestorStyleRule,
	hasScopeAncestor,
	isStyleRule,
} from './shared/css-selector-specificity.js';
import {getPseudoSelectorArgument, hasCommentInRange, normalizeCssIdentifier} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {AnyCssNode, PseudoClassSelectorPlain} from '@eslint/css-tree';
*/

const MESSAGE_ID = 'no-useless-is';
const PAGE_ONLY_PSEUDO_CLASSES = new Set(['first', 'left', 'right', 'recto', 'verso']);

const messages = {
	[MESSAGE_ID]: 'Remove the unnecessary `:is()` wrapper.',
};

/**
@param {AnyCssNode} node
*/
const isUnsupportedArgumentNode = node => {
	if (node.type === 'Raw' || node.type === 'NestingSelector') {
		return true;
	}

	if (node.type === 'TypeSelector') {
		return node.name.includes('|');
	}

	if (node.type === 'AttributeSelector') {
		return node.name.name.includes('|') || node.flags !== null;
	}

	if (node.type !== 'PseudoClassSelector') {
		return false;
	}

	const name = normalizeCssIdentifier(node.name);
	// The standard pseudo-class catalog also includes selectors for pages.
	if (PAGE_ONLY_PSEUDO_CLASSES.has(name)) {
		return true;
	}

	// Unwrapping `:has()` can change shadow-host matching or expose it to an unforgiving argument list.
	if (name === 'has') {
		return true;
	}

	// CSSTree parses some functional arguments without validating their grammar.
	const argument = /** @type {PseudoClassSelectorPlain} */ (node).children?.[0];
	return argument !== undefined
		&& argument.type !== 'Selector'
		&& argument.type !== 'SelectorList'
		&& (argument.type !== 'Nth' || argument.selector !== null);
};

/**
@param {PseudoClassSelectorPlain} node
@param {CssicornContext} context
*/
const getSelectorArgument = (node, context) => {
	const selectorList = getPseudoSelectorArgument(node, context);
	if (selectorList?.type !== 'SelectorList' || selectorList.children.length !== 1) {
		return;
	}

	const [selector] = selectorList.children;
	return selector?.type === 'Selector' ? selector : undefined;
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	// Namespace defaults behave differently inside and outside `:is()`.
	if (sourceCode.ast.children.some(node => node.type === 'Atrule' && normalizeCssIdentifier(node.name) === 'namespace')) {
		return;
	}

	context.on('PseudoClassSelector', node => {
		if (normalizeCssIdentifier(node.name) !== 'is') {
			return;
		}

		const containingSelector = sourceCode.getParent(node);
		if (containingSelector?.type !== 'Selector') {
			return;
		}

		const ancestors = sourceCode.getAncestors(node);
		const owner = ancestors.findLast(ancestor => ancestor.type === 'Rule' || ancestor.type === 'Atrule');
		if (!owner?.prelude || !isStyleRule(owner, context) || !ancestors.includes(owner.prelude)) {
			return;
		}

		const selector = getSelectorArgument(node, context);
		if (!selector) {
			return;
		}

		if (
			selector.children.length === 0
			|| find(selector, isUnsupportedArgumentNode)
			|| !canBeRepresentedByNestingSelector(selector, false)
		) {
			return;
		}

		if (
			selector.children.some(child => child.type === 'Combinator')
			&& (
				containingSelector.children.length !== 1
				|| sourceCode.getParent(containingSelector) !== owner.prelude
				|| hasAncestorStyleRule(owner, context)
				|| hasScopeAncestor(owner, context)
			)
		) {
			return;
		}

		const inlinedSelector = {
			...containingSelector,
			children: containingSelector.children.flatMap(child => child === node ? selector.children : [child]),
		};
		if (!canMatchSelector(inlinedSelector)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			* fix(fixer, {abort}) {
				if (hasCommentInRange(context, sourceCode.getRange(node))) {
					return abort();
				}

				const range = sourceCode.getRange(selector);
				let selectorText = sourceCode.text.slice(...range);
				// Terminate a trailing hex escape so it cannot consume surrounding selector whitespace.
				if (selectorText.includes('\\') && ident.decode(selectorText + ' ') === ident.decode(selectorText)) {
					selectorText += ' ';
				}

				yield fixer.replaceText(node, selectorText);
			},
		};
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
			description: 'Disallow unnecessary `:is()` wrappers.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
