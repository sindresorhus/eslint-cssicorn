import {find, lexer} from '@eslint/css-tree';
import {
	canBeRepresentedByNestingSelector,
	canMatchSelector,
	compareSpecificity,
	getRuleSelectorSpecificity,
	hasAncestorStyleRule,
	hasNestingSelectorInRawArgument,
	hasScopeAncestor,
	isStyleRule,
} from './shared/css-selector-specificity.js';
import {hasCommentInRange, normalizeCssIdentifier} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornRuleFixer} from './rule/to-eslint-rule-fixer.js';
*/

const MESSAGE_ID = 'prefer-nesting';
const MESSAGE_ID_RELATED_RULES = 'prefer-nesting/related-rules';
const messages = {
	[MESSAGE_ID]: 'Prefer CSS nesting over `:{{name}}()`.',
	[MESSAGE_ID_RELATED_RULES]: 'Prefer CSS nesting for related rules.',
};

const PARENT_PSEUDO_CLASSES = new Set([
	'hover',
	'active',
	'focus',
	'focus-visible',
	'focus-within',
	'checked',
	'disabled',
	'enabled',
	'valid',
	'invalid',
	'required',
	'optional',
	'read-only',
	'read-write',
	'indeterminate',
	'placeholder-shown',
	'first-child',
	'last-child',
	'only-child',
	'first-of-type',
	'last-of-type',
	'only-of-type',
	'empty',
	'root',
	'target',
	'any-link',
	'open',
	'in-range',
	'out-of-range',
	'default',
	'user-valid',
	'user-invalid',
]);

const PARENT_FUNCTIONAL_PSEUDO_CLASSES = new Set([
	'not',
	'has',
	'is',
	'where',
	'lang',
	'dir',
	'nth-child',
	'nth-last-child',
	'nth-of-type',
	'nth-last-of-type',
]);

const isDescendantCombinator = node => node?.type === 'Combinator' && node.name === ' ';

const getSelectorList = node => {
	if (node?.type !== 'PseudoClassSelector' || !['is', 'where'].includes(normalizeCssIdentifier(node.name))) {
		return;
	}

	const argumentsList = node.children?.[0];
	if (
		argumentsList?.type !== 'SelectorList'
		|| argumentsList.children.length < 2
		|| argumentsList.children.some(selector => !canBeRepresentedByNestingSelector(selector, false))
	) {
		return;
	}

	return argumentsList;
};

// Keep uncertain selectors inside :is() to preserve its forgiving selector-list behavior.
const canUnwrapSelectorNode = node => {
	switch (node.type) {
		case 'ClassSelector': {
			return true;
		}

		case 'IdSelector': {
			return Boolean(lexer.matchType('ident', node.name).matched);
		}

		case 'TypeSelector': {
			return !node.name.includes('|');
		}

		case 'AttributeSelector': {
			return !node.flags && !node.name.name.includes('|');
		}

		default: {
			return false;
		}
	}
};

const canUnwrapSelectorList = selectorList => selectorList.children.every(selector => selector.children.every(node => canUnwrapSelectorNode(node)));

const isRelatedParent = selector => selector.children.every(node => {
	if (node.type === 'AttributeSelector') {
		return !node.name.name.includes('|') && (!node.flags || ['i', 's'].includes(normalizeCssIdentifier(node.flags)));
	}

	return node.type === 'Combinator' || canUnwrapSelectorNode(node) || (
		node.type === 'PseudoClassSelector'
		&& (node.children ? PARENT_FUNCTIONAL_PSEUDO_CLASSES : PARENT_PSEUDO_CLASSES).has(normalizeCssIdentifier(node.name))
	);
}) && !find(selector, node => node.type === 'NestingSelector' || node.type === 'Raw');

