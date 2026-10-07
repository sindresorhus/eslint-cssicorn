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

const hasUnsupportedNestingSelector = selector => Boolean(find(selector, node => (node.type === 'NestingSelector' && node !== selector.children.at(0)) || hasNestingSelectorInRawArgument(node)));

const isBareNestingSelector = nodes => nodes.length === 1 && nodes[0].type === 'NestingSelector';

const isRelatedParent = selector => !isBareNestingSelector(selector.children) && selector.children.every((node, index) => {
	if (node.type === 'AttributeSelector') {
		return !node.name.name.includes('|') && (!node.flags || ['i', 's'].includes(normalizeCssIdentifier(node.flags)));
	}

	return (node.type === 'NestingSelector' && index === 0) || node.type === 'Combinator' || canUnwrapSelectorNode(node) || (
		node.type === 'PseudoClassSelector'
		&& (node.children ? PARENT_FUNCTIONAL_PSEUDO_CLASSES : PARENT_PSEUDO_CLASSES).has(normalizeCssIdentifier(node.name))
	);
}) && !hasUnsupportedNestingSelector(selector) && !find(selector, node => node.type === 'Raw');

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

const getConditionalBlock = (rule, nestedRules, context, indentationStep) => {
	const {sourceCode} = context;
	const [blockStart, blockEnd] = sourceCode.getRange(rule.block);
	let previousEnd = blockStart;
	let block = '';
	for (const nestedRule of nestedRules) {
		let content = getNestedContent(nestedRule, context);
		if (content === undefined) {
			return;
		}

		if (indentationStep) {
			// Undo the child's added level so the complete retained subtree is indented only once.
			const lineIndentation = /(\r\n|[\n\f\r])([\t ]*)/gu;
			for (const match of content.matchAll(lineIndentation)) {
				if (match[2] && !match[2].startsWith(indentationStep)) {
					return;
				}
			}

			content = content.replaceAll(lineIndentation, (match, lineBreak, indentation) => lineBreak + indentation.slice(indentationStep.length));
		}

		const [start, end] = sourceCode.getRange(nestedRule.rule);
		block += sourceCode.text.slice(previousEnd, start) + content.trim();
		previousEnd = end;
	}

	return block + sourceCode.text.slice(previousEnd, blockEnd);
};

