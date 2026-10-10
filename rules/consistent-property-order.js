// @ts-check

import concentricPropertyOrder from './shared/concentric-property-order.js';
import propertyInteractions from './shared/css-property-interactions.js';
import {
	getBlockOwner,
	groupingAtRules,
	hasCommentInRange,
	isCssModulesInteropDeclaration,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {CssNodePlain, DeclarationPlain} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornRuleFixer} from './rule/to-eslint-rule-fixer.js';
*/

/**
@typedef {{node: DeclarationPlain, property: string, rank: number | string, text: string, replacementRange: [number, number]}} DeclarationEntry
*/

const MESSAGE_ID = 'consistent-property-order';
const MESSAGE_ID_SUGGESTION = 'consistent-property-order/suggestion';
const messages = {
	[MESSAGE_ID]: 'Expected property `{{expected}}` before `{{actual}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Reorder properties. This may change the cascade.',
};
const concentricRanks = new Map([
	...concentricPropertyOrder.map((property, index) => /** @type {[string, number]} */ ([property, index])),
	// The two names identify the same property, so keep their fallback order.
	['font-width', concentricPropertyOrder.indexOf('font-stretch')],
]);
const pageMarginAtRules = new Set([
	'top-left-corner',
	'top-left',
	'top-center',
	'top-right',
	'top-right-corner',
	'bottom-left-corner',
	'bottom-left',
	'bottom-center',
	'bottom-right',
	'bottom-right-corner',
	'left-top',
	'left-middle',
	'left-bottom',
	'right-top',
	'right-middle',
	'right-bottom',
]);

/**
Recognize style properties in ordinary rules, Tailwind utilities and variants, and specific page and positioning contexts.

@param {DeclarationPlain} declaration
@param {CssicornContext} context
*/
const isPropertyOrderingContext = (declaration, context) => {
	let owner = getBlockOwner(declaration, context);
	if (owner?.type === 'Rule') {
		return true;
	}

	if (owner?.type !== 'Atrule') {
		return false;
	}

	const name = normalizeCssIdentifier(owner.name);
	if (name === 'page' || name === 'position-try') {
		return true;
	}

	if (pageMarginAtRules.has(name)) {
		const page = getBlockOwner(owner, context);
		return page?.type === 'Atrule' && normalizeCssIdentifier(page.name) === 'page';
	}

	while (owner?.type === 'Atrule') {
		const ancestorName = normalizeCssIdentifier(owner.name);
		if (ancestorName === 'utility') {
			return true;
		}

		if (ancestorName !== 'variant' && !groupingAtRules.has(ancestorName)) {
			return false;
		}

		owner = getBlockOwner(owner, context);
	}

	return owner?.type === 'Rule';
};

/**
Check only pairs whose relative order changes, preserving fallback and override semantics.

@param {DeclarationEntry[]} declarations
*/
const isSafeOrder = declarations => {
	for (const [index, first] of declarations.entries()) {
		for (let secondIndex = index + 1; secondIndex < declarations.length; secondIndex++) {
			const second = declarations[secondIndex];
			if (first.rank <= second.rank) {
				continue;
			}

			const firstInteractions = /** @type {Set<string>} */ (propertyInteractions.get(first.property));
			const secondInteractions = /** @type {Set<string>} */ (propertyInteractions.get(second.property));
			if (
				first.property === 'all'
				|| second.property === 'all'
				|| !firstInteractions.isDisjointFrom(secondInteractions)
			) {
				return false;
			}
		}
	}

	return true;
};

