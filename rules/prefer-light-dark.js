// @ts-check

import {generate, walk} from '@eslint/css-tree';
import {areEquivalentColors, isLiteralColor} from './shared/css-colors.js';
import {getVendorPrefix, shorthandToAffectedProperties} from './shared/css-shorthand-properties.js';
import {areEqualValues} from './shared/css-shorthand-values.js';
import {
	decodeCssIdentifier,
	groupingAtRules,
	hasCommentInRange,
	isBareRootRule,
	isCssModulesInteropDeclaration,
	normalizeCssIdentifier,
	normalizePropertyName,
	parseValue,
} from './utils/index.js';

/**
@import {AtrulePlain, BlockPlain, ConditionPlain, CssNode, CssNodePlain, DeclarationPlain, MediaQueryPlain, RulePlain, StyleSheetPlain, Value} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornProblem} from './rule/to-eslint-problem.js';
*/

/**
@typedef {BlockPlain & {children: DeclarationPlain[]}} DeclarationBlock
@typedef {'light' | 'dark'} ThemeMode
@typedef {{base: DeclarationPlain, override: DeclarationPlain, property: string, mode: ThemeMode}} ColorPair
@typedef {{baseRule: RulePlain, declarations: DeclarationPlain[], media: AtrulePlain, overrides: DeclarationPlain[], mode: ThemeMode}} RulePair
@typedef {{sourceRange: [number, number], text: string}} ColorReplacement
@typedef {MediaQueryPlain & {condition?: ConditionPlain | null, modifier?: string | null, mediaType?: string | null}} MediaQuery
*/

const MESSAGE_ID = 'prefer-light-dark';
const MESSAGE_ID_SUGGESTION = 'prefer-light-dark/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer `light-dark()` for the paired colors in `{{property}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Combine the colors with `light-dark()` and remove the override declaration.',
};

/**
@param {DeclarationPlain} declaration
*/
const getProperty = declaration => normalizePropertyName(declaration.property);

/**
@param {BlockPlain | null} block
@returns {block is DeclarationBlock}
*/
const isDeclarationBlock = block => Boolean(block?.children.every(node => node.type === 'Declaration'));

/**
@param {CssNodePlain | undefined} node
@returns {{media: AtrulePlain, mode: ThemeMode} | undefined}
*/
function getMediaOverride(node) {
	if (node?.type !== 'Atrule' || normalizeCssIdentifier(node.name) !== 'media' || node.prelude?.type !== 'AtrulePrelude' || node.prelude.children.length !== 1) {
		return;
	}

	const [list] = node.prelude.children;
	if (list.type !== 'MediaQueryList' || list.children.length !== 1) {
		return;
	}

	// MediaQueryPlain currently omits the parser's condition, modifier, and mediaType fields.
	const query = /** @type {MediaQuery} */ (list.children.at(0));
	const {condition} = query;
	if (condition?.type !== 'Condition' || condition.children.length !== 1 || query.modifier || query.mediaType) {
		return;
	}

	const [feature] = condition.children;
	if (feature.type !== 'Feature' || normalizeCssIdentifier(feature.name) !== 'prefers-color-scheme' || feature.value?.type !== 'Identifier') {
		return;
	}

	const mode = normalizeCssIdentifier(feature.value.name);
	return mode === 'light' || mode === 'dark' ? {media: node, mode} : undefined;
}

/**
@param {DeclarationPlain} declaration
*/
function isDualColorScheme(declaration) {
	if (declaration.value.type !== 'Value') {
		return false;
	}

	const names = [];
	for (const node of declaration.value.children) {
		if (node.type !== 'Identifier') {
			return false;
		}

		names.push(normalizeCssIdentifier(node.name));
	}

	return (names.length === 2 || (names.length === 3 && names.includes('only')))
		&& new Set(names).size === names.length && names.includes('light') && names.includes('dark');
}

/**
@param {DeclarationPlain[]} declarations
*/
const getSchemes = declarations => declarations.filter(declaration => getProperty(declaration) === 'color-scheme');
/**
@param {DeclarationPlain[]} declarations
*/
const hasCompatibleScheme = declarations => {
	const schemes = getSchemes(declarations);
	return schemes.length === 0 || (schemes.length === 1 && isDualColorScheme(schemes[0]));
};