const getNestedContent = ({rule, inner, blockNode = rule.block, blockText, nestedRules}, context) => {
	const {sourceCode} = context;
	const ruleText = sourceCode.getText(rule);
	if (hasCommentInRange(context, sourceCode.getRange(rule)) || /\\[\da-f]{0,6}[\n\f\r]/iu.test(ruleText)) {
		return;
	}

	let block = blockText ?? sourceCode.getText(blockNode);
	const lineBreak = ruleText.match(/\r\n|[\n\f\r]/u)?.[0];
	if (!lineBreak) {
		if (nestedRules) {
			block = getConditionalBlock(rule, nestedRules, context);
			if (block === undefined) {
				return;
			}
		}

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

	if (nestedRules) {
		block = getConditionalBlock(rule, nestedRules, context, indentationStep);
		if (block === undefined) {
			return;
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
	if (children.length > 0 && selectors.some(selector => children.length < selector.children.length) && isRelatedParent(selector) && canBeRepresentedByNestingSelector(selector, false)) {
		return selector;
	}
};

const getSharedSuffix = (selectors, sourceCode) => {
	if (selectors.length < 2 || selectors.some(selector => !selector || !canUseRelatedSelector(selector) || find(selector, node => node.type === 'NestingSelector'))) {
		return;
	}

	const [first, ...others] = selectors;
	const children = [];
	for (const [index, node] of first.children.toReversed().entries()) {
		if (node.type === 'Combinator' || others.some(selector => !selector.children.at(-index - 1) || !isSameSelectorNode(node, selector.children.at(-index - 1), sourceCode))) {
			break;
		}

		children.unshift(node);
	}

	const selector = {type: 'Selector', children};
	if (children.length > 0 && selectors.some(selector => children.length < selector.children.length) && isRelatedParent(selector) && canBeRepresentedByNestingSelector(selector, false)) {
		return selector;
	}
};

const getParentText = (parents, sourceCode) => getNodesText(parents.flatMap(parent => parent.children), sourceCode);

const canUseRelatedParents = parents => {
	if (parents.some(parent => !(isRelatedParent(parent) && canBeRepresentedByNestingSelector(parent, false)))) {
		return false;
	}

	const specificities = parents.map(parent => getRuleSelectorSpecificity(parent, [0, 0, 0]));
	return specificities.every(specificity => compareSpecificity(specificity, specificities[0]) === 0);
};

const canUseRelatedSelector = selector => canMatchSelector(selector) && !hasUnsupportedNestingSelector(selector) && !find(selector, node => node.type === 'Raw');

const getPrefixedSelectorText = (parentSelector, selector, sourceCode) => {
	const parentNodes = parentSelector.children;
	if (selector.children.length < parentNodes.length || parentNodes.some((node, index) => !isSameSelectorNode(node, selector.children[index], sourceCode))) {
		return;
	}

	const suffix = selector.children[parentNodes.length];
	if (!suffix) {
		return '&';
	}

	const innerNodes = selector.children.slice(parentNodes.length + (isDescendantCombinator(suffix) ? 1 : 0));
	return (suffix.type === 'Combinator' ? '& ' : '&') + getNodesText(innerNodes, sourceCode);
};

const getRelativeSelectorText = (parentSelector, selector, rule, context) => {
	const {sourceCode} = context;
	if (!canUseRelatedSelector(selector)) {
		return;
	}

	const prefixed = getPrefixedSelectorText(parentSelector, selector, sourceCode);
	if (prefixed !== undefined) {
		return prefixed;
	}

	const parentNodes = parentSelector.children;
	if (parentNodes.some(node => node.type === 'Combinator') || hasAncestorStyleRule(rule, context) || find(selector, node => node.type === 'NestingSelector')) {
		return;
	}

	const terminalStart = selector.children.findLastIndex(node => node.type === 'Combinator') + 1;
	let parentStart = terminalStart;
	const matchesAt = start => selector.children.length >= start + parentNodes.length && parentNodes.every((node, index) => isSameSelectorNode(node, selector.children[start + index], sourceCode));
	if (!matchesAt(parentStart)) {
		parentStart = selector.children.length - parentNodes.length;
		if (parentStart < terminalStart || !matchesAt(parentStart)) {
			return;
		}
	}

	const previous = selector.children[parentStart - 1];
	const prefixNodes = selector.children.slice(0, parentStart - (isDescendantCombinator(previous) ? 1 : 0));
	if (prefixNodes.length === 0) {
		return;
	}

	const suffixNodes = selector.children.slice(parentStart + parentNodes.length);
	const prefix = getNodesText(prefixNodes, sourceCode);
	const suffix = suffixNodes.length > 0 ? getNodesText(suffixNodes, sourceCode) : '';
	if (prefixNodes[0].type === 'TypeSelector' && prefixNodes.length > 1) {
		if (previous.type === 'Combinator' || prefixNodes.some(node => node.type === 'Combinator')) {
			return;
		}

		// Keep & immediately after a leading type so the parser recognizes a selector before any pseudo-class.
		const typeText = sourceCode.getText(prefixNodes[0]);
		return `${typeText}&${prefix.slice(typeText.length)}${suffix}`;
	}

	return prefix + (previous.type === 'Combinator' ? ' &' : '&') + suffix;
};

const getGroupedSelectorText = (parents, rule, sourceCode) => {
	const groups = parents.map(() => new Set());
	const innerSelectors = new Set();
	for (const selector of rule.prelude.children) {
		if (!canUseRelatedSelector(selector)) {
			return;
		}

		const matches = parents.map(parent => getPrefixedSelectorText(parent, selector, sourceCode));
		const matchingIndices = matches.map((match, index) => match === undefined ? undefined : index).filter(index => index !== undefined);
		if (matchingIndices.length !== 1) {
			return;
		}

		const [index] = matchingIndices;
		groups[index].add(matches[index]);
		innerSelectors.add(matches[index]);
	}

	if (
		innerSelectors.size === 0
		|| (innerSelectors.size === 1 && innerSelectors.has('&'))
		|| groups.some(group => group.size !== innerSelectors.size || [...innerSelectors].some(selector => !group.has(selector)))
	) {
		return;
	}

	return [...innerSelectors].join(', ');
};

const getRelatedSelectorText = (parents, rule, context) => {
	if (rule.prelude?.type !== 'SelectorList') {
		return;
	}

	if (parents.length > 1) {
		return getGroupedSelectorText(parents, rule, context.sourceCode);
	}

	const [parentSelector] = parents;
	const innerSelectors = rule.prelude.children.map(selector => getRelativeSelectorText(parentSelector, selector, rule, context));
	if (innerSelectors.includes(undefined) || innerSelectors.every(selector => selector === '&')) {
		return;
	}

	const {sourceCode} = context;
	let result = '';
	let previousEnd = sourceCode.getRange(rule.prelude)[0];
	for (const [index, selector] of rule.prelude.children.entries()) {
		result += sourceCode.text.slice(previousEnd, sourceCode.getRange(selector)[0]) + innerSelectors[index];
		previousEnd = sourceCode.getRange(selector)[1];
	}

	return result;
};

// Discovery follows single-child grouping chains, retaining every wrapper.
const getSingleStyleRule = rule => {
	let child = rule;
	while (child?.type === 'Atrule' && ['media', 'supports', 'container', 'layer', 'starting-style'].includes(normalizeCssIdentifier(child.name)) && child.block?.children.length === 1) {
		[child] = child.block.children;
	}

	return child?.type === 'Rule' ? child : undefined;
};

const getSelectors = rule => rule?.prelude?.type === 'SelectorList' ? rule.prelude.children : undefined;

function * getRelatedStyleRules(rule) {
	if (rule.type === 'Rule') {
		yield rule;
		return;
	}

	for (const child of rule.block.children) {
		yield * getRelatedStyleRules(child);
	}
}

const getRelatedBlockText = (parents, rule, context) => {
	const {sourceCode} = context;
	const [blockStart, blockEnd] = sourceCode.getRange(rule.block);
	let previousEnd = blockStart;
	let blockText = '';
	for (const child of rule.block.children) {
		if (child.type !== 'Rule') {
			return;
		}

		const relativeSelector = getRelatedSelectorText(parents, child, context);
		if (relativeSelector === undefined) {
			return;
		}

		const [selectorStart, selectorEnd] = sourceCode.getRange(child.prelude);
		blockText += sourceCode.text.slice(previousEnd, selectorStart) + relativeSelector;
		previousEnd = selectorEnd;
	}

	return blockText + sourceCode.text.slice(previousEnd, blockEnd);
};

const getRelatedRule = (parents, rule, context, canNestStyleRules = true) => {
	const {sourceCode} = context;
	if (rule.type === 'Rule') {
		const inner = canNestStyleRules ? getRelatedSelectorText(parents, rule, context) : undefined;
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
	const selectors = rule.block.children.length === 1 ? getSelectors(childRule) : undefined;
	canNestStyleRules &&= ['media', 'layer'].includes(name);
	const inner = sourceCode.text.slice(sourceCode.getRange(rule)[0], sourceCode.getRange(rule.block)[0]).trimEnd();
	if (selectors && getParentText(selectors, sourceCode) === getParentText(parents, sourceCode)) {
		// Nested @container, @supports, and @starting-style blocks must remain declaration-only for the parser.
		if (!canNestStyleRules && childRule.block.children.some(node => node.type !== 'Declaration')) {
			return;
		}

		return {rule, inner, blockNode: childRule.block};
	}

	if (rule.block.children.some(child => child.type === 'Atrule')) {
		const nestedRules = rule.block.children.map(child => getRelatedRule(parents, child, context, canNestStyleRules));
		return nestedRules.includes(undefined) ? undefined : {rule, inner, nestedRules};
	}

	if (!canNestStyleRules) {
		return;
	}

	const blockText = getRelatedBlockText(parents, rule, context);
	return blockText === undefined ? undefined : {rule, inner, blockText};
};

const getMergedReplacement = (parentRule, parents, relatedRules, context) => {
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
	let replacement = hasExistingParent ? parentText.slice(0, -1) : `${getParentText(parents, sourceCode)} {`;
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

const getRelatedRules = (children, startIndex, parents, context) => {
	const relatedRules = [];
	for (let index = startIndex; index < children.length; index++) {
		const rule = children[index];
		const relatedRule = getRelatedRule(parents, rule, context);
		if (relatedRule === undefined) {
			break;
		}

		relatedRules.push(relatedRule);
	}

	return relatedRules;
};

const getConditionalRules = (children, startIndex, parents, context) => {
	const {sourceCode} = context;
	const relatedRules = [];
	for (let index = startIndex; index < children.length; index++) {
		const rule = children[index];
		const selectors = rule.type === 'Atrule' ? getSelectors(getSingleStyleRule(rule)) : undefined;
		if (!selectors || getParentText(selectors, sourceCode) !== getParentText(parents, sourceCode)) {
			break;
		}

		const relatedRule = getRelatedRule(parents, rule, context);
		if (!relatedRule) {
			break;
		}

		relatedRules.push(relatedRule);
	}

	return relatedRules;
};

const getMergeCandidate = (children, index, selectors, context) => {
	const {sourceCode} = context;
	const parentRule = children[index];
	let parents = selectors;
	let relatedRules;
	if (parentRule.type === 'Atrule') {
		if (!canUseRelatedParents(parents)) {
			return;
		}

		relatedRules = getConditionalRules(children, index, parents, context);
		if (relatedRules.length < 2) {
			return;
		}
	} else {
		relatedRules = canUseRelatedParents(parents) ? getRelatedRules(children, index + 1, parents, context) : [];
		if (relatedRules.length === 0) {
			if (selectors.length !== 1) {
				return;
			}

			const nextSelector = getSingleSelector(getSingleStyleRule(children[index + 1]));
			const pair = [selectors[0], nextSelector];
			const sharedParent = getSharedParent(pair, sourceCode) ?? (hasAncestorStyleRule(parentRule, context) ? undefined : getSharedSuffix(pair, sourceCode));
			if (!sharedParent || pair.some(selector => selector.children.length === sharedParent.children.length)) {
				return;
			}

			parents = [sharedParent];
			relatedRules = getRelatedRules(children, index, parents, context);
			if (relatedRules.length < 2) {
				return;
			}
		}
	}

	return {parents, relatedRules};
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
			const selectorRule = getSingleStyleRule(parentRule);
			const selectors = getSelectors(selectorRule);
			if (
				!selectors?.length
				|| mergedRules.has(selectorRule)
				|| !isStyleRule(selectorRule, context)
				|| hasScopeAncestor(selectorRule, context)
			) {
				continue;
			}

			const candidate = getMergeCandidate(container.children, index, selectors, context);
			if (!candidate) {
				continue;
			}

			const {parents, relatedRules} = candidate;

			// Prefer merging adjacent rules over reporting their selectors separately.
			mergedRules.add(parentRule);
			for (const {rule} of relatedRules) {
				for (const child of getRelatedStyleRules(rule)) {
					mergedRules.add(child);
				}
			}

			const hasExistingParent = relatedRules[0].rule !== parentRule;
			const reportedRule = relatedRules[hasExistingParent ? 0 : 1].rule;
			const replacement = getMergedReplacement(parentRule, parents, relatedRules, context);
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
			if (!candidate || !canMatchSelector(selector) || hasUnsupportedNestingSelector(selector) || isBareNestingSelector(candidate.outerNodes)) {
				return;
			}
		} else {
			const parent = getSharedParent(rule.prelude.children, sourceCode) ?? (hasAncestorStyleRule(rule, context) ? undefined : getSharedSuffix(rule.prelude.children, sourceCode));
			const inner = parent && getRelatedSelectorText([parent], rule, context);
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
