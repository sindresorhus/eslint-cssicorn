import {generate, parse, walk} from '@eslint/css-tree';
import {areEquivalentColors, isLiteralColor} from './shared/css-colors.js';
import {getVendorPrefix, shorthandToAffectedProperties} from './shared/css-shorthand-properties.js';
import {areEqualValues} from './shared/css-shorthand-values.js';
import {
	decodeCssIdentifier,
	hasCommentInRange,
	isCssModulesInteropDeclaration,
	normalizeCssIdentifier,
	toAsciiLowerCase,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID = 'prefer-light-dark';
const MESSAGE_ID_SUGGESTION = 'prefer-light-dark/suggestion';
const groupingAtRules = new Set(['media', 'supports', 'container', 'layer', 'scope', 'starting-style']);
const messages = {
	[MESSAGE_ID]: 'Prefer `light-dark()` for the paired colors in `{{property}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Combine the colors with `light-dark()` and remove the override declaration.',
};

const getProperty = declaration => {
	const property = decodeCssIdentifier(declaration.property);
	return property.startsWith('--') ? property : toAsciiLowerCase(property);
};

const isDeclarationBlock = block => Boolean(block?.children.every(node => node.type === 'Declaration'));

function getMediaMode(node) {
	if (node?.type !== 'Atrule' || normalizeCssIdentifier(node.name) !== 'media' || node.prelude?.type !== 'AtrulePrelude' || node.prelude.children.length !== 1) {
		return;
	}

	const [list] = node.prelude.children;
	const query = list.type === 'MediaQueryList' && list.children.length === 1 ? list.children.at(0) : undefined;
	const condition = query?.condition;
	if (condition?.type !== 'Condition' || condition.children.length !== 1 || query.modifier || query.mediaType) {
		return;
	}

	const [feature] = condition.children;
	if (feature.type !== 'Feature' || normalizeCssIdentifier(feature.name) !== 'prefers-color-scheme' || feature.value?.type !== 'Identifier') {
		return;
	}

	const mode = normalizeCssIdentifier(feature.value.name);
	return ['light', 'dark'].includes(mode) ? mode : undefined;
}

function isDualColorScheme(declaration) {
	const {children} = declaration.value;
	if (!children || children.some(node => node.type !== 'Identifier')) {
		return false;
	}

	const names = children.map(node => normalizeCssIdentifier(node.name));
	return (names.length === 2 || (names.length === 3 && names.includes('only')))
		&& new Set(names).size === names.length && names.includes('light') && names.includes('dark');
}

const getSchemes = declarations => declarations.filter(declaration => getProperty(declaration) === 'color-scheme');
const hasCompatibleScheme = declarations => {
	const schemes = getSchemes(declarations);
	return schemes.length === 0 || (schemes.length === 1 && isDualColorScheme(schemes[0]));
};

function isBareRootRule(rule) {
	const selectors = rule.prelude?.children;
	if (rule.prelude?.type !== 'SelectorList' || selectors.length !== 1 || selectors[0].children.length !== 1) {
		return false;
	}

	const [selector] = selectors[0].children;
	return (selector.type === 'TypeSelector' && normalizeCssIdentifier(selector.name) === 'html')
		|| (selector.type === 'PseudoClassSelector' && normalizeCssIdentifier(selector.name) === 'root' && !selector.children);
}

function hasRootColorScheme(container) {
	const declarations = [];
	function collect(node) {
		for (const child of node.children) {
			if (child.type === 'Atrule' && normalizeCssIdentifier(child.name) === 'layer' && child.block) {
				collect(child.block);
			} else if (child.type === 'Rule' && isBareRootRule(child)) {
				declarations.push(...child.block.children.filter(node => node.type === 'Declaration' && ['color-scheme', 'all'].includes(getProperty(node))));
			}
		}
	}

	collect(container);
	return declarations.length > 0 && declarations.every(declaration => getProperty(declaration) === 'color-scheme' && isDualColorScheme(declaration));
}

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
		if (property.startsWith('border-') && other.startsWith('border-') && /^border-(?:block|inline)(?:-|$)/v.test(property) !== /^border-(?:block|inline)(?:-|$)/v.test(other)) {
			return true;
		}
	}

	return false;
}

function getDeclarationMap(declarations) {
	const result = new Map();
	for (const declaration of declarations) {
		const property = getProperty(declaration);
		result.set(property, result.has(property) ? undefined : declaration);
	}

	return result;
}

function getParsedValue(text, offset = 0) {
	try {
		return parse(text, {context: 'value', positions: true, offset});
	} catch {
		// Invalid values and tolerant parser nodes are outside this rule's scope.
	}
}

function getColorReplacements({base, override, property, mode}, context) {
	const {sourceCode} = context;
	if (sourceCode.getText(base.value) === sourceCode.getText(override.value)) {
		return;
	}

	const baseValue = getParsedValue(sourceCode.getText(base.value), sourceCode.getRange(base.value)[0]);
	const overrideValue = getParsedValue(sourceCode.getText(override.value), sourceCode.getRange(override.value)[0]);
	if (!baseValue || !overrideValue) {
		return;
	}

	const values = [...baseValue.children];
	const otherValues = [...overrideValue.children];
	if (values.length !== otherValues.length || (property.startsWith('--') && values.length !== 1)) {
		return;
	}

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

		const colors = [sourceCode.getText(value), sourceCode.getText(other)];
		if (mode === 'light') {
			colors.reverse();
		}

		replacements.push({node: value, text: 'light-dark(' + colors.join(', ') + ')'});
	}

	if (replacements.length === 0) {
		return;
	}

	if (!property.startsWith('--')) {
		let text = sourceCode.getText(base.value);
		const start = sourceCode.getRange(base.value)[0];
		for (const replacement of replacements.toReversed()) {
			text = text.slice(0, sourceCode.getRange(replacement.node)[0] - start) + replacement.text + text.slice(sourceCode.getRange(replacement.node)[1] - start);
		}

		const transformed = getParsedValue(text);
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

function getRemovalRange(override, media, context) {
	const {sourceCode} = context;
	const block = sourceCode.getParent(override);
	if (block.children.length === 1) {
		const wrapper = sourceCode.getParent(block);
		if (!hasCommentInRange(context, sourceCode.getRange(media))) {
			return sourceCode.getRange(media);
		}

		if (wrapper.type === 'Rule' && !hasCommentInRange(context, sourceCode.getRange(wrapper))) {
			return sourceCode.getRange(wrapper);
		}
	}

	const range = sourceCode.getRange(override);
	if (sourceCode.text[range[1]] === ';') {
		range[1]++;
	}

	return range;
}

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
							yield fixer.replaceTextRange(sourceCode.getRange(replacement.node), replacement.text);
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
	let rootScheme;
	const hasRootScheme = () => {
		rootScheme ??= hasRootColorScheme(context.sourceCode.ast);
		return rootScheme;
	};

	context.on(['StyleSheet', 'Block'], function * (container) {
		for (let index = 1; index < container.children.length; index++) {
			const media = container.children[index];
			const mode = getMediaMode(media);
			if (!mode) {
				continue;
			}

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

		const media = rule.block.children.at(-1);
		const mode = getMediaMode(media);
		if (!mode || !isDeclarationBlock(media.block)) {
			return;
		}

		const declarations = rule.block.children.slice(0, -1);
		if (declarations.some(node => node.type !== 'Declaration')) {
			return;
		}

		yield * getPairProblems({
			baseRule: rule, declarations, media, overrides: media.block.children, mode,
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
