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
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-nesting';
const messages = {
	[MESSAGE_ID]: 'Prefer CSS nesting over `:is()`.',
};

const isDescendantCombinator = node => node?.type === 'Combinator' && node.name === ' ';

const getIsSelectorList = node => {
	if (node?.type !== 'PseudoClassSelector' || normalizeCssIdentifier(node.name) !== 'is') {
		return;
	}

	const argumentsList = node.children?.[0];
	if (
		argumentsList?.type !== 'SelectorList'
		|| argumentsList.children.length < 2
		|| argumentsList.children.some(selector => selector.children.some(child => child.type === 'Combinator') || !canBeRepresentedByNestingSelector(selector, false))
	) {
		return;
	}

	return argumentsList;
};

// Keep uncertain selectors inside :is() to preserve its forgiving selector-list behavior.
const canUnwrapSelectorList = selectorList => selectorList.children.every(selector => selector.children.every(node => {
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
}));

const getCandidate = selector => {
	const {children} = selector;
	const leadingArguments = getIsSelectorList(children[0]);
	if (leadingArguments && children.length > 1) {
		return {
			node: children[0],
			outerNodes: canUnwrapSelectorList(leadingArguments) ? leadingArguments.children : [children[0]],
			innerNodes: children.slice(isDescendantCombinator(children[1]) ? 2 : 1),
			attached: children[1].type !== 'Combinator',
		};
	}

	const trailingArguments = getIsSelectorList(children.at(-1));
	if (children.length < 3 || !trailingArguments || children.at(-2).type !== 'Combinator') {
		return;
	}

	let innerNodes = children.slice(-2);
	if (isDescendantCombinator(children.at(-2))) {
		// Unlike :is(), a nested selector list gives each branch its own specificity.
		const specificities = trailingArguments.children.map(argument => getRuleSelectorSpecificity(argument, [0, 0, 0]));
		const hasEqualSpecificity = specificities.every(specificity => compareSpecificity(specificity, specificities[0]) === 0);
		innerNodes = hasEqualSpecificity && canUnwrapSelectorList(trailingArguments) ? trailingArguments.children : [children.at(-1)];
	}

	return {
		node: children.at(-1),
		outerNodes: children.slice(0, -2),
		innerNodes,
		attached: false,
	};
};

const getNodesText = (nodes, sourceCode) => sourceCode.text.slice(sourceCode.getRange(nodes[0])[0], sourceCode.getRange(nodes.at(-1))[1]);

const getReplacement = (rule, candidate, context) => {
	const {sourceCode} = context;
	const ruleText = sourceCode.getText(rule);
	if (hasCommentInRange(context, sourceCode.getRange(rule)) || /\\[\da-f]{0,6}[\n\f\r]/iu.test(ruleText)) {
		return;
	}

	const outer = getNodesText(candidate.outerNodes, sourceCode);
	const inner = `${candidate.attached ? '&' : ''}${getNodesText(candidate.innerNodes, sourceCode)}`;
	const block = sourceCode.getText(rule.block);
	const lineBreak = ruleText.match(/\r\n|[\n\f\r]/u)?.[0];
	if (!lineBreak) {
		return `${outer} { ${inner} ${block} }`;
	}

	// Reindenting raw values can change their text, including custom property values.
	if (find(rule.block, node => node.type === 'Raw' && sourceCode.getLoc(node).start.line !== sourceCode.getLoc(node).end.line)) {
		return;
	}

	const [ruleStart] = sourceCode.getRange(rule);
	const indentation = sourceCode.text.slice(ruleStart - sourceCode.getLoc(rule).start.column + 1, ruleStart);
	const content = block.slice(1, -1);
	const bodyIndentation = content.match(/(?:\r\n|[\n\f\r])([\t ]*)[^\t\n\f\r ]/u)?.[1];
	if (!/^[\t ]*$/u.test(indentation) || !bodyIndentation?.startsWith(indentation) || bodyIndentation.length <= indentation.length) {
		return;
	}

	const indentationStep = bodyIndentation.slice(indentation.length);
	const indentedBlock = block.replaceAll(/(\r\n|[\n\f\r])(?=[\t ]*[^\t\n\f\r ])/gu, lineBreak => lineBreak + indentationStep);
	return `${outer} {${lineBreak}${indentation}${indentationStep}${inner} ${indentedBlock}${lineBreak}${indentation}}`;
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	if (sourceCode.ast.children.some(node => node.type === 'Atrule' && normalizeCssIdentifier(node.name) === 'namespace')) {
		return;
	}

	context.on('Rule', rule => {
		if (rule.prelude?.type !== 'SelectorList' || rule.prelude.children.length !== 1 || !isStyleRule(rule, context)) {
			return;
		}

		const [selector] = rule.prelude.children;
		const candidate = getCandidate(selector);
		if (!candidate || !canMatchSelector(selector) || hasScopeAncestor(rule, context) || find(selector, node => node.type === 'NestingSelector' || hasNestingSelectorInRawArgument(node))) {
			return;
		}

		const replacement = getReplacement(rule, candidate, context);
		return {
			node: candidate.node,
			messageId: MESSAGE_ID,
			/**
			@param {ESLint.Rule.RuleFixer} fixer
			*/
			fix: replacement === undefined ? undefined : fixer => fixer.replaceText(rule, replacement),
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
			description: 'Prefer CSS nesting over structural uses of `:is()`.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
