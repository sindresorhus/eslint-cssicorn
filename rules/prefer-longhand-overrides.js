import {find, generate} from '@eslint/css-tree';
import propertyInteractions from './shared/css-property-interactions.js';
import {canMatchSelector, isPseudoElementNode, isStyleRule} from './shared/css-selector-specificity.js';
import {getChangedShorthandComponent, getShorthandComponents, supportedShorthands} from './shared/css-shorthand-components.js';
import {
	decodeCssIdentifier,
	getBasePropertyName,
	getCanonicalLexerNode,
	getCommaSeparatedGroups,
	hasCommentInRange,
	isCssModulesInteropDeclaration,
	isImportantDeclaration,
	normalizeCssIdentifier,
	parse,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID = 'prefer-longhand-overrides';
const MESSAGE_ID_SUGGESTION = 'prefer-longhand-overrides/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer overriding `{{component}}` instead of repeating the `{{property}}` shorthand.',
	[MESSAGE_ID_SUGGESTION]: 'Replace the shorthand with `{{component}}`.',
};
const INVALID_BASELINE = Symbol('invalid baseline');
const refinementTypes = new Set(['ClassSelector', 'IdSelector', 'AttributeSelector', 'PseudoClassSelector']);
const familiesByInteraction = new Map();
for (const property of supportedShorthands) {
	for (const interaction of propertyInteractions.get(property) ?? []) {
		if (!familiesByInteraction.has(interaction)) {
			familiesByInteraction.set(interaction, new Set());
		}

		familiesByInteraction.get(interaction).add(property);
	}
}

const getSelectorKey = nodes => JSON.stringify(nodes.map(node => `${node.type}:${generate(node)}`));
const nestingKey = getSelectorKey([{type: 'NestingSelector'}]);

const getSelectors = rule => {
	if (rule.prelude?.type !== 'SelectorList' || rule.prelude.children.length === 0) {
		return;
	}

	const selectors = rule.prelude.children;
	if (selectors.some(selector => !canMatchSelector(selector) || find(selector, node => node.type === 'Raw' || isPseudoElementNode(node)))) {
		return;
	}

	return selectors;
};

const getSelectorPrefixes = selector => {
	const nodes = selector.children;
	if (
		find(selector, node => node.type === 'NestingSelector' && node !== nodes[0])
		|| (nodes[0]?.type === 'NestingSelector' && nodes.slice(1).some(node => !refinementTypes.has(node.type)))
	) {
		return;
	}

	const compoundStart = nodes.findLastIndex(node => node.type === 'Combinator') + 1;
	if (nodes[0]?.type === 'Combinator') {
		return;
	}

	const prefixes = [];
	for (let length = nodes.length - 1; length > compoundStart; length--) {
		if (!refinementTypes.has(nodes[length].type)) {
			break;
		}

		prefixes.push(getSelectorKey(nodes.slice(0, length)));
	}

	return {key: getSelectorKey(nodes), prefixes};
};

const getBlockDeclarations = (block, context) => {
	const declarations = new Map();
	const affecting = new Map();
	let hasAll = false;
	for (const declaration of block.children) {
		if (declaration.type !== 'Declaration' || declaration.property.startsWith('--')) {
			continue;
		}

		const property = normalizeCssIdentifier(declaration.property);
		if (property === 'all') {
			hasAll = true;
			continue;
		}

		if (supportedShorthands.has(property) && !isCssModulesInteropDeclaration(declaration, context)) {
			declarations.set(property, declaration);
		}

		const families = new Set();
		for (const interaction of propertyInteractions.get(getBasePropertyName(property)) ?? []) {
			for (const family of familiesByInteraction.get(interaction) ?? []) {
				families.add(family);
			}
		}

		for (const family of families) {
			affecting.set(family, (affecting.get(family) ?? 0) + 1);
		}
	}

	return {declarations, affecting, hasAll};
};

const getFamilyDeclaration = (info, property) => !info.hasAll && info.affecting.get(property) === 1 && info.declarations.has(property)
	? info.declarations.get(property)
	: INVALID_BASELINE;

const registerSelectors = (index, keys, info) => {
	if (info.affecting.size === 0 && !info.hasAll) {
		return;
	}

	for (const key of new Set(keys)) {
		if (!index.has(key)) {
			index.set(key, {families: new Map(), hasAll: false});
		}

		const record = index.get(key);
		record.hasAll ||= info.hasAll;
		for (const property of info.affecting.keys()) {
			record.families.set(property, record.families.has(property) ? INVALID_BASELINE : getFamilyDeclaration(info, property));
		}
	}
};