const getCandidate = (selector, sourceCode) => {
	const {children} = selector;
	const leadingArguments = getSelectorList(children[0]);
	if (leadingArguments && children.length > 1) {
		const innerNodes = children.slice(isDescendantCombinator(children[1]) ? 2 : 1);
		let prefix = '';
		if (children[1].type !== 'Combinator') {
			prefix = '&';
		} else if (innerNodes[0].type === 'TypeSelector') {
			// Explicit nesting avoids interpreting a leading type selector as a declaration.
			prefix = '& ';
		}

		return {
			node: children[0],
			outerNodes: normalizeCssIdentifier(children[0].name) === 'is' && canUnwrapSelectorList(leadingArguments) ? leadingArguments.children : [children[0]],
			inner: prefix + getNodesText(innerNodes, sourceCode),
		};
	}

	const groupIndex = children.findLastIndex((node, index) => index > 0 && (index > 1 || children[index - 1].type !== 'Combinator') && getSelectorList(node));
	if (groupIndex === -1) {
		return;
	}

	const group = children[groupIndex];
	const hasCombinator = children[groupIndex - 1].type === 'Combinator';
	const parentEnd = groupIndex - (hasCombinator ? 1 : 0);
	const isDescendant = isDescendantCombinator(children[groupIndex - 1]);
	let innerNodes = children.slice(isDescendant || !hasCombinator ? groupIndex : parentEnd);
	if (groupIndex === children.length - 1 && isDescendant && normalizeCssIdentifier(group.name) === 'is') {
		// Unlike :is(), a nested selector list gives each branch its own specificity.
		const argumentsList = getSelectorList(group);
		const specificities = argumentsList.children.map(argument => getRuleSelectorSpecificity(argument, [0, 0, 0]));
		const hasEqualSpecificity = specificities.every(specificity => compareSpecificity(specificity, specificities[0]) === 0);
		innerNodes = hasEqualSpecificity && canUnwrapSelectorList(argumentsList) ? argumentsList.children : [group];
	}

	return {
		node: group,
		outerNodes: children.slice(0, parentEnd),
		inner: (hasCombinator ? '' : '&') + getNodesText(innerNodes, sourceCode),
	};
};

const getNodesText = (nodes, sourceCode) => sourceCode.text.slice(sourceCode.getRange(nodes[0])[0], sourceCode.getRange(nodes.at(-1))[1]);

const getIndentation = (rule, sourceCode) => {
	const [ruleStart] = sourceCode.getRange(rule);
	const indentation = sourceCode.text.slice(ruleStart - sourceCode.getLoc(rule).start.column + 1, ruleStart);
	const content = sourceCode.getText(rule.block).slice(1, -1);
	const bodyIndentation = content.match(/(?:\r\n|[\n\f\r])([\t ]*)[^\t\n\f\r ]/u)?.[1];
	if (!/^[\t ]*$/u.test(indentation) || !bodyIndentation?.startsWith(indentation) || bodyIndentation.length <= indentation.length) {
		return;
	}

	return {indentation, indentationStep: bodyIndentation.slice(indentation.length)};
};

const getNestedContent = ({rule, inner, blockNode = rule.block, blockText}, context) => {
	const {sourceCode} = context;
	const ruleText = sourceCode.getText(rule);
	if (hasCommentInRange(context, sourceCode.getRange(rule)) || /\\[\da-f]{0,6}[\n\f\r]/iu.test(ruleText)) {
		return;
	}

	const block = blockText ?? sourceCode.getText(blockNode);
	const lineBreak = ruleText.match(/\r\n|[\n\f\r]/u)?.[0];
	if (!lineBreak) {
		return ` ${inner} ${block} `;
	}

	// Reindenting raw values can change their text, including custom property values.
	if (find(rule.block, node => node.type === 'Raw' && sourceCode.getLoc(node).start.line !== sourceCode.getLoc(node).end.line)) {
		return;
	}

	const formatting = getIndentation(rule, sourceCode);
	if (!formatting) {
		return;
	}

	const {indentation, indentationStep} = formatting;
	if (rule.type === 'Atrule') {
		for (const child of rule.block.children) {
			const childFormatting = getIndentation(child, sourceCode);
			if (!childFormatting || childFormatting.indentation !== indentation + indentationStep || childFormatting.indentationStep !== indentationStep) {
				return;
			}
		}
	}

	const indentedInner = inner.replaceAll(/(\r\n|[\n\f\r])(?=[\t ]*[^\t\n\f\r ])/gu, lineBreak => lineBreak + indentationStep);
	const indentedBlock = blockNode === rule.block ? block.replaceAll(/(\r\n|[\n\f\r])(?=[\t ]*[^\t\n\f\r ])/gu, lineBreak => lineBreak + indentationStep) : block;
	return `${lineBreak}${indentation}${indentationStep}${indentedInner} ${indentedBlock}${lineBreak}${indentation}`;
};