/**
Build one problem for a sortable declaration run.

@param {DeclarationEntry[]} declarations
*/
const getRunProblem = declarations => {
	if (declarations.every((declaration, index) => index === 0 || declarations[index - 1].rank <= declaration.rank)) {
		return;
	}

	const sorted = declarations.toSorted((first, second) => {
		if (first.rank === second.rank) {
			return 0;
		}

		return first.rank < second.rank ? -1 : 1;
	});
	const firstChangedIndex = sorted.findIndex((declaration, index) => declaration !== declarations[index]);
	/**
	@param {Parameters<CssicornRuleFixer>[0]} fixer
	*/
	function * fix(fixer) {
		for (const [index, declaration] of declarations.entries()) {
			if (declaration !== sorted[index]) {
				yield fixer.replaceTextRange(declaration.replacementRange, sorted[index].text);
			}
		}
	}

	return {
		node: sorted[firstChangedIndex].node,
		messageId: MESSAGE_ID,
		data: {
			expected: sorted[firstChangedIndex].node.property,
			actual: declarations[firstChangedIndex].node.property,
		},
		...isSafeOrder(declarations)
			? {fix}
			: {suggest: [{messageId: MESSAGE_ID_SUGGESTION, fix}]},
	};
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {order} = /** @type {{order: 'concentric-css' | 'alphabetical' | string[]}} */ (context.options[0]);
	let ranks = concentricRanks;
	if (Array.isArray(order)) {
		ranks = new Map();
		for (const [index, property] of order.entries()) {
			const normalized = normalizeCssIdentifier(property);
			if (!ranks.has(normalized)) {
				ranks.set(normalized, index);
			}
		}
	}

	const directiveTargetLines = sourceCode.getDisableDirectives().directives.flatMap(({type, node}) => {
		const location = sourceCode.getLoc(/** @type {CssNodePlain} */ (node));
		if (type === 'disable-next-line') {
			return [location.end.line + 1];
		}

		return type === 'disable-line' ? [location.start.line] : [];
	});

	context.on('Block', function * (block) {
		const firstDeclaration = block.children.find(child => child.type === 'Declaration');
		if (
			!firstDeclaration
			|| !isPropertyOrderingContext(firstDeclaration, context)
			|| isCssModulesInteropDeclaration(firstDeclaration, context)
		) {
			return;
		}

		const location = sourceCode.getLoc(block);
		if (directiveTargetLines.some(line => line >= location.start.line && line <= location.end.line)) {
			return;
		}

		/**
		@type {DeclarationEntry[]}
		*/
		let declarations = [];
		for (const node of block.children) {
			const property = node.type === 'Declaration' ? normalizeCssIdentifier(node.property) : '';
			const rank = order === 'alphabetical' ? property : ranks.get(property);
			if (
				node.type !== 'Declaration'
				|| node.value.type === 'Raw'
				|| !propertyInteractions.has(property)
				|| rank === undefined
				|| hasCommentInRange(context, sourceCode.getRange(node))
			) {
				yield getRunProblem(declarations);
				declarations = [];
				continue;
			}

			const [start, end] = sourceCode.getRange(node);
			const previous = declarations.at(-1);
			if (
				previous
				&& (
					hasCommentInRange(context, [previous.replacementRange[1], start])
					|| sourceCode.getLoc(node).start.line > sourceCode.getLoc(previous.node).end.line + 1
				)
			) {
				yield getRunProblem(declarations);
				declarations = [];
			}

			// Scan backward to keep each slot's whitespace and semicolon without searching the whole value.
			// Whitespace inside the final value token can belong to an escaped identifier.
			const valueEnd = sourceCode.getRange(node.value.children.at(-1) ?? node.value)[1];
			let contentEnd = end;
			while (contentEnd > valueEnd && '\t\n\f\r '.includes(sourceCode.text[contentEnd - 1])) {
				contentEnd--;
			}

			const text = sourceCode.text.slice(start, contentEnd);
			declarations.push({
				node, property, rank, text, replacementRange: [start, contentEnd],
			});
		}

		yield getRunProblem(declarations);
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
			description: 'Enforce consistent ordering of CSS properties.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [{
			type: 'object',
			additionalProperties: false,
			properties: {
				order: {
					description: 'The property ordering preset or a custom property order.',
					anyOf: [{
						enum: ['concentric-css', 'alphabetical'],
					}, {
						type: 'array',
						minItems: 1,
						uniqueItems: true,
						items: {type: 'string'},
					}],
				},
			},
		}],
		defaultOptions: [{order: 'concentric-css'}],
		messages,
		languages: ['css/css'],
	},
};

export default config;
