import {find, parse, toPlainObject} from '@eslint/css-tree';
import {
	canBeRepresentedByNestingSelector,
	canMatchSelector,
	hasAncestorStyleRule,
	hasScopeAncestor,
	isStyleRule,
} from './shared/css-selector-specificity.js';
import {hasCommentInRange, normalizeCssIdentifier} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-useless-is';
const PAGE_ONLY_PSEUDO_CLASSES = new Set(['first', 'left', 'right', 'recto', 'verso']);

const messages = {
	[MESSAGE_ID]: 'Remove the unnecessary `:is()` wrapper.',
};

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

	// The standard pseudo-class catalog also includes selectors for pages.
	if (PAGE_ONLY_PSEUDO_CLASSES.has(normalizeCssIdentifier(node.name))) {
		return true;
	}

	// CSSTree parses some functional arguments without validating their grammar.
	const argument = node.children?.[0];
	return argument !== undefined
		&& argument.type !== 'Selector'
		&& argument.type !== 'SelectorList'
		&& (argument.type !== 'Nth' || argument.selector !== null);
};

const isHasPseudoClass = node => node.type === 'PseudoClassSelector' && normalizeCssIdentifier(node.name) === 'has';

const getArgument = (node, sourceCode) => {
	if (node.children?.length !== 1) {
		return;
	}

	let [selectorList] = node.children;
	let offset = 0;
	// CSSTree leaves arguments of escaped pseudo-class names unparsed.
	if (selectorList.type === 'Raw') {
		offset = sourceCode.getRange(selectorList)[0];
		try {
			selectorList = toPlainObject(parse(selectorList.value, {context: 'selectorList', positions: true}));
		} catch {
			return;
		}
	}

	if (selectorList.type !== 'SelectorList' || selectorList.children.length !== 1) {
		return;
	}

	const [selector] = selectorList.children;
	return {selector, offset};
};

/**
@param {ESLint.Rule.RuleContext} context
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
		if (containingSelector.type !== 'Selector') {
			return;
		}

		const ancestors = sourceCode.getAncestors(node);
		const owner = ancestors.findLast(ancestor => ancestor.type === 'Rule' || ancestor.type === 'Atrule');
		if (!owner || !isStyleRule(owner, context) || !ancestors.includes(owner.prelude)) {
			return;
		}

		const argument = getArgument(node, sourceCode);
		if (!argument) {
			return;
		}

		const {selector, offset} = argument;
		if (
			selector.children.length === 0
			|| find(selector, isUnsupportedArgumentNode)
			|| !canBeRepresentedByNestingSelector(selector, false)
		) {
			return;
		}

		// Unwrapping must not expose a nested `:has()` to an unforgiving argument list.
		if (ancestors.some(ancestor => isHasPseudoClass(ancestor)) && find(selector, isHasPseudoClass)) {
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

				const range = sourceCode.getRange(selector).map(index => index + offset);
				yield fixer.replaceText(node, sourceCode.text.slice(...range));
			},
		};
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary `:is()` wrappers.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
