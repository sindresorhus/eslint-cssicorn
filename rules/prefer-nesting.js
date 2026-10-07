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

// These ordinary states were supported before native nesting in Chrome, Firefox, and Safari.
const UNWRAPPABLE_PSEUDO_CLASSES = new Set([
	'active',
	'any-link',
	'autofill',
	'checked',
	'default',
	'defined',
	'disabled',
	'empty',
	'enabled',
	'first-child',
	'first-of-type',
	'focus',
	'focus-visible',
	'focus-within',
	'fullscreen',
	'hover',
	'in-range',
	'indeterminate',
	'invalid',
	'last-child',
	'last-of-type',
	'link',
	'modal',
	'only-child',
	'only-of-type',
	'optional',
	'out-of-range',
	'placeholder-shown',
	'read-only',
	'read-write',
	'required',
	'root',
	'target',
	'valid',
]);

const hasNamedNamespace = name => name.includes('|') && !name.startsWith('*|') && !name.startsWith('|');

const isDescendantCombinator = node => node?.type === 'Combinator' && node.name === ' ';

const getSelectorList = node => {
	if (node?.type !== 'PseudoClassSelector' || !['is', 'where'].includes(normalizeCssIdentifier(node.name))) {
		return;
	}

	const argumentsList = node.children?.[0];
	if (argumentsList?.type !== 'SelectorList' || argumentsList.children.length < 2) {
		return;
	}

	return argumentsList;
};

const canUnwrapPseudoClassSelector = node => {
	const name = normalizeCssIdentifier(node.name);
	if (node.children === null) {
		return UNWRAPPABLE_PSEUDO_CLASSES.has(name);
	}

	const argument = node.children?.[0];
	if (name === 'lang') {
		// Lists, quoted ranges, and wildcard matching are outside the legacy grammar.
		return node.children?.length === 1 && argument.type === 'Identifier' && !normalizeCssIdentifier(argument.name).includes('*');
	}

	if (['nth-child', 'nth-last-child', 'nth-of-type', 'nth-last-of-type'].includes(name)) {
		return argument?.type === 'Nth'
			&& !hasNestingSelector(node)
			&& (!argument.selector || (['nth-child', 'nth-last-child'].includes(name) && canUnwrapSelectorList(argument.selector, true)));
	}

	return ['is', 'where', 'not'].includes(name)
		&& argument?.type === 'SelectorList'
		// Retained :where() protects uncertain branches without affecting specificity.
		&& (name === 'where' || (!hasNestingSelector(node) && canUnwrapSelectorList(argument, true)));
};

// Keep uncertain selectors inside :is() to preserve its forgiving selector-list behavior.
const canUnwrapSelectorNode = node => {
	switch (node.type) {
		case 'ClassSelector':
		case 'NestingSelector': {
			return true;
		}

		case 'IdSelector': {
			return Boolean(lexer.matchType('ident', node.name).matched);
		}

		case 'TypeSelector': {
			// The parser cannot read an attached & after an empty type namespace, as in |button&.
			return !hasNamedNamespace(node.name) && !node.name.startsWith('|');
		}

		case 'AttributeSelector': {
			return !hasNamedNamespace(node.name.name) && (!node.flags || (Boolean(node.matcher) && normalizeCssIdentifier(node.flags) === 'i'));
		}

		case 'PseudoClassSelector': {
			return canUnwrapPseudoClassSelector(node);
		}

		default: {
			return false;
		}
	}
};

const canUnwrapSelectorList = (selectorList, allowCombinators = false) => selectorList.children.every(selector => canBeRepresentedByNestingSelector(selector, false)
	&& selector.children.every(node => canUnwrapSelectorNode(node) || (allowCombinators && node.type === 'Combinator' && [' ', '>', '+', '~'].includes(node.name))));

const hasNestingSelector = node => Boolean(find(node, child => child.type === 'NestingSelector' || hasNestingSelectorInRawArgument(child)));

const isBareNestingSelector = nodes => nodes.length === 1 && nodes[0].type === 'NestingSelector';

const isRelatedParent = selector => !isBareNestingSelector(selector.children) && selector.children.every(node => {
	if (node.type === 'AttributeSelector') {
		return !hasNamedNamespace(node.name.name) && (!node.flags || (Boolean(node.matcher) && ['i', 's'].includes(normalizeCssIdentifier(node.flags))));
	}

	return node.type === 'Combinator' || canUnwrapSelectorNode(node) || (
		node.type === 'PseudoClassSelector'
		&& !['scope', 'visited'].includes(normalizeCssIdentifier(node.name))
	);
}) && !find(selector, node => node.type === 'Raw' || (
	// Older nesting implementations cannot replace a host-argument reference with an ordinary &.
	node.type === 'PseudoClassSelector'
	&& ['host', 'host-context'].includes(normalizeCssIdentifier(node.name))
	&& hasNestingSelector(node)
));

