import {find} from '@eslint/css-tree';
import {
	canBeRepresentedByNestingSelector,
	canMatchSelector,
	getOwningStyleRule,
	hasAncestorStyleRule,
	hasScopeAncestor,
} from './shared/css-selector-specificity.js';
import {
	decodeCssIdentifier,
	getParsableNestedRulePrelude,
	getPseudoSelectorArgument,
	hasCommentInRange,
	normalizeCssIdentifier,
} from './utils/index.js';

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
Get the text that replaces the `:is()`, or `undefined` when the fix would remove a comment.

@param {PseudoClassSelectorPlain} node
@param {AnyCssNode} selector
@param {CssicornContext} context
*/
const getSelectorText = (node, selector, context) => {
	const {sourceCode} = context;
	if (hasCommentInRange(context, sourceCode.getRange(node))) {
		return;
	}

	let selectorText = sourceCode.text.slice(...sourceCode.getRange(selector));
	// Terminate a trailing hex escape so it cannot consume surrounding selector whitespace.
	if (selectorText.includes('\\') && decodeCssIdentifier(selectorText + ' ') === decodeCssIdentifier(selectorText)) {
		selectorText += ' ';
	}

	return selectorText;
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

	const nestedRuleProblems = new Map();

	context.on('PseudoClassSelector', node => {
		if (normalizeCssIdentifier(node.name) !== 'is') {
			return;
		}

		const containingSelector = sourceCode.getParent(node);
		if (containingSelector?.type !== 'Selector') {
			return;
		}

		const owner = getOwningStyleRule(node, context);
		if (!owner) {
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

		const problem = {node, messageId: MESSAGE_ID};
		const selectorText = getSelectorText(node, selector, context);
		if (hasAncestorStyleRule(owner, context)) {
			const problems = nestedRuleProblems.get(owner) ?? [];
			problems.push({problem, selectorText});
			nestedRuleProblems.set(owner, problems);
			return;
		}

		return {...problem, fix: selectorText === undefined ? undefined : fixer => fixer.replaceText(node, selectorText)};
	});

	// `@eslint/css` can parse a nested rule that starts like `a::before` or `a ::before` as a declaration, and the fixed file must still parse. Replace the whole prelude so that fixes of other rules in the same prelude wait for the next pass. Every problem in the prelude gets the same fix with all the changes, because ESLint applies only one of the overlapping fixes per pass and stops after 10 passes. When the prelude with all the changes cannot be parsed, none of them are fixed, even if some of them could be fixed alone.
	context.onExit('Rule', function * (rule) {
		const problems = nestedRuleProblems.get(rule);
		if (!problems) {
			return;
		}

		const changes = [];
		for (const {problem, selectorText} of problems) {
			const [start, end] = sourceCode.getRange(problem.node);
			// An `:is()` inside another `:is()` that is unwrapped waits for the next pass.
			if (selectorText !== undefined && start >= (changes.at(-1)?.end ?? 0)) {
				changes.push({start, end, selectorText});
			}
		}

		const preludeRange = [sourceCode.getRange(rule.prelude)[0], sourceCode.getRange(rule.block)[0]];
		let preludeText = sourceCode.text.slice(...preludeRange);
		for (const {start, end, selectorText} of changes.toReversed()) {
			preludeText = preludeText.slice(0, start - preludeRange[0]) + selectorText + preludeText.slice(end - preludeRange[0]);
		}

		const fixedPreludeText = changes.length > 0 ? getParsableNestedRulePrelude(preludeText, {canAddNestingSelector: !hasScopeAncestor(rule, context)}) : undefined;
		const fix = fixedPreludeText === undefined ? undefined : fixer => fixer.replaceTextRange(preludeRange, fixedPreludeText);
		for (const {problem, selectorText} of problems) {
			yield {...problem, fix: selectorText === undefined ? undefined : fix};
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
