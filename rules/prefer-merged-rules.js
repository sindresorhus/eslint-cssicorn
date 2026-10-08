import {
	find,
	generate,
	lexer,
	tokenize,
	tokenTypes,
} from '@eslint/css-tree';
import {canMatchSelector, hasAncestorStyleRule, isStyleRule} from './shared/css-selector-specificity.js';
import {decodeCssIdentifier, hasCommentInRange, normalizeCssIdentifier} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const SELECTORS_MESSAGE_ID = 'prefer-merged-rules/selectors';
const CONDITIONS_MESSAGE_ID = 'prefer-merged-rules/conditions';
const messages = {
	[SELECTORS_MESSAGE_ID]: 'Merge these adjacent rules with identical declarations.',
	[CONDITIONS_MESSAGE_ID]: 'Merge these adjacent `@{{name}}` rules with the same condition.',
};

const CONDITIONAL_RULES = new Set(['media', 'supports', 'container']);

// Unprefixed selectors supported by current Chrome, Firefox, and Safari, checked against MDN browser-compat-data.
const NON_FUNCTIONAL_PSEUDOS = new Set([
	'::after',
	'::backdrop',
	'::before',
	'::details-content',
	'::file-selector-button',
	'::first-letter',
	'::first-line',
	'::marker',
	'::placeholder',
	'::selection',
	'::target-text',
	'::view-transition',
	':active',
	':active-view-transition',
	':after',
	':any-link',
	':autofill',
	':before',
	':checked',
	':default',
	':defined',
	':disabled',
	':empty',
	':enabled',
	':first-child',
	':first-letter',
	':first-line',
	':first-of-type',
	':focus',
	':focus-visible',
	':focus-within',
	':fullscreen',
	':host',
	':hover',
	':in-range',
	':indeterminate',
	':invalid',
	':last-child',
	':last-of-type',
	':link',
	':modal',
	':only-child',
	':only-of-type',
	':open',
	':optional',
	':out-of-range',
	':picture-in-picture',
	':placeholder-shown',
	':popover-open',
	':read-only',
	':read-write',
	':required',
	':root',
	':scope',
	':target',
	':user-invalid',
	':user-valid',
	':valid',
	':visited',
]);
const FUNCTIONAL_PSEUDOS = new Set(['has', 'host', 'is', 'lang', 'not', 'nth-child', 'nth-last-child', 'nth-last-of-type', 'nth-of-type', 'where']);

const hasNamedNamespace = name => name.includes('|') && !name.startsWith('*|') && !name.startsWith('|');
const isCustomProperty = property => decodeCssIdentifier(property).startsWith('--');

const isUncertainPseudo = node => {
	const name = normalizeCssIdentifier(node.name);
	if (node.children === null) {
		return !NON_FUNCTIONAL_PSEUDOS.has((node.type === 'PseudoElementSelector' ? '::' : ':') + name);
	}

	if (node.type !== 'PseudoClassSelector' || !FUNCTIONAL_PSEUDOS.has(name)) {
		return true;
	}

	if (name === 'lang') {
		return node.children.length % 2 === 0 || node.children.some((child, index) => index % 2 === 0
			? !['Identifier', 'String'].includes(child.type)
			: child.type !== 'Operator' || child.value !== ',');
	}

	return (name === 'nth-of-type' || name === 'nth-last-of-type') && node.children.at(0)?.selector !== null;
};

const isUncertainSelectorNode = node => {
	switch (node.type) {
		case 'Raw': {
			return true;
		}

		case 'Selector': {
			return node.children.length === 0 || !canMatchSelector(node);
		}

		case 'IdSelector': {
			return !lexer.matchType('ident', node.name).matched;
		}

		case 'TypeSelector': {
			return hasNamedNamespace(node.name);
		}

		case 'AttributeSelector': {
			return hasNamedNamespace(node.name.name) || (node.flags !== null && (!node.matcher || normalizeCssIdentifier(node.flags) !== 'i'));
		}

		case 'Combinator': {
			return ![' ', '>', '+', '~'].includes(node.name);
		}

		case 'PseudoClassSelector':
		case 'PseudoElementSelector': {
			return isUncertainPseudo(node);
		}

		default: {
			return false;
		}
	}
};

const canMergeSelectors = (rule, context) => !find(rule.prelude, isUncertainSelectorNode)
	&& (hasAncestorStyleRule(rule, context) || rule.prelude.children.every(selector => selector.children.at(0)?.type !== 'Combinator'));

const hasRandomFunction = value => {
	if (!value.includes('(')) {
		return false;
	}

	let hasRandom = false;
	tokenize(value, (type, start, end) => {
		if (type === tokenTypes.Function && ['random', 'random-item'].includes(normalizeCssIdentifier(value.slice(start, end - 1)))) {
			hasRandom = true;
		}
	});
	return hasRandom;
};

const hasMalformedContent = rule => Boolean(find(rule.block, node => (
	node.type === 'Block' && node.children.some(child => child.type === 'Raw')
) || (
	node.type === 'Declaration' && node.value.type === 'Raw' && !isCustomProperty(node.property)
) || (
	node.type === 'Rule' && node.prelude.type !== 'SelectorList'
)));