const getSingleSelector = rule => rule?.type === 'Rule' && rule.prelude?.type === 'SelectorList' && rule.prelude.children.length === 1
	? rule.prelude.children.at(0)
	: undefined;

const isSameSelectorNode = (first, second, sourceCode) => first.type === second.type && (first.type === 'Combinator'
	? first.name === second.name
	: sourceCode.getText(first) === sourceCode.getText(second));

const getSharedParent = (selectors, sourceCode) => {
	if (selectors.length < 2 || selectors.some(selector => !selector)) {
		return;
	}

	const [first, ...others] = selectors;
	const children = [];
	for (const [index, node] of first.children.entries()) {
		if (others.some(selector => index >= selector.children.length || !isSameSelectorNode(node, selector.children[index], sourceCode))) {
			break;
		}

		children.push(node);
	}

	if (children.at(-1)?.type === 'Combinator') {
		children.pop();
	}

	const selector = {type: 'Selector', children};
	if (children.length > 0 && selectors.every(selector => children.length < selector.children.length) && isRelatedParent(selector) && canBeRepresentedByNestingSelector(selector, false)) {
		return selector;
	}
};

const canUseRelatedSelector = selector => canMatchSelector(selector) && !find(selector, node => node.type === 'NestingSelector' || node.type === 'Raw');

const getRelatedSelectorText = (parentSelector, selectorList, sourceCode) => {
	if (selectorList?.type !== 'SelectorList') {
		return;
	}

	const parentNodes = parentSelector.children;
	let result = '';
	let previousEnd = sourceCode.getRange(selectorList)[0];
	for (const selector of selectorList.children) {
		if (
			selector.children.length <= parentNodes.length
			|| parentNodes.some((node, index) => !isSameSelectorNode(node, selector.children[index], sourceCode))
			|| !canUseRelatedSelector(selector)
		) {
			return;
		}

		const suffix = selector.children[parentNodes.length];
		const innerNodes = selector.children.slice(parentNodes.length + (isDescendantCombinator(suffix) ? 1 : 0));
		result += sourceCode.text.slice(previousEnd, sourceCode.getRange(selector)[0]) + (suffix.type === 'Combinator' ? '& ' : '&') + getNodesText(innerNodes, sourceCode);
		previousEnd = sourceCode.getRange(selector)[1];
	}

	return result || undefined;
};

const getContextSelectorText = (parentSelector, rule, context) => {
	if (rule.prelude?.type !== 'SelectorList' || parentSelector.children.some(node => node.type === 'Combinator') || hasAncestorStyleRule(rule, context)) {
		return;
	}

	const {sourceCode} = context;
	const parentNodes = parentSelector.children;
	let result = '';
	let previousEnd = sourceCode.getRange(rule.prelude)[0];
	for (const selector of rule.prelude.children) {
		const parentStart = selector.children.length - parentNodes.length;
		const combinator = selector.children[parentStart - 1];
		if (
			combinator?.type !== 'Combinator'
			|| parentNodes.some((node, index) => !isSameSelectorNode(node, selector.children[parentStart + index], sourceCode))
			|| !canUseRelatedSelector(selector)
		) {
			return;
		}

		const prefixNodes = selector.children.slice(0, parentStart - (isDescendantCombinator(combinator) ? 1 : 0));
		result += sourceCode.text.slice(previousEnd, sourceCode.getRange(selector)[0]) + getNodesText(prefixNodes, sourceCode) + ' &';
		previousEnd = sourceCode.getRange(selector)[1];
	}

	return result || undefined;
};

