// @ts-check
import {tokenize, tokenTypes} from '@eslint/css-tree';
import {decodeCssIdentifier, hasCommentInRange, normalizeCssIdentifier} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {AtrulePlain, AtrulePreludePlain, CssNodePlain, Layer} from '@eslint/css-tree';
*/

/**
@typedef {{children: Map<string, LayerScope>, order: Map<string, number> | undefined, eligible: boolean, imported: boolean}} LayerScope
@typedef {{node: Layer, ranks: (number | undefined)[], scope: LayerScope, undeclaredName: string | undefined}} LayerReference
@typedef {Map<string, {rank: number | undefined, node: Layer}>} LayerGroup
*/

const MESSAGE_ID = 'consistent-layer-order';
const MESSAGE_ID_UNDECLARED = 'consistent-layer-order/undeclared';
const messages = {
	[MESSAGE_ID]: 'List layer `{{earlier}}` before `{{later}}` to match the initial layer order.',
	[MESSAGE_ID_UNDECLARED]: 'Layer `{{name}}` is not declared in the initial layer order.',
};

/**
Create the state for one group of sibling layers.

@param {boolean} [imported] - Whether an imported file can declare these layers first.
@returns {LayerScope}
*/
const createScope = (imported = false) => ({
	children: new Map(), order: undefined, eligible: true, imported,
});

/**
Mark a scope and its known descendants as imported, because the imported file can declare their child layers first.

@param {LayerScope} scope
*/
const markImported = scope => {
	scope.imported = true;
	for (const child of scope.children.values()) {
		markImported(child);
	}
};

/**
Get the decoded segments of a layer name without treating escaped dots as separators.

@param {string} name
*/
const getLayerSegments = name => {
	/**
	@type {string[]}
	*/
	const segments = [];
	tokenize(name, (type, start, end) => {
		if (type === tokenTypes.Ident) {
			segments.push(decodeCssIdentifier(name.slice(start, end)));
		}
	});
	return segments;
};

/**
Get parsed layer references from a layer rule or a named layer import.

@param {AtrulePlain} atRule
@param {string} name
@returns {Layer[]}
*/
const getLayerNodes = (atRule, name) => {
	if (atRule.prelude?.type !== 'AtrulePrelude') {
		return [];
	}

	if (name === 'layer') {
		const list = atRule.prelude.children.at(0);
		return list?.type === 'LayerList' && list.children.every(node => node.type === 'Layer') ? list.children : [];
	}

	const layerFunction = atRule.prelude.children.at(1);
	if (
		layerFunction?.type !== 'Function'
		|| normalizeCssIdentifier(layerFunction.name) !== 'layer'
		|| layerFunction.children.length !== 1
	) {
		return [];
	}

	const layer = layerFunction.children.at(0);
	return layer?.type === 'Layer' ? [layer] : [];
};

/**
Check whether an import puts the imported layers inside a layer, with `layer` or `layer()`.

@param {AtrulePlain} atRule
@returns {boolean}
*/
const isLayeredImport = atRule => atRule.prelude?.type === 'AtrulePrelude'
	&& atRule.prelude.children.some(child => (child.type === 'Identifier' || child.type === 'Function') && normalizeCssIdentifier(child.name) === 'layer');

/**
Compare references by their sibling ranks, keeping ancestors before descendants.

@param {LayerReference & {ranks: number[]}} first
@param {LayerReference & {ranks: number[]}} second
*/
const compareLayerReferences = (first, second) => {
	for (let index = 0; index < Math.min(first.ranks.length, second.ranks.length); index++) {
		const difference = first.ranks[index] - second.ranks[index];
		if (difference !== 0) {
			return difference;
		}
	}

	return first.ranks.length - second.ranks.length;
};

/**
Resolve a reference and collect the first occurrence of each sibling in its statement.

@param {Layer} node
@param {LayerScope} parentScope
@param {Map<LayerScope, LayerGroup>} groups
@returns {LayerReference}
*/
const getLayerReference = (node, parentScope, groups) => {
	const segments = getLayerSegments(node.name);
	const ranks = [];
	let scope = parentScope;
	let undeclaredName;

	for (const [index, segment] of segments.entries()) {
		const rank = scope.order?.get(segment);
		ranks.push(rank);
		if (scope.order && rank === undefined && undeclaredName === undefined) {
			undeclaredName = segments.slice(0, index + 1).join('.');
		}

		let group = groups.get(scope);
		if (!group) {
			group = new Map();
			groups.set(scope, group);
		}

		if (!group.has(segment)) {
			group.set(segment, {rank, node});
		}

		let childScope = scope.children.get(segment);
		if (!childScope) {
			childScope = createScope(scope.imported);
			scope.children.set(segment, childScope);
		}

		scope = childScope;
	}

	return {
		node, ranks, scope, undeclaredName,
	};
};