/**
@param {StyleSheetPlain} container
*/
function hasRootColorScheme(container) {
	/**
	@type {DeclarationPlain[]}
	*/
	const declarations = [];
	/**
	@param {StyleSheetPlain | BlockPlain} node
	*/
	function collect(node) {
		for (const child of node.children) {
			if (child.type === 'Atrule' && normalizeCssIdentifier(child.name) === 'layer' && child.block) {
				collect(child.block);
			} else if (child.type === 'Rule' && isBareRootRule(child)) {
				for (const declaration of child.block.children) {
					if (declaration.type === 'Declaration' && ['color-scheme', 'all'].includes(getProperty(declaration))) {
						declarations.push(declaration);
					}
				}
			}
		}
	}

	collect(container);
	return declarations.length > 0 && declarations.every(declaration => getProperty(declaration) === 'color-scheme' && isDualColorScheme(declaration));
}

/**
@param {string} property
@param {Set<string>} properties
*/
function hasPropertyConflict(property, properties) {
	if (properties.has('all')) {
		return true;
	}

	if (property.startsWith('--')) {
		return false;
	}

	const affected = shorthandToAffectedProperties.get(property) ?? new Set();
	for (const other of properties) {
		if (other === property) {
			continue;
		}

		const otherAffected = shorthandToAffectedProperties.get(other);
		if (affected.has(other) || otherAffected?.has(property) || (otherAffected && [...otherAffected].some(name => affected.has(name)))) {
			return true;
		}

		// Logical and physical border declarations can address the same edge depending on writing mode.
		if (/^border(?:-|$)/v.test(property) && /^border(?:-|$)/v.test(other) && /^border-(?:block|inline)(?:-|$)/v.test(property) !== /^border-(?:block|inline)(?:-|$)/v.test(other)) {
			return true;
		}
	}

	return false;
}

/**
@param {DeclarationPlain[]} declarations
*/
function getDeclarationMap(declarations) {
	/**
	@type {Map<string, DeclarationPlain | undefined>}
	*/
	const result = new Map();
	for (const declaration of declarations) {
		const property = getProperty(declaration);
		result.set(property, result.has(property) ? undefined : declaration);
	}

	return result;
}

/**
Get the range of a private value node parsed with positions enabled.
@param {CssNode} node
@param {CssicornContext} context
@returns {[number, number]}
*/
function getParsedRange(node, context) {
	// Private trees use List children, but getRange only reads their source locations.
	return context.sourceCode.getRange(/** @type {CssNodePlain} */ (node));
}

/**
@param {ColorPair} pair
@param {CssicornContext} context
*/
function getColorReplacements({base, override, property, mode}, context) {
	const {sourceCode} = context;
	if (sourceCode.getText(base.value) === sourceCode.getText(override.value)) {
		return;
	}

	const baseValue = parseValue(sourceCode.getText(base.value), sourceCode.getRange(base.value)[0]);
	const overrideValue = parseValue(sourceCode.getText(override.value), sourceCode.getRange(override.value)[0]);
	if (!baseValue || !overrideValue) {
		return;
	}

	const values = [...baseValue.children];
	const otherValues = [...overrideValue.children];
	if (values.length !== otherValues.length || (property.startsWith('--') && values.length !== 1)) {
		return;
	}

	/**
	@type {ColorReplacement[]}
	*/
	const replacements = [];
	for (const [index, value] of values.entries()) {
		const other = otherValues[index];
		if (areEqualValues(value, other)) {
			continue;
		}

		if (!isLiteralColor(value, context) || !isLiteralColor(other, context)) {
			return;
		}

		if (areEquivalentColors(value, other)) {
			continue;
		}

		const sourceRange = getParsedRange(value, context);
		const colors = [sourceCode.text.slice(...sourceRange), sourceCode.text.slice(...getParsedRange(other, context))];
		if (mode === 'light') {
			colors.reverse();
		}

		replacements.push({sourceRange, text: 'light-dark(' + colors.join(', ') + ')'});
	}

	if (replacements.length === 0) {
		return;
	}

	if (!property.startsWith('--')) {
		let text = sourceCode.getText(base.value);
		const start = sourceCode.getRange(base.value)[0];
		for (const replacement of replacements.toReversed()) {
			text = text.slice(0, replacement.sourceRange[0] - start) + replacement.text + text.slice(replacement.sourceRange[1] - start);
		}

		const transformed = parseValue(text);
		if (!transformed) {
			return;
		}

		// Normalize a private tree for grammar checks while retaining the original source ranges and spelling.
		walk(transformed, node => {
			if (node.type === 'Identifier' || node.type === 'Function') {
				node.name = node.name.startsWith('--') ? decodeCssIdentifier(node.name) : normalizeCssIdentifier(node.name);
			} else if (node.type === 'Dimension') {
				node.unit = normalizeCssIdentifier(node.unit);
			}
		});
		if (!sourceCode.lexer.matchProperty(property, transformed).matched) {
			return;
		}
	}

	return replacements;
}