const getRelatedRule = (parentSelector, rule, context) => {
	const {sourceCode} = context;
	if (rule.type === 'Rule') {
		const inner = getRelatedSelectorText(parentSelector, rule.prelude, sourceCode) ?? getContextSelectorText(parentSelector, rule, context);
		return inner === undefined ? undefined : {rule, inner};
	}

	if (rule.type !== 'Atrule' || !rule.block?.children.length) {
		return;
	}

	const name = normalizeCssIdentifier(rule.name);
	if (!['media', 'supports', 'container', 'layer', 'starting-style'].includes(name)) {
		return;
	}

	const childRule = rule.block.children.at(0);
	const selector = rule.block.children.length === 1 ? getSingleSelector(childRule) : undefined;
	const inner = sourceCode.text.slice(sourceCode.getRange(rule)[0], sourceCode.getRange(rule.block)[0]).trimEnd();
	if (selector && sourceCode.getText(selector) === getNodesText(parentSelector.children, sourceCode)) {
		// Nested @container, @supports, and @starting-style blocks must remain declaration-only for the parser.
		if (['container', 'supports', 'starting-style'].includes(name) && childRule.block.children.some(node => node.type !== 'Declaration')) {
			return;
		}

		return {rule, inner, blockNode: childRule.block};
	}

	if (!['media', 'layer'].includes(name)) {
		return;
	}

	const [blockStart, blockEnd] = sourceCode.getRange(rule.block);
	let previousEnd = blockStart;
	let blockText = '';
	for (const child of rule.block.children) {
		if (child.type !== 'Rule') {
			return;
		}

		const relativeSelector = getRelatedSelectorText(parentSelector, child.prelude, sourceCode);
		if (relativeSelector === undefined) {
			return;
		}

		const [selectorStart, selectorEnd] = sourceCode.getRange(child.prelude);
		blockText += sourceCode.text.slice(previousEnd, selectorStart) + relativeSelector;
		previousEnd = selectorEnd;
	}

	blockText += sourceCode.text.slice(previousEnd, blockEnd);
	return {rule, inner, blockText};
};

const getMergedReplacement = (parentRule, parentSelector, relatedRules, context) => {
	const {sourceCode} = context;
	const range = [sourceCode.getRange(parentRule)[0], sourceCode.getRange(relatedRules.at(-1).rule)[1]];
	if (hasCommentInRange(context, range)) {
		return;
	}

	const hasExistingParent = relatedRules[0].rule !== parentRule;
	const lastChild = hasExistingParent ? parentRule.block.children.at(-1) : undefined;
	if (lastChild && !lastChild.block) {
		if (lastChild.type !== 'Declaration') {
			return;
		}

		const terminator = sourceCode.text.slice(sourceCode.getRange(lastChild)[1], sourceCode.getRange(parentRule.block)[1] - 1);
		if (!terminator.trimStart().startsWith(';')) {
			return;
		}
	}

	const parentText = sourceCode.getText(parentRule);
	const isMultiline = /[\n\f\r]/u.test(parentText);
	const parentFormatting = isMultiline ? getIndentation(parentRule, sourceCode) : undefined;
	let replacement = hasExistingParent ? parentText.slice(0, -1) : `${getNodesText(parentSelector.children, sourceCode)} {`;
	for (const relatedRule of relatedRules) {
		const {rule} = relatedRule;
		const childIsMultiline = /[\n\f\r]/u.test(sourceCode.getText(rule));
		const childFormatting = childIsMultiline ? getIndentation(rule, sourceCode) : undefined;
		if (
			isMultiline !== childIsMultiline
			|| (isMultiline && (
				!parentFormatting
				|| !childFormatting
				|| parentFormatting.indentation !== childFormatting.indentation
				|| parentFormatting.indentationStep !== childFormatting.indentationStep
			))
		) {
			return;
		}

		const content = getNestedContent(relatedRule, context);
		if (content === undefined) {
			return;
		}

		replacement = replacement.replace(/[\t\n\f\r ]+$/u, '') + content;
	}

	return `${replacement}}`;
};

