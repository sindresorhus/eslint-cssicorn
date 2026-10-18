// @ts-check

import {find, generate} from '@eslint/css-tree';
import cssMathFunctions from './shared/css-math-functions.js';
import {canBeRepresentedByNestingSelector} from './shared/css-selector-specificity.js';
import {
	getCanonicalLexerNode,
	getCssWideKeyword,
	getNodesRange,
	hasCommentInRange,
	hasSubstitutionOrRandomFunction,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {BlockPlain, CssNodePlain, DeclarationPlain, FunctionNodePlain, Identifier, RulePlain, SelectorPlain, StyleSheetPlain} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

/**
@typedef {Map<string, DeclarationPlain | undefined>} Declarations
@typedef {Map<string, {rule: RulePlain, selector: SelectorPlain} | undefined>} RulesBySelector
*/

const MESSAGE_ID = 'prefer-subgrid';
const MESSAGE_ID_SUGGESTION = 'prefer-subgrid/suggestion';
const messages = {
	[MESSAGE_ID]: 'Consider using `subgrid` for `{{property}}` to share the parent grid’s tracks.',
	[MESSAGE_ID_SUGGESTION]: 'Replace this track definition with `subgrid`.',
};

const groupingRules = new Set(['media', 'supports', 'container', 'layer', 'scope']);
const resetProperties = new Set(['all', 'grid', 'grid-template', 'grid-template-areas', 'writing-mode']);
const gridDisplays = new Set(['grid', 'inline-grid', 'block grid', 'inline grid', 'grid block', 'grid inline']);
const templateFunctions = new Set(['repeat', 'minmax', 'fit-content', ...cssMathFunctions]);

/**
Exclude local child positioning and containment controls instead of interpreting their values.
*/
const childBlockers = ['position', 'contain', 'content-visibility', 'container', 'container-type'];

/**
Get a single supported selector, excluding pseudo-element targets and interop selectors.

@param {RulePlain} rule
*/
function getSelector(rule) {
	if (rule.prelude?.type !== 'SelectorList' || rule.prelude.children.length !== 1) {
		return;
	}

	// SelectorListPlain.children currently uses the broader CssNodePlain[] type.
	const [selector] = /** @type {SelectorPlain[]} */ (rule.prelude.children);
	if (!canBeRepresentedByNestingSelector(selector) || find(selector, node => node.type === 'Raw')) {
		return;
	}

	return selector;
}

/**
Check a shared structural scope without interpreting conditional expressions.

@param {StyleSheetPlain | BlockPlain} node
@param {CssicornContext} context
*/
function isSupportedContext(node, context) {
	for (const ancestor of context.sourceCode.getAncestors(node)) {
		if (ancestor.type === 'Rule' && !getSelector(ancestor)) {
			return false;
		}

		if (ancestor.type !== 'Atrule') {
			continue;
		}

		const name = normalizeCssIdentifier(ancestor.name);
		if (!groupingRules.has(name)) {
			return false;
		}

		// An explicit feature query may be a deliberate subgrid fallback, regardless of its polarity.
		if (name === 'supports' && ancestor.prelude && find(ancestor.prelude, child => child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'subgrid')) {
			return false;
		}
	}

	return true;
}

/**
Collect local declarations, leaving duplicate properties unusable instead of resolving the cascade.

@param {RulePlain} rule
*/
function getDeclarations(rule) {
	/**
	@type {Declarations}
	*/
	const declarations = new Map();
	for (const declaration of rule.block.children) {
		if (declaration.type !== 'Declaration') {
			continue;
		}

		const property = normalizeCssIdentifier(declaration.property);
		if (resetProperties.has(property)) {
			return;
		}

		declarations.set(property, declarations.has(property) ? undefined : declaration);
	}

	const display = declarations.get('display');
	if (display?.value.type !== 'Value' || display.value.children.some(node => node.type !== 'Identifier')) {
		return;
	}

	const displayValue = /** @type {Identifier[]} */ (display.value.children).map(node => normalizeCssIdentifier(node.name)).join(' ');
	return gridDisplays.has(displayValue) ? declarations : undefined;
}

/**
Get a local placement value, ignoring formatting and comments.

@param {DeclarationPlain | undefined} declaration
*/
function getPlacementValue(declaration) {
	return declaration?.value.type === 'Value' ? generate(declaration.value) : undefined;
}

/**
Check only explicit full-span placement, without counting or resolving track definitions.

@param {Declarations} declarations
@param {'column' | 'row'} axis
*/
function hasFullSpan(declarations, axis) {
	if (declarations.has('grid-area')) {
		return false;
	}

	const property = `grid-${axis}`;
	const shorthand = declarations.get(property);
	const start = declarations.get(`${property}-start`);
	const end = declarations.get(`${property}-end`);
	if (declarations.has(property)) {
		if (!shorthand || declarations.has(`${property}-start`) || declarations.has(`${property}-end`)) {
			return false;
		}

		return getPlacementValue(shorthand) === '1/-1';
	}

	return getPlacementValue(start) === '1' && getPlacementValue(end) === '-1';
}

/**
Normalize case-insensitive template tokens while preserving case-sensitive line names and numeric spellings.

@template {CssNodePlain} Node
@param {Node} node
@returns {Node}
*/
function normalizeTemplate(node) {
	if (node.type === 'Brackets') {
		return getCanonicalLexerNode(node);
	}

	let result = node;
	if (node.type === 'Function' || node.type === 'Identifier') {
		result = {...node, name: normalizeCssIdentifier(node.name)};
	} else if (node.type === 'Dimension') {
		result = {...node, unit: normalizeCssIdentifier(node.unit)};
	}

	if ('children' in node && node.children) {
		result = {...result, children: node.children.map(child => normalizeTemplate(child))};
	}

	return result;
}

/**
Get a validated structural template key without expanding repetitions or evaluating values.

@param {DeclarationPlain | undefined} declaration
@param {CssicornContext} context
*/
function getTemplateKey(declaration, context) {
	if (!declaration || declaration.value.type !== 'Value' || getCssWideKeyword(declaration) || hasSubstitutionOrRandomFunction(declaration.value)) {
		return;
	}

	const value = normalizeTemplate(declaration.value);
	if (find(value, node => node.type === 'Function' && (
		!templateFunctions.has(node.name)
		|| (node.name === 'repeat' && /** @type {FunctionNodePlain} */ (node).children.at(0)?.type === 'Identifier')
	))) {
		return;
	}

	const text = generate(value);
	const [firstChild] = value.children;
	if (['none', 'subgrid', 'masonry'].includes(text) || (firstChild?.type === 'Identifier' && firstChild.name === 'subgrid')) {
		return;
	}

	return context.sourceCode.lexer.matchProperty(normalizeCssIdentifier(declaration.property), value).matched ? text : undefined;
}

/**
Find an exact sibling parent or the immediate owner of a native nested child selector.

@param {SelectorPlain} selector
@param {StyleSheetPlain | BlockPlain} block
@param {RulesBySelector} rulesBySelector
@param {CssicornContext} context
*/
function getParentRule(selector, block, rulesBySelector, context) {
	const separator = selector.children.findLastIndex(node => node.type === 'Combinator');
	const combinator = selector.children[separator];
	if (combinator?.type !== 'Combinator' || combinator.name !== '>') {
		return;
	}

	// The child must have its own target; a nesting selector here can target an element outside this scope.
	const childSelector = {...selector, children: selector.children.slice(separator + 1)};
	if (find(childSelector, node => node.type === 'NestingSelector')) {
		return;
	}

	const prefix = selector.children.slice(0, separator);
	if (prefix.length === 0 || (prefix.length === 1 && prefix[0].type === 'NestingSelector')) {
		const owner = context.sourceCode.getParent(block);
		return owner?.type === 'Rule' ? owner : undefined;
	}

	const parentSelector = {...selector, children: prefix};
	if (!find(parentSelector, node => node.type === 'NestingSelector')) {
		return rulesBySelector.get(generate(parentSelector))?.rule;
	}
}

/**
@param {CssicornContext} context
*/
const create = context => {
	/**
	@type {WeakMap<RulePlain, Declarations | undefined>}
	*/
	const declarationsByRule = new WeakMap();
	/**
	@type {WeakMap<DeclarationPlain, string | undefined>}
	*/
	const templateKeys = new WeakMap();
	/**
	@param {RulePlain} rule
	*/
	const getLocalDeclarations = rule => {
		if (!declarationsByRule.has(rule)) {
			declarationsByRule.set(rule, getDeclarations(rule));
		}

		return declarationsByRule.get(rule);
	};

	/**
	@param {DeclarationPlain | undefined} declaration
	*/
	const getKey = declaration => {
		if (!declaration) {
			return;
		}

		if (!templateKeys.has(declaration)) {
			templateKeys.set(declaration, getTemplateKey(declaration, context));
		}

		return templateKeys.get(declaration);
	};

	context.onExit(['StyleSheet', 'Block'], function * (block) {
		const rules = block.children.filter(node => node.type === 'Rule');
		if (rules.length === 0 || !isSupportedContext(block, context)) {
			return;
		}

		/**
		@type {RulesBySelector}
		*/
		const rulesBySelector = new Map();
		for (const rule of rules) {
			const selector = getSelector(rule);
			if (selector) {
				const key = generate(selector);
				rulesBySelector.set(key, rulesBySelector.has(key) ? undefined : {rule, selector});
			}
		}

		for (const entry of rulesBySelector.values()) {
			if (!entry) {
				continue;
			}

			const {rule, selector} = entry;
			const parent = getParentRule(selector, block, rulesBySelector, context);
			if (!parent) {
				continue;
			}

			const parentDeclarations = getLocalDeclarations(parent);
			const childDeclarations = getLocalDeclarations(rule);
			if (!parentDeclarations || !childDeclarations || childBlockers.some(property => childDeclarations.has(property))) {
				continue;
			}

			for (const axis of /** @type {const} */ (['column', 'row'])) {
				const property = `grid-template-${axis}s`;
				const declaration = childDeclarations.get(property);
				if (!declaration || declaration.value.type !== 'Value' || !hasFullSpan(childDeclarations, axis)) {
					continue;
				}

				const parentKey = getKey(parentDeclarations.get(property));
				if (!parentKey || parentKey !== getKey(declaration)) {
					continue;
				}

				const replacementRange = getNodesRange(declaration.value.children, context);
				yield {
					node: declaration,
					messageId: MESSAGE_ID,
					data: {property},
					suggest: hasCommentInRange(context, replacementRange)
						? []
						: [
							{
								messageId: MESSAGE_ID_SUGGESTION,
								fix: fixer => fixer.replaceTextRange(replacementRange, 'subgrid'),
							},
						],
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
		type: 'suggestion',
		docs: {
			description: 'Prefer subgrid over repeated parent grid track definitions.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