const getMergeKey = (rule, context) => {
	if (!rule.block?.children?.length) {
		return;
	}

	if (rule.type === 'Atrule') {
		const name = normalizeCssIdentifier(rule.name);
		if (!CONDITIONAL_RULES.has(name) || rule.prelude?.type !== 'AtrulePrelude' || hasMalformedContent(rule)) {
			return;
		}

		return JSON.stringify(['condition', name, generate(rule.prelude)]);
	}

	if (!isStyleRule(rule, context) || rule.prelude?.type !== 'SelectorList' || rule.block.children.some(child => child.type !== 'Declaration')) {
		return;
	}

	const declarations = [];
	for (const declaration of rule.block.children) {
		const customProperty = isCustomProperty(declaration.property);
		if ((declaration.value.type === 'Raw' && !customProperty) || hasRandomFunction(context.sourceCode.getText(declaration.value))) {
			return;
		}

		declarations.push([
			customProperty ? decodeCssIdentifier(declaration.property) : normalizeCssIdentifier(declaration.property),
			generate(declaration.value),
			declaration.important,
		]);
	}

	return JSON.stringify(['selectors', declarations]);
};

const getMergedSelectors = (rules, sourceCode) => {
	const seenSelectors = new Set();
	let selectorsText = '';
	for (const [ruleIndex, rule] of rules.entries()) {
		let isFirstInRule = true;
		for (const [index, selector] of rule.prelude.children.entries()) {
			const key = generate(selector);
			if (seenSelectors.has(key)) {
				continue;
			}

			if (selectorsText !== '') {
				if (isFirstInRule) {
					const gap = sourceCode.text.slice(sourceCode.getRange(rules[ruleIndex - 1])[1], sourceCode.getRange(rule)[0]);
					selectorsText += ',' + gap;
				} else {
					selectorsText += sourceCode.text.slice(sourceCode.getRange(rule.prelude.children[index - 1])[1], sourceCode.getRange(selector)[0]);
				}
			}

			selectorsText += sourceCode.getText(selector);
			seenSelectors.add(key);
			isFirstInRule = false;
		}
	}

	return selectorsText;
};

const getWrapperParts = (rule, sourceCode, needsSeparator) => {
	const [blockStart, blockEnd] = sourceCode.getRange(rule.block);
	const [contentStart] = sourceCode.getRange(rule.block.children.at(0));
	const lastChild = rule.block.children.at(-1);
	let [, contentEnd] = sourceCode.getRange(lastChild);
	const hasDeclarationSemicolon = sourceCode.text[contentEnd] === ';';
	if (hasDeclarationSemicolon) {
		contentEnd++;
	}

	const content = sourceCode.text.slice(contentStart, contentEnd);
	if (needsSeparator && lastChild.type === 'Atrule' && !lastChild.block && !content.endsWith(';')) {
		return;
	}

	return {
		leading: sourceCode.text.slice(blockStart + 1, contentStart),
		content: content + (needsSeparator && lastChild.type === 'Declaration' && !hasDeclarationSemicolon ? ';' : ''),
		trailing: sourceCode.text.slice(contentEnd, blockEnd - 1),
	};
};

const getMergedWrappers = (rules, sourceCode) => {
	const parts = rules.map((rule, index) => getWrapperParts(rule, sourceCode, index < rules.length - 1));
	if (parts.some(part => !part)) {
		return;
	}

	const firstRule = rules[0];
	const [start, end] = sourceCode.getRange(firstRule);
	const [blockStart, blockEnd] = sourceCode.getRange(firstRule.block);
	return sourceCode.text.slice(start, blockStart + 1)
		+ parts.map(part => part.leading + part.content).join('')
		+ parts[0].trailing
		+ sourceCode.text.slice(blockEnd - 1, end);
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const mergeKeys = new WeakMap();
	const selectorEligibility = new WeakMap();
	const getKey = rule => {
		if (!mergeKeys.has(rule)) {
			mergeKeys.set(rule, getMergeKey(rule, context));
		}

		return mergeKeys.get(rule);
	};

	const canMerge = rule => {
		if (rule.type === 'Atrule') {
			return true;
		}

		if (!selectorEligibility.has(rule)) {
			selectorEligibility.set(rule, canMergeSelectors(rule, context));
		}

		return selectorEligibility.get(rule);
	};

	const canMergeWith = (previousRule, nextRule) => getKey(previousRule) === getKey(nextRule)
		&& canMerge(nextRule)
		&& /^[\t\n\f\r ]*$/u.test(sourceCode.text.slice(sourceCode.getRange(previousRule)[1], sourceCode.getRange(nextRule)[0]));

	context.on(['StyleSheet', 'Block'], function * (container) {
		const children = container.children ?? [];
		for (let index = 0; index < children.length - 1; index++) {
			const firstRule = children[index];
			const key = getKey(firstRule);
			if (key === undefined || key !== getKey(children[index + 1]) || !canMerge(firstRule)) {
				continue;
			}

			const rules = [firstRule];
			while (index + 1 < children.length && canMergeWith(rules.at(-1), children[index + 1])) {
				rules.push(children[index + 1]);
				index++;
			}

			if (rules.length < 2) {
				continue;
			}

			const range = [sourceCode.getRange(firstRule)[0], sourceCode.getRange(rules.at(-1))[1]];
			const isConditional = firstRule.type === 'Atrule';
			yield {
				node: rules[1].prelude,
				messageId: isConditional ? CONDITIONS_MESSAGE_ID : SELECTORS_MESSAGE_ID,
				data: isConditional ? {name: normalizeCssIdentifier(firstRule.name)} : undefined,
				fix(fixer, {abort}) {
					if (hasCommentInRange(context, range)) {
						abort();
					}

					const replacement = isConditional
						? getMergedWrappers(rules, sourceCode)
						: getMergedSelectors(rules, sourceCode) + sourceCode.text.slice(sourceCode.getRange(firstRule.prelude)[1], sourceCode.getRange(firstRule)[1]);
					if (replacement === undefined) {
						abort();
					}

					return fixer.replaceTextRange(range, replacement);
				},
			};
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
			description: 'Prefer merging adjacent rules with identical declarations or conditions.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
