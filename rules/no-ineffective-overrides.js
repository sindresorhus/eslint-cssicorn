// @ts-check

import {
	find,
	generate,
	ident,
	tokenize,
	tokenTypes,
} from '@eslint/css-tree';
import {canMatchSelector, LEGACY_PSEUDO_ELEMENTS} from './shared/css-selector-specificity.js';
import {
	getAtRuleContextPart,
	getSingleValueIdentifier,
	hasSubstitutionOrRandomFunction,
	isSubstitutionFunction,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {CssNodePlain, DeclarationPlain, RulePlain, SelectorPlain} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

/**
@typedef {ReturnType<typeof getSelectorAnalysis>} SelectorAnalysis
@typedef {{conditions: string[], layered: boolean, selectors?: SelectorAnalysis[]}} DeclarationContext
@typedef {DeclarationContext & {selectors: SelectorAnalysis[], declaration: DeclarationPlain, property: string, important: boolean}} DeclarationRecord
*/

const MESSAGE_ID = 'no-ineffective-overrides';
const messages = {
	[MESSAGE_ID]: '`{{property}}` cannot override the declaration on line {{line}} because {{reason}}.',
};
const CONDITIONAL_RULES = new Set(['media', 'supports', 'container']);
const UNSUPPORTED_PSEUDO_CLASSES = new Set(['host', 'host-context', 'scope']);
const ROLLBACK_KEYWORDS = new Set(['revert', 'revert-layer']);
const ALL_EXCLUDED_PROPERTIES = new Set(['direction', 'unicode-bidi']);

/**
@param {string} property
*/
const getPropertyKey = property => {
	const decoded = ident.decode(property);
	return decoded.startsWith('--') ? decoded : normalizeCssIdentifier(property);
};

/**
@param {CssNodePlain} node
*/
const getNodeKey = node => {
	switch (node.type) {
		case 'ClassSelector':
		case 'IdSelector':
		case 'TypeSelector': {
			return JSON.stringify([node.type, ident.decode(node.name)]);
		}

		case 'PseudoClassSelector': {
			return generate({...node, name: normalizeCssIdentifier(node.name)});
		}

		default: {
			return generate(node);
		}
	}
};

/**
@param {CssNodePlain[]} nodes
*/
const getSelectorAnalysis = nodes => {
	const terminalStart = nodes.findLastIndex(node => node.type === 'Combinator') + 1;
	const nodeKeys = nodes.map(node => getNodeKey(node));
	const key = JSON.stringify(nodeKeys);
	const candidateKeys = new Set([key]);
	const baseNodeKeys = nodeKeys.filter((_, index) => index < terminalStart || nodes[index].type !== 'PseudoClassSelector');
	if (baseNodeKeys.length > terminalStart) {
		candidateKeys.add(JSON.stringify(baseNodeKeys));
	}

	const attributeBaseNodeKeys = nodeKeys.filter((_, index) => index < terminalStart || !['PseudoClassSelector', 'AttributeSelector'].includes(nodes[index].type));
	if (attributeBaseNodeKeys.length > terminalStart && attributeBaseNodeKeys.length < baseNodeKeys.length) {
		candidateKeys.add(JSON.stringify(attributeBaseNodeKeys));
	}

	// Appending conditions to the final compound preserves every condition of the base selector.
	for (let end = terminalStart + 1; end < nodes.length; end++) {
		candidateKeys.add(JSON.stringify(nodeKeys.slice(0, end)));
	}

	return {
		key,
		candidateKeys,
		nodes,
	};
};

/**
@param {RulePlain} rule
@param {SelectorAnalysis[] | undefined} parentSelectors
*/
const getResolvedSelectors = (rule, parentSelectors) => {
	if (rule.prelude.type !== 'SelectorList' || (parentSelectors && parentSelectors.length !== 1)) {
		return;
	}

	const selectors = [];
	// SelectorListPlain.children is typed as CssNodePlain[] rather than SelectorPlain[].
	for (const selector of /** @type {SelectorPlain[]} */ (rule.prelude.children)) {
		if (!canMatchSelector(selector) || find(selector, node => {
			if (node.type === 'Raw' || node.type === 'PseudoElementSelector') {
				return true;
			}

			if (node.type === 'TypeSelector') {
				const name = ident.decode(node.name);
				return name.includes('|') || (name === '*' && node.name !== '*');
			}

			if (node.type === 'PseudoClassSelector') {
				const name = normalizeCssIdentifier(node.name);
				return LEGACY_PSEUDO_ELEMENTS.has(name) || UNSUPPORTED_PSEUDO_CLASSES.has(name);
			}

			return node.type === 'NestingSelector' && node !== selector.children.at(0);
		})) {
			return;
		}

		let nodes = selector.children;
		const hasLeadingNesting = nodes[0]?.type === 'NestingSelector';
		if (parentSelectors) {
			const parentNodes = parentSelectors[0].nodes;
			if (hasLeadingNesting) {
				nodes = nodes.slice(1);
			} else if (nodes[0]?.type !== 'Combinator') {
				nodes = [{type: 'Combinator', name: ' '}, ...nodes];
			}

			nodes = [...parentNodes, ...nodes];
		} else if (hasLeadingNesting || nodes[0]?.type === 'Combinator') {
			return;
		}

		selectors.push(getSelectorAnalysis(nodes));
	}

	return selectors.length > 0 ? selectors : undefined;
};

/**
@param {DeclarationPlain} declaration
*/
const getValueKeyword = declaration => {
	if (declaration.value.type !== 'Raw') {
		const identifier = getSingleValueIdentifier(declaration);
		return identifier ? normalizeCssIdentifier(identifier.name) : undefined;
	}

	const {value} = declaration.value;
	/**
	@type {{type: number, value: string}[]}
	*/
	const tokens = [];
	tokenize(value, (type, start, end) => {
		if (type !== tokenTypes.WhiteSpace && type !== tokenTypes.Comment) {
			tokens.push({type, value: value.slice(start, end)});
		}
	});

	return tokens.length === 1 && tokens[0].type === tokenTypes.Ident ? normalizeCssIdentifier(tokens[0].value) : undefined;
};

/**
@param {DeclarationPlain['value']} value
*/
const hasUnresolvedValue = value => {
	if (value.type !== 'Raw') {
		return hasSubstitutionOrRandomFunction(value);
	}

	let unresolved = false;
	tokenize(value.value, (type, start, end) => {
		if (type === tokenTypes.Function) {
			const name = value.value.slice(start, end - 1);
			unresolved ||= isSubstitutionFunction({type: 'Function', name}) || normalizeCssIdentifier(name) === 'random';
		}
	});

	return unresolved;
};

/**
@param {DeclarationRecord} base
@param {DeclarationRecord} override
*/
const getBlockingReason = (base, override) => {
	if (base.important !== override.important) {
		return base.important ? 'it is marked `!important`' : undefined;
	}

	if (base.layered !== override.layered) {
		if (!base.important && !base.layered) {
			return 'unlayered normal declarations take precedence over layered declarations';
		}

		if (base.important && base.layered) {
			return 'layered important declarations take precedence over unlayered important declarations';
		}
	}
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	/**
	@type {WeakMap<CssNodePlain, DeclarationContext | undefined>}
	*/
	const contexts = new WeakMap();
	/**
	@type {DeclarationRecord[]}
	*/
	const records = [];
	/**
	@type {Map<string, DeclarationRecord[]>}
	*/
	const recordsByKey = new Map();
	/**
	@type {Set<string>}
	*/
	const rollbackProperties = new Set();
	/**
	@type {WeakMap<DeclarationPlain, boolean>}
	*/
	const blockerValidity = new WeakMap();

	/**
	@param {CssNodePlain | undefined} node
	@returns {DeclarationContext | undefined}
	*/
	const getContext = node => {
		if (!node) {
			return;
		}

		if (contexts.has(node)) {
			return contexts.get(node);
		}

		if (node.type === 'StyleSheet') {
			return {conditions: [], layered: false};
		}

		const parent = sourceCode.getParent(node);
		let result = parent && getContext(parent);
		if (result && node.type === 'Atrule') {
			const name = normalizeCssIdentifier(node.name);
			if (name === 'layer') {
				result = {...result, layered: true};
			} else if (CONDITIONAL_RULES.has(name)) {
				result = {...result, conditions: [...result.conditions, JSON.stringify(getAtRuleContextPart(node, context))]};
			} else {
				result = undefined;
			}
		} else if (result && node.type === 'Rule') {
			const selectors = getResolvedSelectors(node, result.selectors);
			result = selectors ? {...result, selectors} : undefined;
		}

		contexts.set(node, result);
		return result;
	};

	/**
	@param {DeclarationRecord} record
	*/
	const isUsableBlocker = record => {
		const {declaration, property} = record;
		if (!blockerValidity.has(declaration)) {
			const {value} = declaration;
			const usable = !hasUnresolvedValue(value)
				&& (property.startsWith('--') || (value.type === 'Value' && !sourceCode.lexer.matchProperty(property, value).error));
			blockerValidity.set(declaration, usable);
		}

		return blockerValidity.get(declaration) === true;
	};

	context.on('Declaration', declaration => {
		const property = getPropertyKey(declaration.property);
		// Rollback can remove a blocker elsewhere in the cascade. Leave this property unchecked rather than simulate the entire cascade.
		const keyword = getValueKeyword(declaration);
		if (keyword && ROLLBACK_KEYWORDS.has(keyword)) {
			rollbackProperties.add(property);
		}

		const declarationContext = getContext(sourceCode.getParent(declaration));
		if (!declarationContext?.selectors) {
			return;
		}

		const record = {
			...declarationContext, selectors: declarationContext.selectors, declaration, property, important: Boolean(declaration.important),
		};
		records.push(record);
		for (const selector of record.selectors) {
			const key = JSON.stringify([property, selector.key]);
			let entries = recordsByKey.get(key);
			if (!entries) {
				entries = [];
				recordsByKey.set(key, entries);
			}

			entries.push(record);
		}
	});

	/**
	@param {DeclarationRecord} override
	@param {SelectorAnalysis} selector
	*/
	const getBlocker = (override, selector) => {
		for (const key of selector.candidateKeys) {
			const entries = recordsByKey.get(JSON.stringify([override.property, key])) ?? [];
			const blocker = entries.find(base => base.declaration !== override.declaration
				&& base.conditions.length <= override.conditions.length
				&& base.conditions.every((condition, index) => condition === override.conditions[index])
				&& (key !== selector.key || base.conditions.length < override.conditions.length || base.layered !== override.layered)
				&& getBlockingReason(base, override)
				&& isUsableBlocker(base));
			if (blocker) {
				return blocker;
			}
		}
	};

	context.onExit('StyleSheet', function * () {
		for (const override of records) {
			if (
				rollbackProperties.has(override.property)
				|| (rollbackProperties.has('all') && !override.property.startsWith('--') && !ALL_EXCLUDED_PROPERTIES.has(override.property))
			) {
				continue;
			}

			/**
			@type {DeclarationRecord | undefined}
			*/
			let blocker;
			// A declaration in a selector list can still apply through an unblocked branch.
			const allBlocked = override.selectors.every(selector => {
				blocker = getBlocker(override, selector);
				return Boolean(blocker);
			});

			if (allBlocked && blocker) {
				yield {
					node: override.declaration,
					messageId: MESSAGE_ID,
					data: {
						property: override.declaration.property,
						line: String(sourceCode.getLoc(blocker.declaration).start.line),
						reason: getBlockingReason(blocker, override),
					},
				};
			}
		}
	});
};

/**
@type {CssicornRule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow state and conditional overrides blocked by cascade priority.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