const getGroupSuffixCandidate = (children, groupIndex, sourceCode) => {
	const suffix = children[groupIndex + 1];
	if (!suffix) {
		return;
	}

	const isDescendant = isDescendantCombinator(suffix);
	const innerNodes = children.slice(groupIndex + (isDescendant ? 2 : 1));
	let prefix = '';
	if (suffix.type !== 'Combinator') {
		prefix = '&';
	} else if (isDescendant && (groupIndex > 0 || innerNodes[0].type === 'TypeSelector')) {
		// Explicit nesting avoids interpreting a leading type selector as a declaration.
		prefix = '& ';
	}

	return {
		node: children[groupIndex],
		outerNodes: children.slice(0, groupIndex + 1),
		inner: prefix + getNodesText(innerNodes, sourceCode),
	};
};

const getLeadingGroupCandidate = (children, rule, context) => {
	const {sourceCode} = context;
	const groupIndex = children[0]?.type === 'NestingSelector' && children[1]?.type === 'Combinator'
		? 2
		: (['NestingSelector', 'Combinator'].includes(children[0]?.type) ? 1 : 0);
	const leadingNode = children[groupIndex - 1];
	const group = children[groupIndex];
	const argumentsList = getSelectorList(group);
	const candidate = argumentsList && getGroupSuffixCandidate(children, groupIndex, sourceCode);
	if (!candidate || children.slice(groupIndex + 1).some(node => hasNestingSelector(node))) {
		return;
	}

	// An implicit nesting selector would anchor each complex branch's leftmost compound.
	const hasAncestor = hasAncestorStyleRule(rule, context);
	const allowCombinators = leadingNode ? leadingNode.type === 'NestingSelector' : !hasAncestor || argumentsList.children.every(argument => hasNestingSelector(argument));
	const [firstArgument] = argumentsList.children;
	const firstArgumentHasNestingSelector = hasNestingSelector(firstArgument);
	const canUnwrap = normalizeCssIdentifier(group.name) === 'is'
		&& canUnwrapSelectorList(argumentsList, allowCombinators)
		&& (leadingNode !== undefined || !hasAncestor || argumentsList.children.every(argument => hasNestingSelector(argument) === firstArgumentHasNestingSelector));
	let parentText;
	if (canUnwrap) {
		// The inner selector inherits the list's maximum specificity, just like :is().
		parentText = getNodesText(argumentsList.children, sourceCode);
		if (leadingNode) {
			parentText = argumentsList.children.map(argument => {
				const nodes = argument.children;
				const text = getNodesText(nodes, sourceCode);
				if (leadingNode.type === 'Combinator') {
					const prefixText = sourceCode.text.slice(sourceCode.getRange(children[0])[0], sourceCode.getRange(group)[0]).trimEnd();
					return `${prefixText} ${text}`;
				}

				// The attached & intersects the rightmost compound, after any leading type selector.
				const compoundStart = nodes.findLastIndex(node => node.type === 'Combinator') + 1;
				const firstNode = nodes[compoundStart];
				const insertionOffset = sourceCode.getRange(firstNode)[firstNode.type === 'TypeSelector' ? 1 : 0] - sourceCode.getRange(nodes[0])[0];
				return `${text.slice(0, insertionOffset)}&${text.slice(insertionOffset)}`;
			}).join(', ');
		}
	}

	return {...candidate, parentText};
};

const getCandidate = (selector, rule, context) => {
	const {sourceCode} = context;
	const {children} = selector;
	const leadingCandidate = getLeadingGroupCandidate(children, rule, context);
	if (leadingCandidate) {
		return leadingCandidate;
	}

	const groupIndex = children.findLastIndex(node => getSelectorList(node));
	if (groupIndex === -1) {
		return;
	}

	const group = children[groupIndex];
	const lastReferenceIndex = children.findLastIndex(node => hasNestingSelector(node));
	if (lastReferenceIndex >= groupIndex) {
		// Keep existing & references in their original ancestor context.
		const candidate = getGroupSuffixCandidate(children, lastReferenceIndex, sourceCode);
		return candidate && {...candidate, node: group};
	}

	const hasCombinator = children[groupIndex - 1]?.type === 'Combinator';
	const parentEnd = groupIndex - (hasCombinator ? 1 : 0);
	if (parentEnd === 0) {
		return;
	}

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
	if (
		children.length > 0
		&& selectors.some(selector => children.length < selector.children.length)
		// A shared prefix must retain every original ancestor reference.
		&& selectors.every(selector => selector.children.slice(children.length).every(node => !hasNestingSelector(node)))
		&& isRelatedParent(selector)
		&& canBeRepresentedByNestingSelector(selector)
	) {
		return selector;
	}
};

