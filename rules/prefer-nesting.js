import {find, lexer} from '@eslint/css-tree';
import {
	canBeRepresentedByNestingSelector,
	canMatchSelector,
	compareSpecificity,
	getRuleSelectorSpecificity,
	hasAncestorStyleRule,
	hasNamedNamespace,
	hasNestingSelectorInRawArgument,
	hasScopeAncestor,
	isStyleRule,
} from './shared/css-selector-specificity.js';
import {
	getNodesRange,
	getParsableNestedRulePrelude,
	hasCommentInRange,
	isParsedAsNestedRule,
	normalizeCssIdentifier,
	transparentGroupingAtRules,
	trimCssWhitespace,
	trimCssWhitespaceEnd,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornRuleFixer} from './rule/to-eslint-rule-fixer.js';
*/

const MESSAGE_ID = 'prefer-nesting';
const MESSAGE_ID_RELATED_RULES = 'prefer-nesting/related-rules';
const messages = {
	[MESSAGE_ID]: 'Prefer CSS nesting over `:is()`.',
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

const isDescendantCombinator = node => node?.type === 'Combinator' && node.name === ' ';

const getSelectorList = node => {
	if (node?.type !== 'PseudoClassSelector' || normalizeCssIdentifier(node.name) !== 'is') {
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

	const innerNodes = children.slice(groupIndex + (isDescendantCombinator(suffix) ? 2 : 1));
	return {
		node: children[groupIndex],
		outerNodes: children.slice(0, groupIndex + 1),
		inner: (suffix.type === 'Combinator' ? '' : '&') + getNodesText(innerNodes, sourceCode),
	};
};

const getLeadingGroupCandidate = (children, rule, context) => {
	const {sourceCode} = context;
	let groupIndex = 0;
	if (children[groupIndex]?.type === 'NestingSelector') {
		groupIndex++;
	}

	if (children[groupIndex]?.type === 'Combinator') {
		groupIndex++;
	}

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
	if (
		!canUnwrapSelectorList(argumentsList, allowCombinators)
		|| (leadingNode === undefined && hasAncestor && argumentsList.children.some(argument => hasNestingSelector(argument) !== firstArgumentHasNestingSelector))
	) {
		return;
	}

	// The inner selector inherits the list's maximum specificity, just like :is().
	let parentText = getNodesText(argumentsList.children, sourceCode);
	if (leadingNode) {
		parentText = argumentsList.children.map(argument => {
			const nodes = argument.children;
			const text = getNodesText(nodes, sourceCode);
			if (leadingNode.type === 'Combinator') {
				const prefixText = sourceCode.text.slice(sourceCode.getRange(children[0])[0], sourceCode.getRange(group)[0]).trimEnd();
				return `${prefixText} ${text}`;
			}

			// The attached & intersects the rightmost compound, after any leading type selector.
			// Keep & immediately after a leading type so the parser recognizes a selector before any pseudo-class.
			const compoundStart = nodes.findLastIndex(node => node.type === 'Combinator') + 1;
			const firstNode = nodes[compoundStart];
			const insertionOffset = sourceCode.getRange(firstNode)[firstNode.type === 'TypeSelector' ? 1 : 0] - sourceCode.getRange(nodes[0])[0];
			return `${text.slice(0, insertionOffset)}&${text.slice(insertionOffset)}`;
		}).join(', ');
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
	const argumentsList = getSelectorList(group);
	// Keep existing & references in their original ancestor context.
	if (!canUnwrapSelectorList(argumentsList) || children.slice(groupIndex).some(node => hasNestingSelector(node))) {
		return;
	}

	const hasCombinator = children[groupIndex - 1]?.type === 'Combinator';
	const parentEnd = groupIndex - (hasCombinator ? 1 : 0);
	if (parentEnd === 0) {
		return;
	}

	const isDescendant = isDescendantCombinator(children[groupIndex - 1]);
	const innerNodes = children.slice(isDescendant || !hasCombinator ? groupIndex : parentEnd);
	let inner = (hasCombinator ? '' : '&') + getNodesText(innerNodes, sourceCode);
	if (groupIndex === children.length - 1) {
		// Unlike :is(), a nested selector list gives each branch its own specificity.
		const specificities = argumentsList.children.map(argument => getRuleSelectorSpecificity(argument, [0, 0, 0]));
		if (!hasCombinator || ![' ', '>', '+', '~'].includes(children[parentEnd].name) || specificities.some(specificity => compareSpecificity(specificity, specificities[0]) !== 0)) {
			return;
		}

		inner = isDescendant
			? getNodesText(argumentsList.children, sourceCode)
			: argumentsList.children.map(argument => `${children[parentEnd].name} ${getNodesText(argument.children, sourceCode)}`).join(', ');
	}

	return {
		node: group,
		outerNodes: children.slice(0, parentEnd),
		inner,
	};
};

const getNodesText = (nodes, sourceCode) => sourceCode.text.slice(...getNodesRange(nodes, {sourceCode}));

const getIndentation = (rule, sourceCode) => {
	const [ruleStart] = sourceCode.getRange(rule);
	const indentation = sourceCode.text.slice(ruleStart - sourceCode.getLoc(rule).start.column + 1, ruleStart);
	const content = sourceCode.getText(rule.block).slice(1, -1);
	const bodyIndentation = content.match(/(?:\r\n|[\n\f\r])([\t ]*)[^\t\n\f\r ]/v)?.[1];
	if (!/^[\t ]*$/v.test(indentation) || !bodyIndentation?.startsWith(indentation) || bodyIndentation.length <= indentation.length) {
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
			const lineIndentation = /(\r\n|[\n\f\r])([\t ]*)/gv;
			for (const match of content.matchAll(lineIndentation)) {
				if (match[2] && !match[2].startsWith(indentationStep)) {
					return;
				}
			}

			content = content.replaceAll(lineIndentation, (match, lineBreak, indentation) => lineBreak + indentation.slice(indentationStep.length));
		}

		const [start, end] = sourceCode.getRange(nestedRule.rule);
		block += sourceCode.text.slice(previousEnd, start) + trimCssWhitespace(content);
		previousEnd = end;
	}

	return block + sourceCode.text.slice(previousEnd, blockEnd);
};

const getNestedContent = ({rule, inner, blockNode = rule.block, blockText, nestedRules}, context) => {
	const {sourceCode} = context;
	const ruleText = sourceCode.getText(rule);
	if (hasCommentInRange(context, sourceCode.getRange(rule)) || /\\[\da-f]{0,6}[\n\f\r]/iv.test(ruleText)) {
		return;
	}

	let block = blockText ?? sourceCode.getText(blockNode);
	const lineBreak = ruleText.match(/\r\n|[\n\f\r]/v)?.[0];
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

	const indentedInner = inner.replaceAll(/(\r\n|[\n\f\r])(?=[\t ]*[^\t\n\f\r ])/gv, lineBreak => lineBreak + indentationStep);
	const indentedBlock = blockNode === rule.block ? block.replaceAll(/(\r\n|[\n\f\r])(?=[\t ]*[^\t\n\f\r ])/gv, lineBreak => lineBreak + indentationStep) : block;
	return `${lineBreak}${indentation}${indentationStep}${indentedInner} ${indentedBlock}${lineBreak}${indentation}`;
};

// The bundled parser reads some nested selectors as declarations, like `span::before`, and rejects some valid ones, like `html:not(.a, .b) &, p &`, and the fixed file must still parse. The rule skips `@scope`, so an added `&` always means the same as the implicit one.
const getNestedReplacement = (rule, parentText, inner, context) => {
	const innerPrelude = getParsableNestedRulePrelude(`${inner} `, {canAddNestingSelector: true});
	const content = innerPrelude && getNestedContent({rule, inner: innerPrelude.slice(0, -1)}, context);
	if (content === undefined || !isParsedAsNestedRule(content)) {
		return;
	}

	if (!hasAncestorStyleRule(rule, context)) {
		return `${parentText} {${content}}`;
	}

	const parentPrelude = getParsableNestedRulePrelude(`${parentText} `, {canAddNestingSelector: true});
	const replacement = parentPrelude && `${parentPrelude}{${content}}`;
	if (replacement && isParsedAsNestedRule(replacement)) {
		return replacement;
	}
};

const isSameSelectorNode = (first, second, sourceCode) => first.type === second.type && (first.type === 'Combinator'
	? first.name === second.name
	: sourceCode.getText(first) === sourceCode.getText(second));

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
	if (!canUseRelatedSelector(selector)) {
		return;
	}

	const parentNodes = parentSelector.children;
	// An implicit ancestor must keep constraining the original leftmost compound, so only remove a leading parent prefix.
	if (selector.children.length < parentNodes.length || parentNodes.some((node, index) => !isSameSelectorNode(node, selector.children[index], sourceCode))) {
		return;
	}

	// A shared prefix must retain every original ancestor reference.
	if (selector.children.slice(parentNodes.length).some(node => hasNestingSelector(node))) {
		return;
	}

	const suffix = selector.children[parentNodes.length];
	if (!suffix) {
		return '&';
	}

	// A nested selector that starts with a combinator or has no `&` is relative to the parent, so `& .title` is written as `.title`.
	const innerNodes = selector.children.slice(parentNodes.length + (isDescendantCombinator(suffix) ? 1 : 0));
	return (suffix.type === 'Combinator' ? '' : '&') + getNodesText(innerNodes, sourceCode);
};

const getContextualSelectorText = (parentSelector, selector, rule, context) => {
	const {sourceCode} = context;
	const parentNodes = parentSelector.children;
	if (
		parentNodes.some(node => node.type === 'Combinator')
		|| selector.children.at(0)?.type === 'Combinator'
		|| hasAncestorStyleRule(rule, context)
		|| hasNestingSelector(selector)
		|| !canUseRelatedSelector(selector)
	) {
		return;
	}

	// Only replace an exact parent at the start of a later compound; never reorder selectors to find a match.
	const parentStart = selector.children.findIndex((node, index, nodes) => index > 0
		&& nodes[index - 1].type === 'Combinator'
		&& index + parentNodes.length <= nodes.length
		&& parentNodes.every((parentNode, offset) => isSameSelectorNode(parentNode, nodes[index + offset], sourceCode)));
	if (parentStart === -1) {
		return;
	}

	const [start, end] = getNodesRange(selector.children.slice(parentStart, parentStart + parentNodes.length), {sourceCode});
	const [selectorStart, selectorEnd] = sourceCode.getRange(selector);
	return `${sourceCode.text.slice(selectorStart, start)}&${sourceCode.text.slice(end, selectorEnd)}`;
};

// The bundled parser reads some nested selectors as declarations, like `span::before`, and rejects some valid ones, like `|a`, and the fixed file must still parse. The rule skips `@scope`, so an added `&` always means the same as the implicit one.
const getParsableNestedSelectorText = text => getParsableNestedRulePrelude(`${text} `, {canAddNestingSelector: true})?.slice(0, -1);

const getGroupedSelectorText = (parents, rule, context) => {
	const groups = parents.map(() => new Set());
	const innerSelectors = new Set();
	for (const selector of rule.prelude.children) {
		const matches = parents.map(parent => getPrefixedSelectorText(parent, selector, context.sourceCode)
			?? getContextualSelectorText(parent, selector, rule, context));
		const matchingIndices = matches.flatMap((match, index) => match === undefined ? [] : [index]);
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

	return getParsableNestedSelectorText([...innerSelectors].join(', '));
};

const getRelatedSelectorText = (parents, rule, context) => {
	if (rule.prelude?.type !== 'SelectorList') {
		return;
	}

	if (parents.length > 1) {
		return getGroupedSelectorText(parents, rule, context);
	}

	const {sourceCode} = context;
	const [parentSelector] = parents;
	const innerSelectors = rule.prelude.children.map(selector => getPrefixedSelectorText(parentSelector, selector, sourceCode)
		?? getContextualSelectorText(parentSelector, selector, rule, context));
	if (innerSelectors.includes(undefined) || innerSelectors.every(selector => selector === '&')) {
		return;
	}

	let result = '';
	let previousEnd = sourceCode.getRange(rule.prelude)[0];
	for (const [index, selector] of rule.prelude.children.entries()) {
		result += sourceCode.text.slice(previousEnd, sourceCode.getRange(selector)[0]) + innerSelectors[index];
		previousEnd = sourceCode.getRange(selector)[1];
	}

	return getParsableNestedSelectorText(result);
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
	if (!transparentGroupingAtRules.has(name)) {
		return;
	}

	const childRule = rule.block.children.at(0);
	const selectors = rule.block.children.length === 1 ? getSelectors(childRule) : undefined;
	canNestStyleRules &&= ['media', 'layer'].includes(name);
	const inner = trimCssWhitespaceEnd(sourceCode.text.slice(sourceCode.getRange(rule)[0], sourceCode.getRange(rule.block)[0]));
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

const getMergedReplacement = (parentRule, relatedRules, context, sharedParentText) => {
	const {sourceCode} = context;
	const range = [sourceCode.getRange(parentRule)[0], sourceCode.getRange(relatedRules.at(-1).rule)[1]];
	if (hasCommentInRange(context, range)) {
		return;
	}

	const lastChild = sharedParentText === undefined ? parentRule.block.children.at(-1) : undefined;
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
	const isMultiline = /[\n\f\r]/v.test(parentText);
	const parentFormatting = isMultiline ? getIndentation(parentRule, sourceCode) : undefined;
	const replacementParts = [sharedParentText === undefined ? parentText.slice(0, -1) : `${sharedParentText} {`];
	for (const relatedRule of relatedRules) {
		const {rule} = relatedRule;
		const childIsMultiline = /[\n\f\r]/v.test(sourceCode.getText(rule));
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

		// Trim only the previous part, as trimming the whole growing replacement is quadratic. Each part has non-whitespace text.
		replacementParts.push(trimCssWhitespaceEnd(replacementParts.pop()), content);
	}

	return `${replacementParts.join('')}}`;
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

const isDescendantOrChildCombinator = node => node?.type === 'Combinator' && [' ', '>'].includes(node.name);

const getSharedPrefixCandidate = (children, startIndex, selectors, context) => {
	if (selectors.length !== 1) {
		return;
	}

	const {sourceCode} = context;
	const [selector] = selectors;
	const boundary = selector.children.findIndex(node => node.type === 'Combinator');
	if (!isDescendantOrChildCombinator(selector.children[boundary])) {
		return;
	}

	const parent = {type: 'Selector', children: selector.children.slice(0, boundary)};
	if (parent.children.every(node => node.type !== 'ClassSelector') || !canUseRelatedParents([parent])) {
		return;
	}

	const relatedRules = [];
	for (let index = startIndex; index < children.length; index++) {
		const rule = children[index];
		const ruleSelectors = getSelectors(rule);
		if (rule.type !== 'Rule' || ruleSelectors?.length !== 1 || !isDescendantOrChildCombinator(ruleSelectors[0].children[boundary])) {
			break;
		}

		const innerText = getPrefixedSelectorText(parent, ruleSelectors[0], sourceCode);
		const inner = innerText === undefined ? undefined : getParsableNestedSelectorText(innerText);
		if (inner === undefined) {
			break;
		}

		relatedRules.push({rule, inner});
	}

	return relatedRules.length < 2 ? undefined : {parentText: getNodesText(parent.children, sourceCode), relatedRules};
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const [{checkSharedPrefixes}] = context.options;
	if (sourceCode.ast.children.some(node => node.type === 'Atrule' && normalizeCssIdentifier(node.name) === 'namespace')) {
		return;
	}

	const mergedRules = new WeakSet();
	context.on(['StyleSheet', 'Block'], function * (container) {
		for (let index = 0; index < container.children.length - 1; index++) {
			const parentRule = container.children[index];
			// Discovery starts at a style rule; the matcher validates every moved child of following grouping blocks.
			const selectors = getSelectors(parentRule);
			if (
				!selectors?.length
				|| mergedRules.has(parentRule)
				|| !isStyleRule(parentRule, context)
				|| hasScopeAncestor(parentRule, context)
				|| !selectors.every(canMatchSelector)
			) {
				continue;
			}

			let relatedRules = getRelatedRules(container.children, index + 1, selectors, context);
			let sharedParentText;
			if (relatedRules.length === 0 && checkSharedPrefixes) {
				const candidate = getSharedPrefixCandidate(container.children, index, selectors, context);
				if (candidate) {
					({relatedRules, parentText: sharedParentText} = candidate);
				}
			}

			if (relatedRules.length === 0) {
				continue;
			}

			// Prefer merging adjacent rules over reporting their selectors separately.
			mergedRules.add(parentRule);
			for (const {rule} of relatedRules) {
				for (const child of getRelatedStyleRules(rule)) {
					mergedRules.add(child);
				}
			}

			const reportedRule = relatedRules[0].rule;
			const replacement = getMergedReplacement(parentRule, relatedRules, context, sharedParentText);
			yield {
				node: reportedRule.prelude ?? reportedRule,
				messageId: MESSAGE_ID_RELATED_RULES,
				/**
				@param {Parameters<CssicornRuleFixer>[0]} fixer
				*/
				fix: replacement === undefined ? undefined : fixer => fixer.replaceTextRange([sourceCode.getRange(parentRule)[0], sourceCode.getRange(relatedRules.at(-1).rule)[1]], replacement),
			};
			index += relatedRules.length - Number(sharedParentText !== undefined);
		}
	});

	context.on('Rule', rule => {
		if (rule.prelude?.type !== 'SelectorList' || rule.prelude.children.length !== 1 || mergedRules.has(rule) || !isStyleRule(rule, context) || hasScopeAncestor(rule, context)) {
			return;
		}

		const [selector] = rule.prelude.children;
		const candidate = getCandidate(selector, rule, context);
		if (
			!candidate
			|| !canMatchSelector(selector)
			|| find(selector, hasNestingSelectorInRawArgument)
			|| isBareNestingSelector(candidate.outerNodes)
			|| selector.children.some(node => !candidate.outerNodes.includes(node) && hasNestingSelector(node))
		) {
			return;
		}

		const parentText = candidate.parentText ?? getNodesText(candidate.outerNodes, sourceCode);
		const replacement = getNestedReplacement(rule, parentText, candidate.inner, context);
		return {
			node: candidate.node,
			messageId: MESSAGE_ID,
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
			description: 'Prefer CSS nesting for structural `:is()` groups and rules extending an existing parent.',
			recommended: true,
		},
		fixable: 'code',
		schema: [{
			type: 'object',
			properties: {
				checkSharedPrefixes: {
					type: 'boolean',
					description: 'Check adjacent child or descendant rules with the same complete leading compound containing a class.',
				},
			},
			additionalProperties: false,
		}],
		defaultOptions: [{checkSharedPrefixes: false}],
		messages,
		languages: ['css/css'],
	},
};

export default config;
