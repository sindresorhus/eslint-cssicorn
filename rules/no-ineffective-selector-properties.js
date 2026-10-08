// @ts-check

import {shorthandToAffectedProperties} from './shared/css-shorthand-properties.js';
import {getSelectorArgument, LEGACY_PSEUDO_ELEMENTS} from './shared/css-selector-specificity.js';
import {functionalPseudoSelectors, nonFunctionalPseudoSelectors} from './shared/standard-pseudo-selectors.js';
import {hasCommentInRange, normalizeCssIdentifier} from './utils/index.js';

/**
@import {BlockPlain, RulePlain, SelectorPlain, PseudoElementSelectorPlain, PseudoClassSelectorPlain} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornRuleFixer} from './rule/to-eslint-rule-fixer.js';
*/

const MESSAGE_ID = 'no-ineffective-selector-properties';
const messages = {
	[MESSAGE_ID]: '`{{property}}` has no effect on the targets selected by {{selectors}}.',
};

/**
Get the property names and their affected shorthand components from the finite shared catalog.

@param {string[]} properties
*/
const getPropertyNames = properties => properties.flatMap(property => [property, ...shorthandToAffectedProperties.get(property) ?? []]);

// Use a denylist, since marker text inheritance and future properties make exhaustive allowlists unsafe.
const commonProperties = new Set([
	...getPropertyNames([
		'margin',
		'margin-block',
		'margin-inline',
		'padding',
		'padding-block',
		'padding-inline',
		'inset',
		'inset-block',
		'inset-inline',
		'border-width',
		'border-block-width',
		'border-inline-width',
		'border-style',
		'border-block-style',
		'border-inline-style',
		'border-radius',
	]),
	'width',
	'height',
	'min-width',
	'min-height',
	'max-width',
	'max-height',
	'inline-size',
	'block-size',
	'min-inline-size',
	'min-block-size',
	'max-inline-size',
	'max-block-size',
	'display',
	'position',
	'opacity',
	'transform',
	'transform-origin',
	'translate',
	'rotate',
	'scale',
	'box-shadow',
	'background-image',
	'background-position',
	'background-position-x',
	'background-position-y',
	'background-size',
	'background-repeat',
	'background-origin',
	'background-clip',
	'background-attachment',
	'border-start-start-radius',
	'border-start-end-radius',
	'border-end-start-radius',
	'border-end-end-radius',
]);
const fontProperties = getPropertyNames(['font', 'font-synthesis', 'font-width']);
const borderColorProperties = [
	...getPropertyNames(['border-color', 'border-block-color', 'border-inline-color']),
	'border',
	'border-top',
	'border-right',
	'border-bottom',
	'border-left',
	'border-block',
	'border-block-start',
	'border-block-end',
	'border-inline',
	'border-inline-start',
	'border-inline-end',
];
const highlightProperties = new Set([...commonProperties, ...fontProperties, ...borderColorProperties]);
const markerProperties = new Set([...commonProperties, ...borderColorProperties, 'background', 'background-color']);
const visitedProperties = new Set([...commonProperties, ...fontProperties, 'text-shadow']);
// Browsers may apply other properties to first-line and placeholder text, but these are explicitly excluded.
const firstLineProperties = new Set(['writing-mode', 'direction', 'text-orientation']);
const highlightSelectors = new Set(['selection', 'target-text', 'spelling-error', 'grammar-error', 'search-text', 'highlight']);
const transparentAtRules = new Set(['media', 'supports', 'container', 'layer', 'starting-style']);
const standardFunctionalPseudoSelectors = new Set(functionalPseudoSelectors);
const standardNonFunctionalPseudoSelectors = new Set(nonFunctionalPseudoSelectors);

/**
Check whether a pseudo-class requires its target to be a visited link.

@param {PseudoClassSelectorPlain} node
@returns {boolean}
*/
const isVisitedPseudoClass = node => {
	const name = normalizeCssIdentifier(node.name);
	if (name === 'visited') {
		return node.children === null;
	}

	if (name !== 'is' && name !== 'where') {
		return false;
	}

	const selectorList = getSelectorArgument(node);
	return selectorList?.type === 'SelectorList'
		&& selectorList.children.length > 0
		&& selectorList.children.every(selector => selector.type === 'Selector' && getSelectorRestriction(selector)?.selector === ':visited');
};

