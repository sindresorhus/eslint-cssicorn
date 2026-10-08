// @ts-check

import {ident, parse, toPlainObject} from '@eslint/css-tree';
import colorFunctionsWithAlpha from './shared/css-color-functions.js';
import {
	decodeCssIdentifier,
	hasCommentInRange,
	isBareRootRule,
	isCssModulesInteropDeclaration,
	isStyleDeclaration,
	isSubstitutionFunction,
	normalizeCssIdentifier,
	toLocation,
} from './utils/index.js';

/**
@import {BlockPlain, CssNodePlain, DeclarationPlain, FunctionNodePlain, ValuePlain} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornRuleFixer} from './rule/to-eslint-rule-fixer.js';
@import {CssicornProblem} from './rule/to-eslint-problem.js';

@typedef {Map<string, string | undefined>} Candidates
*/

const MESSAGE_ID = 'prefer-relative-colors';
const MESSAGE_ID_SUGGESTION = 'prefer-relative-colors/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` to derive this alpha variant from an existing color custom property.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `{{replacement}}`.',
};

const colorFamilies = new Map([['rgb', 'rgb'], ['rgba', 'rgb'], ['hsl', 'hsl'], ['hsla', 'hsl']]);
const preservedFunctions = new Set(['url', 'element', '-moz-element']);
const colorFunctionPattern = /(?:rgba?|hsla?)\(|\\/iu;

/**
Get the color family and channel reference of a direct channel-based color function.
@param {CssNodePlain} node
*/
function getChannelColor(node) {
	if (node.type !== 'Function') {
		return;
	}

	const family = colorFamilies.get(normalizeCssIdentifier(node.name));
	const reference = node.children.at(0);
	if (!family || reference?.type !== 'Function' || normalizeCssIdentifier(reference.name) !== 'var' || reference.children.length !== 1) {
		return;
	}

	const identifier = reference.children.at(0);
	if (identifier?.type !== 'Identifier') {
		return;
	}

	const channels = decodeCssIdentifier(identifier.name);
	if (!channels.startsWith('--')) {
		return;
	}

	return {family, channels, key: JSON.stringify([family, channels])};
}

/**
Add a destination without choosing between different tokens for the same channel reference.
@param {Candidates} candidates
@param {string} key
@param {string} property
*/
function addCandidate(candidates, key, property) {
	candidates.set(key, candidates.has(key) && candidates.get(key) !== property ? undefined : property);
}

/**
Check whether a declaration belongs to an unconditional bare root rule, optionally inside layers.
@param {DeclarationPlain} declaration
@param {CssicornContext} context
*/
function isRootDefinition(declaration, {sourceCode}) {
	const block = sourceCode.getParent(declaration);
	const rule = block ? sourceCode.getParent(block) : undefined;
	return rule?.type === 'Rule' && isBareRootRule(rule)
		&& sourceCode.getAncestors(rule).every(ancestor => ancestor.type !== 'Rule' && (ancestor.type !== 'Atrule' || normalizeCssIdentifier(ancestor.name) === 'layer'));
}

/**
Get the relationship key of a complete alpha-free custom-property definition.
@param {ValuePlain | undefined} value
@param {string} property
*/
function getDefinitionKey(value, property) {
	const node = value?.children.length === 1 ? value.children.at(0) : undefined;
	if (node?.type !== 'Function' || node.children.length !== 1) {
		return;
	}

	const color = getChannelColor(node);
	return color && color.channels !== property ? color.key : undefined;
}

/**
Build a suggestion for a channel-based alpha variant with an unambiguous destination.
@param {FunctionNodePlain} node
@param {DeclarationPlain} declaration
@param {{candidates: Candidates | undefined, rootCandidates: Candidates}} destinations
@param {CssicornContext} context
@returns {CssicornProblem | undefined}
*/
function getColorProblem(node, declaration, {candidates, rootCandidates}, context) {
	const color = getChannelColor(node);
	const [, separator, alpha] = node.children;
	if (!color || node.children.length !== 3 || separator.type !== 'Operator' || !['/', ','].includes(separator.value) || !['Number', 'Percentage', 'Function'].includes(alpha.type)) {
		return;
	}

	const destination = candidates?.has(color.key) ? candidates.get(color.key) : rootCandidates.get(color.key);
	const {sourceCode} = context;
	const range = sourceCode.getRange(node);
	if (destination === undefined || hasCommentInRange(context, range)) {
		return;
	}

	const components = color.family === 'rgb' ? 'r g b' : 'h s l';
	const alphaText = sourceCode.getText(alpha);
	const replacement = `${color.family}(from var(${ident.encode(destination)}) ${components} / ${alphaText})`;
	return {
		node: declaration,
		loc: toLocation(range, context),
		messageId: MESSAGE_ID,
		data: {replacement},
		suggest: [{
			messageId: MESSAGE_ID_SUGGESTION,
			data: {replacement},
			/**
			@param {Parameters<CssicornRuleFixer>[0]} fixer
			*/
			fix: fixer => fixer.replaceTextRange(range, replacement),
		}],
	};
}

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	/**
	@type {DeclarationPlain[]}
	*/
	const declarations = [];
	/**
	@type {WeakMap<DeclarationPlain, ValuePlain | undefined>}
	*/
	const values = new WeakMap();

	/**
	Get a declaration value, parsing opaque custom-property values only when they can contain functions.
	@param {DeclarationPlain} declaration
	*/
	function getValue(declaration) {
		if (declaration.value.type === 'Value') {
			return declaration.value;
		}

		if (values.has(declaration)) {
			return values.get(declaration);
		}

		/**
		@type {ValuePlain | undefined}
		*/
		let value;
		if (decodeCssIdentifier(declaration.property).startsWith('--') && colorFunctionPattern.test(sourceCode.getText(declaration.value))) {
			try {
				value = /** @type {ValuePlain} */ (toPlainObject(parse(sourceCode.getText(declaration.value), {
					context: 'value',
					positions: true,
					offset: sourceCode.getRange(declaration.value)[0],
				})));
			} catch {
				// Custom-property values need not be valid color expressions.
			}
		}

		values.set(declaration, value);
		return value;
	}

	context.on('Declaration', declaration => {
		if (isStyleDeclaration(declaration, context) && !isCssModulesInteropDeclaration(declaration, context)) {
			declarations.push(declaration);
		}
	});

	context.onExit('StyleSheet', function * () {
		/**
		@type {Candidates}
		*/
		const definitions = new Map();
		/**
		@type {Map<DeclarationPlain, string>}
		*/
		const relationships = new Map();
		for (const declaration of declarations) {
			const property = decodeCssIdentifier(declaration.property);
			if (!property.startsWith('--')) {
				continue;
			}

			const key = getDefinitionKey(getValue(declaration), property);
			// A conflicting definition anywhere in the file disqualifies the destination token.
			definitions.set(property, definitions.has(property) && definitions.get(property) !== key ? undefined : key);
			if (key !== undefined) {
				relationships.set(declaration, key);
			}
		}

		/**
		@type {Candidates}
		*/
		const rootCandidates = new Map();
		/**
		@type {Map<BlockPlain, Candidates>}
		*/
		const blockCandidates = new Map();
		for (const [declaration, key] of relationships) {
			const property = decodeCssIdentifier(declaration.property);
			if (definitions.get(property) !== key) {
				continue;
			}

			const block = /** @type {BlockPlain} */ (sourceCode.getParent(declaration));
			let candidates = blockCandidates.get(block);
			if (!candidates) {
				candidates = new Map();
				blockCandidates.set(block, candidates);
			}

			addCandidate(candidates, key, property);
			if (isRootDefinition(declaration, context)) {
				addCandidate(rootCandidates, key, property);
			}
		}

		if (blockCandidates.size === 0) {
			return;
		}

		for (const declaration of declarations) {
			const candidates = blockCandidates.get(/** @type {BlockPlain} */ (sourceCode.getParent(declaration)));
			if (!candidates && rootCandidates.size === 0) {
				continue;
			}

			const value = getValue(declaration);
			if (!value) {
				continue;
			}

			/**
			@param {CssNodePlain} node
			@returns {Generator<CssicornProblem>}
			*/
			function * visit(node) {
				if (node.type === 'Function') {
					const name = normalizeCssIdentifier(node.name);
					const firstChild = node.children.at(0);
					const isRelativeColor = colorFunctionsWithAlpha.has(name) && firstChild?.type === 'Identifier' && normalizeCssIdentifier(firstChild.name) === 'from';
					if (isSubstitutionFunction(node) || preservedFunctions.has(name) || isRelativeColor) {
						return;
					}

					if (colorFamilies.has(name)) {
						const problem = getColorProblem(node, declaration, {candidates, rootCandidates}, context);
						if (problem) {
							yield problem;
						}

						return;
					}
				}

				for (const child of 'children' in node ? node.children ?? [] : []) {
					yield * visit(child);
				}
			}

			yield * visit(value);
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
			description: 'Prefer relative colors for alpha variants of existing color custom properties.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