const getBaseline = (selectorPrefixes, property, index) => {
	let baseline;
	for (const {key, prefixes} of selectorPrefixes) {
		const exact = index.get(key);
		if (exact?.hasAll || exact?.families.has(property)) {
			return;
		}

		const matches = new Set();
		for (const prefix of prefixes) {
			const record = index.get(prefix);
			if (record?.hasAll) {
				return;
			}

			const declaration = record?.families.get(property);
			if (declaration === INVALID_BASELINE) {
				return;
			}

			if (declaration) {
				matches.add(declaration);
			}
		}

		if (matches.size !== 1) {
			return;
		}

		const [declaration] = matches;
		if (baseline && baseline !== declaration) {
			return;
		}

		baseline = declaration;
	}

	return baseline;
};

const getSlotText = (slot, sourceCode) => {
	if (slot.text !== undefined) {
		return slot.text;
	}

	let text = '';
	for (const [index, node] of slot.nodes.entries()) {
		if (index > 0) {
			const previousEnd = sourceCode.getRange(slot.nodes[index - 1])[1];
			const start = sourceCode.getRange(node)[0];
			const separator = start >= previousEnd ? sourceCode.text.slice(previousEnd, start) : '';
			text += start >= previousEnd && /^[\t\n\f\r ]*$/v.test(separator) ? separator : ' ';
		}

		const nodeText = sourceCode.getText(node);
		text += nodeText;
		// A terminating hexadecimal escape can consume the whitespace separating the next token.
		if (index < slot.nodes.length - 1 && nodeText.includes('\\') && decodeCssIdentifier(`${nodeText} `) === decodeCssIdentifier(nodeText)) {
			text += ' ';
		}
	}

	return text;
};

const getReplacementValue = (slots, declaration, sourceCode) => {
	const groups = getCommaSeparatedGroups(declaration.value);
	let text = '';
	for (const [index, slot] of slots.entries()) {
		if (index > 0) {
			text += sourceCode.text.slice(sourceCode.getRange(groups[index - 1].nodes.at(-1))[1], sourceCode.getRange(groups[index].nodes[0])[0]);
		}

		text += getSlotText(slot, sourceCode);
	}

	return text;
};

const getProblem = (declaration, baseline, {property, getComponents, context}) => {
	const {sourceCode} = context;
	if (isImportantDeclaration(baseline) !== isImportantDeclaration(declaration)) {
		return;
	}

	const changed = getChangedShorthandComponent(getComponents(baseline), getComponents(declaration));
	if (!changed) {
		return;
	}

	const value = getReplacementValue(changed.slots, declaration, sourceCode);
	if (!sourceCode.lexer.matchProperty(changed.property, getCanonicalLexerNode(parse(value, {context: 'value'}))).matched) {
		return;
	}

	const data = {property, component: changed.property};
	const problem = {node: declaration, messageId: MESSAGE_ID, data};
	if (!hasCommentInRange(context, sourceCode.getRange(declaration))) {
		const start = sourceCode.getRange(declaration)[0];
		problem.suggest = [{
			messageId: MESSAGE_ID_SUGGESTION,
			data,
			* fix(fixer) {
				yield fixer.replaceTextRange([start, start + declaration.property.length], changed.property);
				yield fixer.replaceTextRange([sourceCode.getRange(declaration.value.children.at(0))[0], sourceCode.getRange(declaration.value.children.at(-1))[1]], value);
			},
		}];
	}

	return problem;
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const blockDeclarations = new WeakMap();
	const componentsByDeclaration = new WeakMap();
	const getInfo = block => {
		if (!blockDeclarations.has(block)) {
			blockDeclarations.set(block, getBlockDeclarations(block, context));
		}

		return blockDeclarations.get(block);
	};

	const getComponents = declaration => {
		if (!componentsByDeclaration.has(declaration)) {
			componentsByDeclaration.set(declaration, getShorthandComponents(declaration, context));
		}

		return componentsByDeclaration.get(declaration);
	};

	context.on(['StyleSheet', 'Block'], function * (container) {
		if (container.children.every(child => child.type !== 'Rule')) {
			return;
		}

		const index = new Map();
		const owner = sourceCode.getParent(container);
		if (owner?.type === 'Rule' && isStyleRule(owner, context) && getSelectors(owner)) {
			registerSelectors(index, [nestingKey], getInfo(container));
		}

		for (const rule of container.children) {
			if (rule.type !== 'Rule' || !isStyleRule(rule, context)) {
				continue;
			}

			const selectors = getSelectors(rule);
			if (!selectors) {
				continue;
			}

			const prefixes = selectors.map(selector => getSelectorPrefixes(selector));
			if (prefixes.some(selector => !selector)) {
				continue;
			}

			const info = getInfo(rule.block);
			for (const [property, declaration] of info.declarations) {
				if (getFamilyDeclaration(info, property) === INVALID_BASELINE) {
					continue;
				}

				const baseline = getBaseline(prefixes, property, index);
				if (!baseline || sourceCode.getRange(baseline)[0] >= sourceCode.getRange(rule)[0]) {
					continue;
				}

				yield getProblem(declaration, baseline, {property, getComponents, context});
			}

			registerSelectors(index, prefixes.map(({key}) => key), info);
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
			description: 'Prefer longhand properties when overriding one shorthand component.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
