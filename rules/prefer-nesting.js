import {find, lexer} from '@eslint/css-tree';
import {
	canBeRepresentedByNestingSelector,
	canMatchSelector,
	compareSpecificity,
	getRuleSelectorSpecificity,
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

const getCandidate = selector => {
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
			innerNodes,
			prefix,
		};
	}

	const groupIndex = children.findLastIndex((node, index) => index >= 2 && children[index - 1].type === 'Combinator' && getSelectorList(node));
	if (groupIndex === -1) {
		return;
	}

	const group = children[groupIndex];
	const combinatorIndex = groupIndex - 1;
	const isDescendant = isDescendantCombinator(children[combinatorIndex]);
	let innerNodes = children.slice(isDescendant ? groupIndex : combinatorIndex);
	if (groupIndex === children.length - 1 && isDescendant && normalizeCssIdentifier(group.name) === 'is') {
		// Unlike :is(), a nested selector list gives each branch its own specificity.
		const argumentsList = getSelectorList(group);
		const specificities = argumentsList.children.map(argument => getRuleSelectorSpecificity(argument, [0, 0, 0]));
		const hasEqualSpecificity = specificities.every(specificity => compareSpecificity(specificity, specificities[0]) === 0);
		innerNodes = hasEqualSpecificity && canUnwrapSelectorList(argumentsList) ? argumentsList.children : [group];
	}

	return {
		node: group,
		outerNodes: children.slice(0, combinatorIndex),
		innerNodes,
		prefix: '',
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

const getNestedContent = (rule, inner, context) => {
	const {sourceCode} = context;
	const ruleText = sourceCode.getText(rule);
	if (hasCommentInRange(context, sourceCode.getRange(rule)) || /\\[\da-f]{0,6}[\n\f\r]/iu.test(ruleText)) {
		return;
	}

	const blockNode = rule.type === 'Atrule' ? rule.block.children.at(0).block : rule.block;
	const block = sourceCode.getText(blockNode);
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
		const childFormatting = getIndentation(rule.block.children.at(0), sourceCode);
		if (!childFormatting || childFormatting.indentation !== indentation + indentationStep || childFormatting.indentationStep !== indentationStep) {
			return;
		}
	}

	const indentedInner = inner.replaceAll(/(\r\n|[\n\f\r])(?=[\t ]*[^\t\n\f\r ])/gu, lineBreak => lineBreak + indentationStep);
	const indentedBlock = rule.type === 'Atrule' ? block : block.replaceAll(/(\r\n|[\n\f\r])(?=[\t ]*[^\t\n\f\r ])/gu, lineBreak => lineBreak + indentationStep);
	return `${lineBreak}${indentation}${indentationStep}${indentedInner} ${indentedBlock}${lineBreak}${indentation}`;
};

const getSingleSelector = rule => rule?.type === 'Rule' && rule.prelude?.type === 'SelectorList' && rule.prelude.children.length === 1
	? rule.prelude.children.at(0)
	: undefined;

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
			|| parentNodes.some((node, index) => {
				const childNode = selector.children[index];
				return node.type !== childNode.type || (node.type === 'Combinator' ? node.name !== childNode.name : sourceCode.getText(node) !== sourceCode.getText(childNode));
			})
			|| !canMatchSelector(selector)
			|| find(selector, node => node.type === 'NestingSelector' || node.type === 'Raw')
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

const getRelatedHeader = (parentSelector, rule, sourceCode) => {
	if (rule.type === 'Rule') {
		return getRelatedSelectorText(parentSelector, rule.prelude, sourceCode);
	}

	if (
		rule.type !== 'Atrule'
		|| !['media', 'supports', 'container', 'layer'].includes(normalizeCssIdentifier(rule.name))
		|| rule.block?.children.length !== 1
	) {
		return;
	}

	const selector = getSingleSelector(rule.block.children.at(0));
	if (!selector || sourceCode.getText(selector) !== sourceCode.getText(parentSelector)) {
		return;
	}

	// The parser cannot reliably parse nested rules inside a nested @container block.
	if (normalizeCssIdentifier(rule.name) === 'container' && rule.block.children.at(0).block.children.some(node => node.type !== 'Declaration')) {
		return;
	}

	return sourceCode.text.slice(sourceCode.getRange(rule)[0], sourceCode.getRange(rule.block)[0]).trimEnd();
};

const getMergedReplacement = (parentRule, relatedRules, context) => {
	const {sourceCode} = context;
	const range = [sourceCode.getRange(parentRule)[0], sourceCode.getRange(relatedRules.at(-1).rule)[1]];
	if (hasCommentInRange(context, range)) {
		return;
	}

	const lastChild = parentRule.block.children.at(-1);
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
	let replacement = parentText.slice(0, -1);
	for (const {rule, inner} of relatedRules) {
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

		const content = getNestedContent(rule, inner, context);
		if (content === undefined) {
			return;
		}

		replacement = replacement.replace(/[\t\n\f\r ]+$/u, '') + content;
	}

	return `${replacement}}`;
};

const getRelatedRules = (children, startIndex, parentSelector, sourceCode) => {
	const relatedRules = [];
	for (let index = startIndex; index < children.length; index++) {
		const rule = children[index];
		const inner = getRelatedHeader(parentSelector, rule, sourceCode);
		if (inner === undefined) {
			break;
		}

		relatedRules.push({rule, inner});
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

	context.on(['StyleSheet', 'Block'], function * (container) {
		for (let index = 0; index < container.children.length - 1; index++) {
			const parentRule = container.children[index];
			const parentSelector = getSingleSelector(parentRule);
			if (
				!parentSelector
				|| !isRelatedParent(parentSelector)
				|| !canBeRepresentedByNestingSelector(parentSelector, false)
				|| !isStyleRule(parentRule, context)
				|| hasScopeAncestor(parentRule, context)
			) {
				continue;
			}

			const relatedRules = getRelatedRules(container.children, index + 1, parentSelector, sourceCode);
			if (relatedRules.length === 0) {
				continue;
			}

			const replacement = getMergedReplacement(parentRule, relatedRules, context);
			yield {
				node: relatedRules[0].rule.prelude ?? relatedRules[0].rule,
				messageId: MESSAGE_ID_RELATED_RULES,
				/**
				@param {Parameters<CssicornRuleFixer>[0]} fixer
				*/
				fix: replacement === undefined ? undefined : fixer => fixer.replaceTextRange([sourceCode.getRange(parentRule)[0], sourceCode.getRange(relatedRules.at(-1).rule)[1]], replacement),
			};
			index += relatedRules.length;
		}
	});

	context.on('Rule', rule => {
		if (rule.prelude?.type !== 'SelectorList' || rule.prelude.children.length !== 1 || !isStyleRule(rule, context)) {
			return;
		}

		const [selector] = rule.prelude.children;
		const candidate = getCandidate(selector);
		if (!candidate || !canMatchSelector(selector) || hasScopeAncestor(rule, context) || find(selector, node => node.type === 'NestingSelector' || hasNestingSelectorInRawArgument(node))) {
			return;
		}

		const content = getNestedContent(rule, `${candidate.prefix}${getNodesText(candidate.innerNodes, sourceCode)}`, context);
		const replacement = content === undefined ? undefined : `${getNodesText(candidate.outerNodes, sourceCode)} {${content}}`;
		return {
			node: candidate.node,
			messageId: MESSAGE_ID,
			data: {name: normalizeCssIdentifier(candidate.node.name)},
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