/**
Get the restriction on the final selected compound, including all-visited `:is()` and `:where()` arguments and direct nesting selectors with all-visited parents.

@param {SelectorPlain} selector
@param {boolean} [parentIsVisited=false]
*/
const getSelectorRestriction = (selector, parentIsVisited = false) => {
	for (const node of selector.children) {
		if (node.type !== 'PseudoClassSelector' && node.type !== 'PseudoElementSelector') {
			continue;
		}

		const prefix = node.type === 'PseudoElementSelector' ? '::' : ':';
		const standardPseudoSelectors = node.children === null ? standardNonFunctionalPseudoSelectors : standardFunctionalPseudoSelectors;
		if (!standardPseudoSelectors.has(`${prefix}${normalizeCssIdentifier(node.name)}`)) {
			return;
		}
	}

	const compound = selector.children.slice(selector.children.findLastIndex(node => node.type === 'Combinator') + 1);
	const pseudoElement = /** @type {PseudoElementSelectorPlain | PseudoClassSelectorPlain | undefined} */ (compound.findLast(node => node.type === 'PseudoElementSelector'
		|| (node.type === 'PseudoClassSelector' && LEGACY_PSEUDO_ELEMENTS.has(normalizeCssIdentifier(node.name)))));
	if (pseudoElement) {
		const name = normalizeCssIdentifier(pseudoElement.name);
		if (highlightSelectors.has(name)) {
			return {selector: `::${name}`, properties: highlightProperties};
		}

		if (name === 'marker') {
			return {selector: '::marker', properties: markerProperties};
		}

		if (name === 'first-line' || name === 'placeholder') {
			return {selector: `::${name}`, properties: firstLineProperties};
		}

		return;
	}

	if (compound.some(node => (node.type === 'PseudoClassSelector' && isVisitedPseudoClass(node))
		|| (node.type === 'NestingSelector' && parentIsVisited))) {
		return {selector: ':visited', properties: visitedProperties};
	}
};

/**
Get the enclosing selector restrictions, crossing only grouping rules with unchanged selector context.

@param {BlockPlain | RulePlain} node
@param {CssicornContext['sourceCode']} sourceCode
@returns {Array<{selector: string, properties: Set<string>}> | undefined}
*/
const getEnclosingRestrictions = (node, sourceCode) => {
	let parent = sourceCode.getParent(node);
	while (parent) {
		if (parent.type === 'Rule') {
			if (parent.prelude?.type !== 'SelectorList') {
				return;
			}

			// Selector lists contain selectors, but the upstream type currently allows any CSS node.
			const selectors = /** @type {SelectorPlain[]} */ (parent.prelude.children);
			const parentIsVisited = selectors.some(selector => selector.children.some(child => child.type === 'NestingSelector'))
				&& getEnclosingRestrictions(parent, sourceCode)?.every(restriction => restriction.selector === ':visited');
			const restrictions = selectors.map(selector => getSelectorRestriction(selector, parentIsVisited));
			return restrictions.length > 0 && restrictions.every(restriction => restriction !== undefined) ? restrictions : undefined;
		}

		if (parent.type === 'Atrule' && !transparentAtRules.has(normalizeCssIdentifier(parent.name))) {
			return;
		}

		parent = sourceCode.getParent(parent);
	}
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Block', function * (block) {
		const restrictions = getEnclosingRestrictions(block, sourceCode);
		if (!restrictions) {
			return;
		}

		for (const node of block.children) {
			if (node.type !== 'Declaration' || node.value.type !== 'Value') {
				continue;
			}

			const property = normalizeCssIdentifier(node.property);
			if (restrictions.some(({properties}) => !properties.has(property))) {
				continue;
			}

			yield {
				node,
				messageId: MESSAGE_ID,
				data: {property, selectors: [...new Set(restrictions.map(({selector}) => selector))].join(', ')},
				/**
				@type {CssicornRuleFixer}
				*/
				fix(fixer, {abort}) {
					const [start, end] = sourceCode.getRange(node);
					if (hasCommentInRange(context, [start, end])) {
						abort();
					}

					return fixer.removeRange([start, end + (sourceCode.text[end] === ';' ? 1 : 0)]);
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
		type: 'problem',
		docs: {
			description: 'Disallow properties that cannot affect their selected targets.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