/**
@param {DeclarationPlain} override
@param {AtrulePlain} media
@param {CssicornContext} context
*/
function getRemovalRange(override, media, context) {
	const {sourceCode} = context;
	const block = /** @type {BlockPlain} */ (sourceCode.getParent(override));
	if (block.children.length === 1) {
		const wrapper = sourceCode.getParent(block);
		if (!hasCommentInRange(context, sourceCode.getRange(media))) {
			return sourceCode.getRange(media);
		}

		if (wrapper?.type === 'Rule' && !hasCommentInRange(context, sourceCode.getRange(wrapper))) {
			return sourceCode.getRange(wrapper);
		}
	}

	const range = sourceCode.getRange(override);
	if (sourceCode.text[range[1]] === ';') {
		range[1]++;
	}

	return range;
}

/**
@param {RulePair} pair
@param {CssicornContext} context
@param {() => boolean} hasRootScheme
@returns {Generator<CssicornProblem>}
*/
function * getPairProblems({baseRule, declarations, media, overrides, mode}, context, hasRootScheme) {
	const {sourceCode} = context;
	if ([...declarations, ...overrides].some(declaration => getVendorPrefix(getProperty(declaration)))
		|| !hasCompatibleScheme(declarations) || !hasCompatibleScheme(overrides)
		|| (getSchemes(declarations).length === 0 && !hasRootScheme())
		|| sourceCode.getAncestors(baseRule).some(node => node.type === 'Atrule' && !groupingAtRules.has(normalizeCssIdentifier(node.name)))
		|| (declarations[0] && isCssModulesInteropDeclaration(declarations[0], context))) {
		return;
	}

	const baseMap = getDeclarationMap(declarations);
	const overrideMap = getDeclarationMap(overrides);
	const properties = new Set([...baseMap.keys(), ...overrideMap.keys()]);
	for (const [property, override] of overrideMap) {
		const base = baseMap.get(property);
		if (!base || !override || Boolean(base.important) !== Boolean(override.important) || hasPropertyConflict(property, properties)) {
			continue;
		}

		const replacements = getColorReplacements({
			base, override, property, mode,
		}, context);
		if (!replacements) {
			continue;
		}

		const hasComments = [base, override].some(node => hasCommentInRange(context, sourceCode.getRange(node)));
		yield {
			node: override,
			messageId: MESSAGE_ID,
			data: {property},
			suggest: hasComments
				? undefined
				: [{
					messageId: MESSAGE_ID_SUGGESTION,
					* fix(fixer) {
						for (const replacement of replacements) {
							yield fixer.replaceTextRange(replacement.sourceRange, replacement.text);
						}

						yield fixer.removeRange(getRemovalRange(override, media, context));
					},
				}],
		};
	}
}

/**
@param {CssicornContext} context
*/
const create = context => {
	/**
	@type {boolean | undefined}
	*/
	let rootScheme;
	const hasRootScheme = () => {
		rootScheme ??= hasRootColorScheme(context.sourceCode.ast);
		return rootScheme;
	};

	context.on(['StyleSheet', 'Block'], function * (container) {
		for (let index = 1; index < container.children.length; index++) {
			const mediaOverride = getMediaOverride(container.children[index]);
			if (!mediaOverride) {
				continue;
			}

			const {media, mode} = mediaOverride;
			const base = container.children[index - 1];
			const override = media.block?.children.length === 1 ? media.block.children.at(0) : undefined;
			if (base.type !== 'Rule' || base.prelude?.type !== 'SelectorList' || override?.type !== 'Rule' || override.prelude?.type !== 'SelectorList'
				|| !isDeclarationBlock(base.block) || !isDeclarationBlock(override.block) || generate(base.prelude) !== generate(override.prelude)) {
				continue;
			}

			yield * getPairProblems({
				baseRule: base, declarations: base.block.children, media, overrides: override.block.children, mode,
			}, context, hasRootScheme);
		}
	});
	context.on('Rule', function * (rule) {
		if (rule.prelude?.type !== 'SelectorList') {
			return;
		}

		const mediaOverride = getMediaOverride(rule.block.children.at(-1));
		if (!mediaOverride || !isDeclarationBlock(mediaOverride.media.block)) {
			return;
		}

		const {media, mode} = mediaOverride;
		const declarations = rule.block.children.slice(0, -1);
		if (declarations.some(node => node.type !== 'Declaration')) {
			return;
		}

		yield * getPairProblems({
			baseRule: rule, declarations: /** @type {DeclarationPlain[]} */ (declarations), media, overrides: mediaOverride.media.block.children, mode,
		}, context, hasRootScheme);
	});
};

/**
@type {CssicornRule}
*/
export default {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `light-dark()` over paired light and dark color declarations.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: ['css/css'],
	},
};