/**
Get the first pair of known siblings that contradicts their initial order.

@param {LayerGroup} group
*/
const getGroupInversion = group => {
	let previous;
	for (const entry of group.values()) {
		if (entry.rank === undefined) {
			continue;
		}

		if (previous?.rank !== undefined && entry.rank < previous.rank) {
			return {earlier: entry.node.name, later: previous.node.name};
		}

		previous = entry;
	}
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {checkUndeclaredLayers} = /** @type {{checkUndeclaredLayers: boolean}} */ (context.options[0]);
	const rootScope = createScope();
	/**
	@type {WeakMap<CssNodePlain, LayerScope>}
	*/
	const blockScopes = new WeakMap();

	context.on('Atrule', function * (atRule) {
		const name = normalizeCssIdentifier(atRule.name);
		if (name !== 'layer' && name !== 'import') {
			return;
		}

		const ancestors = sourceCode.getAncestors(atRule);
		const parentLayer = ancestors.findLast(node => node.type === 'Atrule' && normalizeCssIdentifier(node.name) === 'layer');
		const parentScope = parentLayer ? blockScopes.get(parentLayer) : rootScope;
		if (!parentScope) {
			return;
		}

		const nodes = getLayerNodes(atRule, name);
		if (nodes.length === 0) {
			// An import can introduce layers from another file, even without a layer name.
			parentScope.eligible = false;
			// An unlayered import can also declare child layers of any layer first. An anonymous `layer` import keeps them inside a new layer.
			if (name === 'import' && !isLayeredImport(atRule)) {
				markImported(parentScope);
			}

			if (atRule.block && !atRule.prelude) {
				blockScopes.set(atRule, createScope());
			}

			return;
		}

		const isStatement = name === 'layer' && !atRule.block;
		const isUnconditional = ancestors.every(node => node.type === 'StyleSheet'
			|| node.type === 'Block'
			|| (node.type === 'Atrule' && normalizeCssIdentifier(node.name) === 'layer'));
		/**
		@type {Map<LayerScope, LayerGroup>}
		*/
		const groups = new Map();
		/**
		@type {LayerReference[]}
		*/
		const references = [];

		for (const node of nodes) {
			const reference = getLayerReference(node, parentScope, groups);
			const {scope, undeclaredName} = reference;
			if (checkUndeclaredLayers && undeclaredName !== undefined) {
				yield {node, messageId: MESSAGE_ID_UNDECLARED, data: {name: undeclaredName}};
			}

			references.push(reference);
			// The imported file can declare child layers of the named layer first, at any depth.
			if (name === 'import') {
				markImported(scope);
			}

			if (atRule.block) {
				blockScopes.set(atRule, scope);
			}
		}

		let inversion;
		for (const [scope, group] of groups) {
			if (isStatement && !inversion) {
				inversion = getGroupInversion(group);
			}

			if (isStatement && isUnconditional && scope.eligible && !scope.imported) {
				scope.order = new Map(Array.from(group.keys(), (segment, index) => [segment, index]));
			}

			scope.eligible = false;
		}

		if (!inversion) {
			return;
		}

		const hasUndeclaredRank = references.some(reference => reference.ranks.includes(undefined));
		yield {
			node: /** @type {AtrulePreludePlain} */ (atRule.prelude),
			messageId: MESSAGE_ID,
			data: inversion,
			* fix(fixer, {abort}) {
				if (hasUndeclaredRank || hasCommentInRange(context, sourceCode.getRange(atRule))) {
					abort();
				}

				const rankedReferences = /** @type {(LayerReference & {ranks: number[]})[]} */ (references);
				const sorted = rankedReferences.toSorted(compareLayerReferences);
				for (const [index, {node}] of references.entries()) {
					if (node !== sorted[index].node) {
						yield fixer.replaceText(node, sourceCode.getText(sorted[index].node));
					}
				}
			},
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
			description: 'Enforce consistent ordering of cascade layer statements.',
			recommended: true,
		},
		fixable: 'code',
		schema: [{
			type: 'object',
			properties: {
				checkUndeclaredLayers: {
					type: 'boolean',
					description: 'Check layer names against the initial statement in their sibling scope.',
				},
			},
			additionalProperties: false,
		}],
		defaultOptions: [{checkUndeclaredLayers: false}],
		messages,
		languages: ['css/css'],
	},
};

export default config;