const getSharedSuffix = (selectors, sourceCode) => {
	if (selectors.length < 2 || selectors.some(selector => !selector || !canUseRelatedSelector(selector))) {
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

const getParentText = (parents, sourceCode) => parents.map(parent => getNodesText(parent.children, sourceCode)).join(', ');

// For eligible grouped parents, implicit nesting contributes once and each direct & contributes separately; :where() references contribute nothing.
const getInheritedSpecificityCount = selector => {
	const hasImplicitNestingSelector = selector.children.at(0)?.type === 'Combinator' || !hasNestingSelector(selector);
	return selector.children.filter(node => node.type === 'NestingSelector').length + Number(hasImplicitNestingSelector);
};

const canUseRelatedParents = parents => {
	// Uncertain branches can change computed specificity, so keep them in a single parent.
	if (
		(parents.length > 1 && parents.some(parent => parent.children.some(node => node.type !== 'Combinator' && !canUnwrapSelectorNode(node))))
		|| parents.some(parent => !(isRelatedParent(parent) && canBeRepresentedByNestingSelector(parent)))
	) {
		return false;
	}

	const specificities = parents.map(parent => getRuleSelectorSpecificity(parent, [0, 0, 0]));
	return specificities.every((specificity, index) => compareSpecificity(specificity, specificities[0]) === 0
		&& getInheritedSpecificityCount(parents[index]) === getInheritedSpecificityCount(parents[0]));
};

const canUseRelatedSelector = selector => canMatchSelector(selector) && !find(selector, node => node.type === 'Raw');

const getPrefixedSelectorText = (parentSelector, selector, sourceCode) => {
	const parentNodes = parentSelector.children;
	if (selector.children.length < parentNodes.length || parentNodes.some((node, index) => !isSameSelectorNode(node, selector.children[index], sourceCode))) {
		return;
	}

	if (selector.children.slice(parentNodes.length).some(node => hasNestingSelector(node))) {
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
	if (selector.children.at(0)?.type === 'Combinator' || parentNodes.some(node => node.type === 'Combinator')) {
		return;
	}

	const parentStart = selector.children.findIndex((node, index) => index > 0
		&& selector.children.length >= index + parentNodes.length
		&& parentNodes.every((node, offset) => isSameSelectorNode(node, selector.children[index + offset], sourceCode)));
	if (parentStart === -1 || selector.children.some((node, index) => (index < parentStart || index >= parentStart + parentNodes.length) && hasNestingSelector(node))) {
		return;
	}

	if (
		selector.children.slice(0, parentStart).some(node => node.type === 'Combinator')
		&& parentNodes.every(node => !hasNestingSelector(node))
		&& hasAncestorStyleRule(rule, context)
	) {
		// An implicit ancestor must keep constraining the original leftmost compound.
		return;
	}

	const previous = selector.children[parentStart - 1];
	const prefixNodes = selector.children.slice(0, parentStart - (isDescendantCombinator(previous) ? 1 : 0));
	if (prefixNodes.length === 0) {
		return;
	}

	const prefix = getNodesText(prefixNodes, sourceCode);
	const parentEnd = sourceCode.getRange(selector.children[parentStart + parentNodes.length - 1])[1];
	const suffix = sourceCode.text.slice(parentEnd, sourceCode.getRange(selector.children.at(-1))[1]);
	if (prefixNodes[0].type === 'TypeSelector' && prefixNodes.length > 1) {
		if (previous.type !== 'Combinator' && prefixNodes.every(node => node.type !== 'Combinator')) {
			// Keep & immediately after a leading type so the parser recognizes a selector before any pseudo-class.
			const typeText = sourceCode.getText(prefixNodes[0]);
			return `${typeText}&${prefix.slice(typeText.length)}${suffix}`;
		}

		if (prefixNodes[1].type === 'PseudoClassSelector') {
			return;
		}
	}

	return prefix + (previous.type === 'Combinator' ? ' &' : '&') + suffix;
};

const getGroupedSelectorText = (parents, rule, context, getSelectorText = getRelativeSelectorText) => {
	const groups = parents.map(() => new Set());
	const innerSelectors = new Set();
	for (const selector of rule.prelude.children) {
		if (!canUseRelatedSelector(selector)) {
			return;
		}

		const matches = parents.map(parent => getSelectorText(parent, selector, rule, context));
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
		return getGroupedSelectorText(parents, rule, context);
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

const getInferredParents = (rule, context) => {
	const {sourceCode} = context;
	const parents = [];
	const parentTexts = new Set();
	for (const selector of rule.prelude.children) {
		const boundary = selector.children.findIndex((node, index) => (node.type === 'Combinator' && index > 0) || node.type === 'PseudoElementSelector');
		if (boundary <= 0) {
			return;
		}

		const parent = {type: 'Selector', children: selector.children.slice(0, boundary)};
		const text = getNodesText(parent.children, sourceCode);
		if (!parentTexts.has(text)) {
			parentTexts.add(text);
			parents.push(parent);
		}
	}

	return parents.length > 1 && canUseRelatedParents(parents) ? parents : undefined;
};

const getGroupedCandidate = (rule, context) => {
	const {sourceCode} = context;
	const parent = getSharedParent(rule.prelude.children, sourceCode) ?? getSharedSuffix(rule.prelude.children, sourceCode);
	let parents = parent ? [parent] : undefined;
	let inner = parents && getRelatedSelectorText(parents, rule, context);
	if (!inner) {
		parents = getInferredParents(rule, context);
		inner = parents && getGroupedSelectorText(parents, rule, context, (parent, selector) => getPrefixedSelectorText(parent, selector, sourceCode));
	}

	return inner ? {node: rule.prelude, inner, parentText: getParentText(parents, sourceCode)} : undefined;
};

// Discovery follows the first child of grouping blocks; the matcher validates every moved child.
const getFirstStyleRule = rule => {
	let child = rule;
	while (child?.type === 'Atrule' && ['media', 'supports', 'container', 'layer', 'starting-style'].includes(normalizeCssIdentifier(child.name)) && child.block?.children.length > 0) {
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
	// Exact nested declarations preserve each parent selector's specificity and pseudo-elements without introducing &.
	const canNestStyleRules = canUseRelatedParents(parents);
	const relatedRules = [];
	for (let index = startIndex; index < children.length; index++) {
		const rule = children[index];
		const relatedRule = getRelatedRule(parents, rule, context, canNestStyleRules);
		if (relatedRule === undefined) {
			break;
		}

		relatedRules.push(relatedRule);
	}

	return relatedRules;
};

const getMergeCandidate = (children, index, selectors, context) => {
	const {sourceCode} = context;
	const parentRule = children[index];
	const isConditionalParent = parentRule.type === 'Atrule';
	const relatedRules = selectors.every(canMatchSelector)
		? getRelatedRules(children, index + (isConditionalParent ? 0 : 1), selectors, context)
		: [];
	if (relatedRules.length >= (isConditionalParent ? 2 : 1)) {
		return {parents: selectors, relatedRules};
	}

	const nextRule = children[index + 1];
	const nextSelectors = getSelectors(getFirstStyleRule(nextRule));
	if (!nextSelectors) {
		return;
	}

	if (nextRule.type === 'Atrule' && canUseRelatedParents(nextSelectors)) {
		const nextRelatedRules = getRelatedRules(children, index, nextSelectors, context);
		if (nextRelatedRules.length >= 2) {
			return {parents: nextSelectors, relatedRules: nextRelatedRules};
		}
	}

	const combinedSelectors = [...selectors, ...nextSelectors];
	const sharedParent = getSharedParent(combinedSelectors, sourceCode) ?? getSharedSuffix(combinedSelectors, sourceCode);
	if (sharedParent && combinedSelectors.every(selector => selector.children.length > sharedParent.children.length)) {
		const sharedRules = getRelatedRules(children, index, [sharedParent], context);
		if (sharedRules.length >= 2) {
			return {parents: [sharedParent], relatedRules: sharedRules};
		}
	}

	const inferredParents = selectors.length > 1 ? getInferredParents(getFirstStyleRule(parentRule), context) : undefined;
	if (inferredParents) {
		const inferredRules = getRelatedRules(children, index, inferredParents, context);
		if (inferredRules.length >= 2) {
			return {parents: inferredParents, relatedRules: inferredRules};
		}
	}
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
			const selectorRule = getFirstStyleRule(parentRule);
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
		let parentText;
		if (rule.prelude.children.length === 1) {
			const [selector] = rule.prelude.children;
			candidate = getCandidate(selector, rule, context);
			if (
				!candidate
				|| !canMatchSelector(selector)
				|| find(selector, hasNestingSelectorInRawArgument)
				|| isBareNestingSelector(candidate.outerNodes)
				|| selector.children.some(node => !candidate.outerNodes.includes(node) && hasNestingSelector(node))
			) {
				return;
			}

			parentText = candidate.parentText ?? getNodesText(candidate.outerNodes, sourceCode);
		} else {
			candidate = getGroupedCandidate(rule, context);
			if (!candidate) {
				return;
			}

			({parentText} = candidate);
		}

		const content = getNestedContent({rule, inner: candidate.inner}, context);
		const replacement = content === undefined ? undefined : `${parentText} {${content}}`;
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
