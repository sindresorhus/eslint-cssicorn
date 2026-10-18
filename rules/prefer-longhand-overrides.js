// @ts-check

import {find, generate, toPlainObject} from '@eslint/css-tree';
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
@import {BlockPlain, CssNodePlain, DeclarationPlain, RulePlain, SelectorPlain, ValuePlain} from '@eslint/css-tree';
@import {ShorthandSlot} from './shared/css-shorthand-components.js';
@import {CssicornProblem} from './rule/to-eslint-problem.js';
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

/**
@typedef {ReturnType<typeof getBlockDeclarations>} BlockDeclarations
@typedef {NonNullable<ReturnType<typeof getSelectorPrefixes>>} SelectorPrefixes
@typedef {Map<string, {families: Map<string, DeclarationPlain | typeof INVALID_BASELINE>, hasAll: boolean}>} SelectorIndex
*/
const refinementTypes = new Set(['ClassSelector', 'IdSelector', 'AttributeSelector', 'PseudoClassSelector']);
/**
@type {Map<string, Set<string>>}
*/
const familiesByInteraction = new Map();
for (const property of supportedShorthands) {
	for (const interaction of propertyInteractions.get(property) ?? []) {
		const families = familiesByInteraction.get(interaction) ?? new Set();
		families.add(property);
		familiesByInteraction.set(interaction, families);
	}
}

/**
@param {CssNodePlain[]} nodes
*/
const getSelectorKey = nodes => JSON.stringify(nodes.map(node => `${node.type}:${generate(node)}`));
const nestingKey = getSelectorKey([{type: 'NestingSelector'}]);

/**
@param {RulePlain} rule
*/
const getSelectors = rule => {
	if (rule.prelude?.type !== 'SelectorList' || rule.prelude.children.length === 0) {
		return;
	}

	const selectors = /** @type {SelectorPlain[]} */ (rule.prelude.children);
	if (selectors.some(selector => !canMatchSelector(selector) || find(selector, node => node.type === 'Raw' || isPseudoElementNode(/** @type {CssNodePlain} */ (node))))) {
		return;
	}

	return selectors;
};

/**
@param {SelectorPlain} selector
*/
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

/**
@param {BlockPlain} block
@param {CssicornContext} context
*/
const getBlockDeclarations = (block, context) => {
	/**
	@type {Map<string, DeclarationPlain>}
	*/
	const declarations = new Map();
	/**
	@type {Map<string, number>}
	*/
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

/**
@param {BlockDeclarations} info
@param {string} property
*/
const getFamilyDeclaration = (info, property) => !info.hasAll && info.affecting.get(property) === 1
	? info.declarations.get(property) ?? INVALID_BASELINE
	: INVALID_BASELINE;

/**
@param {SelectorIndex} index
@param {string[]} keys
@param {BlockDeclarations} info
*/
const registerSelectors = (index, keys, info) => {
	if (info.affecting.size === 0 && !info.hasAll) {
		return;
	}

	for (const key of new Set(keys)) {
		const record = index.get(key) ?? {families: new Map(), hasAll: false};
		index.set(key, record);
		record.hasAll ||= info.hasAll;
		for (const property of info.affecting.keys()) {
			record.families.set(property, record.families.has(property) ? INVALID_BASELINE : getFamilyDeclaration(info, property));
		}
	}
};

/**
@param {SelectorPrefixes[]} selectorPrefixes
@param {string} property
@param {SelectorIndex} index
*/
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

/**
@param {ShorthandSlot} slot
@param {CssicornContext['sourceCode']} sourceCode
*/
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

/**
@param {ShorthandSlot[]} slots
@param {DeclarationPlain} declaration
@param {CssicornContext['sourceCode']} sourceCode
*/
const getReplacementValue = (slots, declaration, sourceCode) => {
	const groups = getCommaSeparatedGroups(/** @type {ValuePlain} */ (declaration.value));
	let text = '';
	for (const [index, slot] of slots.entries()) {
		if (index > 0) {
			text += sourceCode.text.slice(sourceCode.getRange(/** @type {CssNodePlain} */ (groups[index - 1].nodes.at(-1)))[1], sourceCode.getRange(groups[index].nodes[0])[0]);
		}

		text += getSlotText(slot, sourceCode);
	}

	return text;
};

/**
@param {DeclarationPlain} declaration
@param {DeclarationPlain} baseline
@param {{property: string, getComponents: (declaration: DeclarationPlain) => ReturnType<typeof getShorthandComponents>, context: CssicornContext}} options
*/
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
	const parsedValue = /** @type {ValuePlain} */ (toPlainObject(parse(value, {context: 'value'})));
	if (!sourceCode.lexer.matchProperty(changed.property, getCanonicalLexerNode(parsedValue)).matched) {
		return;
	}

	const valueNodes = /** @type {ValuePlain} */ (declaration.value).children;
	const data = {property, component: changed.property};
	/**
	@type {CssicornProblem}
	*/
	const problem = {node: declaration, messageId: MESSAGE_ID, data};
	if (!hasCommentInRange(context, sourceCode.getRange(declaration))) {
		const start = sourceCode.getRange(declaration)[0];
		problem.suggest = [{
			messageId: MESSAGE_ID_SUGGESTION,
			data,
			* fix(fixer) {
				yield fixer.replaceTextRange([start, start + declaration.property.length], changed.property);
				yield fixer.replaceTextRange([sourceCode.getRange(valueNodes[0])[0], sourceCode.getRange(/** @type {CssNodePlain} */ (valueNodes.at(-1)))[1]], value);
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
	/**
	@type {WeakMap<BlockPlain, BlockDeclarations>}
	*/
	const blockDeclarations = new WeakMap();
	/**
	@type {WeakMap<DeclarationPlain, ReturnType<typeof getShorthandComponents>>}
	*/
	const componentsByDeclaration = new WeakMap();
	/**
	@param {BlockPlain} block
	*/
	const getInfo = block => {
		const info = blockDeclarations.get(block) ?? getBlockDeclarations(block, context);
		blockDeclarations.set(block, info);
		return info;
	};

	/**
	@param {DeclarationPlain} declaration
	*/
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

		/**
		@type {SelectorIndex}
		*/
		const index = new Map();
		const owner = sourceCode.getParent(container);
		if (container.type === 'Block' && owner?.type === 'Rule' && isStyleRule(owner, context) && getSelectors(owner)) {
			registerSelectors(index, [nestingKey], getInfo(container));
		}

		for (const rule of container.children) {
			if (rule.type !== 'Rule' || !isStyleRule(rule, context)) {
				continue;
			}

			const info = getInfo(rule.block);
			const prefixes = getSelectors(rule)?.map(selector => getSelectorPrefixes(selector));
			if (!prefixes || prefixes.includes(undefined)) {
				if (info.affecting.size > 0 || info.hasAll) {
					index.clear();
				}

				continue;
			}

			const selectorPrefixes = /** @type {SelectorPrefixes[]} */ (prefixes);
			for (const [property, declaration] of info.declarations) {
				if (getFamilyDeclaration(info, property) === INVALID_BASELINE) {
					continue;
				}

				const baseline = getBaseline(selectorPrefixes, property, index);
				if (!baseline || sourceCode.getRange(baseline)[0] >= sourceCode.getRange(rule)[0]) {
					continue;
				}

				yield getProblem(declaration, baseline, {property, getComponents, context});
			}

			registerSelectors(index, selectorPrefixes.map(({key}) => key), info);
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