const getRelatedRules = (children, startIndex, parentSelector, context) => {
	const relatedRules = [];
	for (let index = startIndex; index < children.length; index++) {
		const rule = children[index];
		const relatedRule = getRelatedRule(parentSelector, rule, context);
		if (relatedRule === undefined) {
			break;
		}

		relatedRules.push(relatedRule);
	}

	return relatedRules;
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	if (sourceCode.ast.children.some(node => node.type === 'Atrule' && normalizeCssIdentifier(node.name) === 'namespace')) {
		return;
	}

	const mergedRules = new WeakSet();
	context.on(['StyleSheet', 'Block'], function * (container) {
		for (let index = 0; index < container.children.length - 1; index++) {
			const parentRule = container.children[index];
			let parentSelector = getSingleSelector(parentRule);
			if (
				!parentSelector
				|| mergedRules.has(parentRule)
				|| !isStyleRule(parentRule, context)
				|| hasScopeAncestor(parentRule, context)
			) {
				continue;
			}

			let relatedRules = isRelatedParent(parentSelector) && canBeRepresentedByNestingSelector(parentSelector, false)
				? getRelatedRules(container.children, index + 1, parentSelector, context)
				: [];
			if (relatedRules.length === 0) {
				parentSelector = getSharedParent([parentSelector, getSingleSelector(container.children[index + 1])], sourceCode);
				if (!parentSelector) {
					continue;
				}

				relatedRules = getRelatedRules(container.children, index, parentSelector, context);
				if (relatedRules.length < 2) {
					continue;
				}
			}

			// Prefer merging adjacent rules over reporting their selectors separately.
			mergedRules.add(parentRule);
			for (const {rule} of relatedRules) {
				for (const child of rule.type === 'Rule' ? [rule] : rule.block.children) {
					mergedRules.add(child);
				}
			}

			const hasExistingParent = relatedRules[0].rule !== parentRule;
			const reportedRule = relatedRules[hasExistingParent ? 0 : 1].rule;
			const replacement = getMergedReplacement(parentRule, parentSelector, relatedRules, context);
			yield {
				node: reportedRule.prelude ?? reportedRule,
				messageId: MESSAGE_ID_RELATED_RULES,
				/**
				@param {Parameters<CssicornRuleFixer>[0]} fixer
				*/
				fix: replacement === undefined ? undefined : fixer => fixer.replaceTextRange([sourceCode.getRange(parentRule)[0], sourceCode.getRange(relatedRules.at(-1).rule)[1]], replacement),
			};
			index += relatedRules.length - (hasExistingParent ? 0 : 1);
		}
	});

	context.on('Rule', rule => {
		if (rule.prelude?.type !== 'SelectorList' || mergedRules.has(rule) || !isStyleRule(rule, context) || hasScopeAncestor(rule, context)) {
			return;
		}

		let candidate;
		if (rule.prelude.children.length === 1) {
			const [selector] = rule.prelude.children;
			candidate = getCandidate(selector, sourceCode);
			if (!candidate || !canMatchSelector(selector) || find(selector, node => node.type === 'NestingSelector' || hasNestingSelectorInRawArgument(node))) {
				return;
			}
		} else {
			const parent = getSharedParent(rule.prelude.children, sourceCode);
			const inner = parent && getRelatedSelectorText(parent, rule.prelude, sourceCode);
			if (!inner) {
				return;
			}

			candidate = {node: rule.prelude, outerNodes: parent.children, inner};
		}

		const content = getNestedContent({rule, inner: candidate.inner}, context);
		const replacement = content === undefined ? undefined : `${getNodesText(candidate.outerNodes, sourceCode)} {${content}}`;
		return {
			node: candidate.node,
			messageId: candidate.node.type === 'PseudoClassSelector' ? MESSAGE_ID : MESSAGE_ID_RELATED_RULES,
			data: candidate.node.type === 'PseudoClassSelector' ? {name: normalizeCssIdentifier(candidate.node.name)} : undefined,
			/**
			@param {Parameters<CssicornRuleFixer>[0]} fixer
			*/
			fix: replacement === undefined ? undefined : fixer => fixer.replaceText(rule, replacement),
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
			description: 'Prefer CSS nesting for related rules and selector groups.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
