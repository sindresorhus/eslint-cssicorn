import {
	fourSideShorthands,
	getVendorPrefix,
	pairShorthands,
	shorthandProperties,
	shorthandToAffectedProperties,
} from './shared/css-shorthand-properties.js';
import {getCondensedValueCount} from './shared/css-shorthand-values.js';
import {
	getCssWideKeyword,
	hasCommentInRange,
	hasSubstitutionOrRandomFunction,
	isCssModulesInteropDeclaration,
	isCssWideKeyword,
	normalizeCssIdentifier,
	toAsciiLowerCase,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-redundant-longhand-properties';
const messages = {
	[MESSAGE_ID]: 'Use the `{{shorthand}}` shorthand instead of its longhand properties.',
};

const slashShorthands = new Set(['grid-area', 'grid-column', 'grid-row']);
const additionalResetProperties = new Map([
	['animation', ['animation-composition', 'animation-trigger']],
	['background', ['background-blend-mode']],
	['columns', ['column-wrap']],
]);
const additionalAffectedProperties = new Map([
	['background-position', ['background-position-x', 'background-position-y']],
	['column-gap', ['grid-column-gap']],
	['font-stretch', ['font-width']],
	['font-width', ['font-stretch']],
	['grid-column-gap', ['column-gap']],
	['grid-row-gap', ['row-gap']],
	['row-gap', ['grid-row-gap']],
]);

const getValue = (declaration, sourceCode) => sourceCode.getText(declaration.value).trim();

const getValueParts = (value, sourceCode) => [...value.children].map(node => sourceCode.getText(node).trim());

// The shared condensing logic, applied to the source text of shorthand components.
const serializeCondensedValues = values => values.slice(0, getCondensedValueCount(values, false, (first, second) => first === second)).join(' ');

const splitCommaList = (value, sourceCode) => {
	const [start, end] = sourceCode.getRange(value);
	const parts = [];
	let partStart = start;

	for (const child of value.children) {
		if (child.type !== 'Operator' || child.value !== ',') {
			continue;
		}

		const [operatorStart, operatorEnd] = sourceCode.getRange(child);
		parts.push(sourceCode.text.slice(partStart, operatorStart).trim());
		partStart = operatorEnd;
	}

	parts.push(sourceCode.text.slice(partStart, end).trim());
	return parts;
};

const serializeBorderRadius = (declarations, sourceCode) => {
	const horizontal = [];
	const vertical = [];

	for (const declaration of declarations) {
		const parts = getValueParts(declaration.value, sourceCode);
		if (parts.length === 0 || parts.length > 2) {
			return;
		}

		horizontal.push(parts[0]);
		vertical.push(parts[1] ?? parts[0]);
	}

	const horizontalValue = serializeCondensedValues(horizontal);
	return horizontal.every((value, index) => value === vertical[index])
		? horizontalValue
		: `${horizontalValue} / ${serializeCondensedValues(vertical)}`;
};

const serializeBorderImage = values => `${values[0]} ${values[1]} / ${values[2]} / ${values[3]} ${values[4]}`;
const serializeColumns = values => toAsciiLowerCase(values[2]) === 'auto' ? values.slice(0, 2).join(' ') : undefined;
const serializeFont = values => `${values.slice(0, 4).join(' ')} ${values[4]} / ${values[5]} ${values[6]}`;

const serializeFontSynthesis = values => {
	if (values[3] === 'auto' || values.some(value => value !== 'auto' && value !== 'none')) {
		return;
	}

	const enabledValues = ['weight', 'style', 'small-caps'].filter((value, index) => values[index] === 'auto');
	return enabledValues.length > 0 ? enabledValues.join(' ') : 'none';
};

const serializeFontVariant = values => {
	if (toAsciiLowerCase(values.at(-1)) !== 'normal') {
		return;
	}

	const nonNormalValues = values.filter(value => toAsciiLowerCase(value) !== 'normal');
	return nonNormalValues.length > 0 ? nonNormalValues.join(' ') : 'normal';
};

const serializeGridTemplate = (declarations, sourceCode) => {
	const [rowsDeclaration, columnsDeclaration, areasDeclaration] = declarations;
	const rows = getValue(rowsDeclaration, sourceCode);
	const columns = getValue(columnsDeclaration, sourceCode);
	const areas = getValue(areasDeclaration, sourceCode);

	if (toAsciiLowerCase(areas) === 'none') {
		return `${rows} / ${columns}`;
	}

	const areaParts = [...areasDeclaration.value.children];
	const rowParts = [...rowsDeclaration.value.children];
	if (
		areaParts.length !== rowParts.length
		|| areaParts.some(node => node.type !== 'String')
		|| rowParts.some(node => node.type === 'Brackets' || (node.type === 'Function' && normalizeCssIdentifier(node.name) === 'repeat'))
	) {
		return;
	}

	const combinedRows = areaParts.map((area, index) => `${sourceCode.getText(area)} ${sourceCode.getText(rowParts[index])}`);
	return `${combinedRows.join(' ')} / ${columns}`;
};

const serializeGrid = (declarations, sourceCode) => {
	const values = declarations.map(declaration => getValue(declaration, sourceCode));
	const [rows, columns, areas, autoRows, autoColumns, autoFlow] = values;
	const normalizedAutoFlow = new Set(toAsciiLowerCase(autoFlow).split(/\s+/v));

	if (
		toAsciiLowerCase(autoRows) === 'auto'
		&& toAsciiLowerCase(autoColumns) === 'auto'
		&& toAsciiLowerCase(autoFlow) === 'row'
	) {
		return serializeGridTemplate(declarations.slice(0, 3), sourceCode);
	}

	const dense = normalizedAutoFlow.has('dense') ? ' dense' : '';

	if (
		toAsciiLowerCase(areas) === 'none'
		&& toAsciiLowerCase(columns) === 'none'
		&& toAsciiLowerCase(autoRows) === 'auto'
		&& normalizedAutoFlow.has('column')
	) {
		return `${rows} / auto-flow${dense} ${autoColumns}`;
	}

	if (
		toAsciiLowerCase(areas) === 'none'
		&& toAsciiLowerCase(rows) === 'none'
		&& toAsciiLowerCase(autoColumns) === 'auto'
		&& !normalizedAutoFlow.has('column')
	) {
		return `auto-flow${dense} ${autoRows} / ${columns}`;
	}
};

const serializeCyclicLists = (declarations, sourceCode, order, primaryIndex) => {
	const lists = declarations.map(declaration => splitCommaList(declaration.value, sourceCode));
	const count = lists[primaryIndex].length;
	if (lists.some(list => list.length > count)) {
		return;
	}

	const layers = [];

	for (let index = 0; index < count; index++) {
		layers.push(order.map(componentIndex => {
			const list = lists[componentIndex];
			return list[index % list.length];
		}).join(' '));
	}

	return layers.join(', ');
};

const serializeTransition = (declarations, sourceCode) => serializeCyclicLists(declarations, sourceCode, [1, 2, 3, 4, 0], 0);

const serializeAnimation = (declarations, sourceCode) => {
	const animationNameDeclaration = declarations[7];
	const timelineValues = splitCommaList(declarations.at(-1).value, sourceCode);
	if (
		timelineValues.length > splitCommaList(animationNameDeclaration.value, sourceCode).length
		|| timelineValues.some(value => toAsciiLowerCase(value) !== 'auto')
		|| splitCommaList(declarations[0].value, sourceCode).some(value => toAsciiLowerCase(value) === 'auto')
	) {
		return;
	}

	if (animationNameDeclaration.value.children.some(node => node.type === 'Identifier' && (normalizeCssIdentifier(node.name) === 'auto' || node.name.startsWith('--') || node.name.includes('\\')))) {
		return;
	}

	const shorthandDeclarations = declarations.slice(0, -1);
	return serializeCyclicLists(shorthandDeclarations, sourceCode, shorthandDeclarations.keys().toArray(), 7);
};

const serializeBackground = (declarations, sourceCode) => {
	const lists = declarations.map(declaration => splitCommaList(declaration.value, sourceCode));
	const count = lists[0].length;
	if (lists.slice(1, -1).some(list => list.length > count)) {
		return;
	}

	const layers = [];

	for (let index = 0; index < count; index++) {
		const part = componentIndex => {
			const list = lists[componentIndex];
			return list[index % list.length];
		};

		const layer = `${part(0)} ${part(1)} / ${part(2)} ${part(3)} ${part(4)} ${part(5)} ${part(6)}`;
		layers.push(index === count - 1 ? `${layer} ${lists[7][0]}` : layer);
	}

	return layers.join(', ');
};

const serializeMask = (declarations, sourceCode) => {
	const lists = declarations.map(declaration => splitCommaList(declaration.value, sourceCode));
	const count = lists[0].length;
	if (lists.some(list => list.length > count)) {
		return;
	}

	const layers = [];

	for (let index = 0; index < count; index++) {
		const part = componentIndex => {
			const list = lists[componentIndex];
			return list[index % list.length];
		};

		layers.push(`${part(0)} ${part(1)} / ${part(2)} ${part(3)} ${part(4)} ${part(5)} ${part(6)} ${part(7)}`);
	}

	return layers.join(', ');
};

const serializers = new Map([
	['animation', serializeAnimation],
	['background', serializeBackground],
	['border-image', (declarations, sourceCode) => serializeBorderImage(declarations.map(declaration => getValue(declaration, sourceCode)))],
	['border-radius', serializeBorderRadius],
	['columns', (declarations, sourceCode) => serializeColumns(declarations.map(declaration => getValue(declaration, sourceCode)))],
	['font', (declarations, sourceCode) => serializeFont(declarations.map(declaration => getValue(declaration, sourceCode)))],
	['font-synthesis', (declarations, sourceCode) => serializeFontSynthesis(declarations.map(declaration => toAsciiLowerCase(getValue(declaration, sourceCode))))],
	['font-variant', (declarations, sourceCode) => serializeFontVariant(declarations.map(declaration => getValue(declaration, sourceCode)))],
	['grid', serializeGrid],
	['grid-template', serializeGridTemplate],
	['mask', serializeMask],
	['transition', serializeTransition],
]);

const serializeShorthand = (shorthand, declarations, sourceCode) => {
	const values = declarations.map(declaration => getValue(declaration, sourceCode));
	const wideKeywords = declarations.map(declaration => getCssWideKeyword(declaration));
	if (wideKeywords.some(Boolean)) {
		return wideKeywords.every(keyword => keyword === wideKeywords[0]) ? wideKeywords[0] : undefined;
	}

	if (slashShorthands.has(shorthand)) {
		return values.join(' / ');
	}

	if (pairShorthands.has(shorthand) || fourSideShorthands.has(shorthand)) {
		return serializeCondensedValues(values);
	}

	if (shorthand === 'list-style') {
		if (['inside', 'outside'].includes(toAsciiLowerCase(values[0]))) {
			return;
		}

		return `${values[1]} ${values[0]} ${values[2]}`;
	}

	const serializer = serializers.get(shorthand);
	return serializer ? serializer(declarations, sourceCode) : values.join(' ');
};

const physicalSidesPattern = /^(?:top|right|bottom|left)$/v;

const getLogicalPropertyMapping = property => {
	if (physicalSidesPattern.test(property)) {
		return {group: 'inset', mapping: 'physical'};
	}

	const overflowMatch = property.match(/^(overflow|overscroll-behavior)-(x|y|block|inline)$/v);
	if (overflowMatch) {
		return {
			group: overflowMatch[1],
			mapping: /^(?:x|y)$/v.test(overflowMatch[2]) ? 'physical' : 'logical',
		};
	}

	const boxMatch = property.match(/^(margin|padding|inset|scroll-margin|scroll-padding)-(top|right|bottom|left|block-start|block-end|inline-start|inline-end)$/v);
	if (boxMatch) {
		return {
			group: boxMatch[1],
			mapping: physicalSidesPattern.test(boxMatch[2]) ? 'physical' : 'logical',
		};
	}

	const borderMatch = property.match(/^border-(top|right|bottom|left|block-start|block-end|inline-start|inline-end)-(width|style|color)$/v);
	if (borderMatch) {
		return {
			group: `border-${borderMatch[2]}`,
			mapping: physicalSidesPattern.test(borderMatch[1]) ? 'physical' : 'logical',
		};
	}

	if (/^border-(?:top|right|bottom|left)-.+-radius$/v.test(property)) {
		return {group: 'border-radius', mapping: 'physical'};
	}

	if (/^border-(?:start|end)-(?:start|end)-radius$/v.test(property)) {
		return {group: 'border-radius', mapping: 'logical'};
	}
};

const getAffectedProperties = property => new Set([property, ...(shorthandToAffectedProperties.get(property) ?? []), ...(additionalAffectedProperties.get(property) ?? [])]);

const isComponentAffectedByProperty = (property, component) => {
	const affectedProperties = getAffectedProperties(property);
	const componentProperties = getAffectedProperties(component);
	const propertyMappings = [...affectedProperties].map(property => getLogicalPropertyMapping(property)).filter(Boolean);

	return [...componentProperties].some(affectedProperty => {
		if (affectedProperties.has(affectedProperty)) {
			return true;
		}

		const componentMapping = getLogicalPropertyMapping(affectedProperty);
		return componentMapping && propertyMappings.some(mapping => mapping.group === componentMapping.group && mapping.mapping !== componentMapping.mapping);
	});
};

// This runs for every declaration, shorthand, and component, and the result only depends on the property names. The property names come from the linted code, so limit the cache size for long-running processes, like editors.
const propertyAffectsComponentCache = new Map();
const maximumPropertyAffectsComponentCacheSize = 1000;
const propertyAffectsComponent = (property, component) => {
	let componentCache = propertyAffectsComponentCache.get(property);
	if (!componentCache) {
		if (propertyAffectsComponentCache.size >= maximumPropertyAffectsComponentCacheSize) {
			propertyAffectsComponentCache.clear();
		}

		componentCache = new Map();
		propertyAffectsComponentCache.set(property, componentCache);
	}

	let result = componentCache.get(component);
	if (result === undefined) {
		result = isComponentAffectedByProperty(property, component);
		componentCache.set(component, result);
	}

	return result;
};

const getCandidates = (children, {shorthand, definition, catalogIndex}, sourceCode) => {
	const candidates = [];
	const declarations = new Map();
	const duplicateComponents = new Set();
	const {components} = definition;
	const resetPropertyNames = [...definition.resetProperties, ...additionalResetProperties.get(shorthand) ?? []];
	const resetProperties = [...new Set(resetPropertyNames.flatMap(property => [...shorthandToAffectedProperties.get(property) ?? [property]]))];
	const resetStates = new Map();
	let shorthandDeclaration;

	const setAllResetStates = (declaration, keyword) => {
		resetStates.clear();
		for (const property of resetProperties) {
			resetStates.set(property, {declaration, keyword});
		}
	};

	const clearState = () => {
		declarations.clear();
		duplicateComponents.clear();
		resetStates.clear();
		shorthandDeclaration = undefined;
	};

	const addCandidate = () => {
		if (
			resetStates.size !== resetProperties.length
			|| duplicateComponents.size > 0
			|| components.some(component => !declarations.has(component))
		) {
			return;
		}

		const componentDeclarations = components.map(component => declarations.get(component));
		const resetStateValues = resetStates.values().toArray();
		// Some browsers do not reset this property with `background`, so preserve an explicit declaration.
		const resetDeclarations = resetStateValues.filter(({declaration}) => normalizeCssIdentifier(declaration.property) !== 'background-blend-mode').map(({declaration}) => declaration);
		// The longhands fully override an earlier shorthand, so merge it instead of leaving a dead declaration.
		const overriddenShorthands = shorthandDeclaration?.important === componentDeclarations[0].important ? [shorthandDeclaration] : [];
		const sourceDeclarationSet = new Set([...overriddenShorthands, ...componentDeclarations, ...resetDeclarations]);
		const sourceDeclarations = sourceDeclarationSet.values().toArray().toSorted((first, second) => sourceCode.getRange(first)[0] - sourceCode.getRange(second)[0]);
		candidates.push({
			shorthand,
			declarations: componentDeclarations,
			components,
			resetStates: resetStateValues,
			sourceDeclarations,
			catalogIndex,
		});
	};

	for (const child of children) {
		if (child.type !== 'Declaration') {
			addCandidate();
			clearState();
			continue;
		}

		// Custom properties never affect a shorthand or its components.
		if (child.property.startsWith('--')) {
			continue;
		}

		// Escaped property names are skipped, keeping them out of shorthand matching.
		const property = toAsciiLowerCase(child.property);
		const childVendorPrefix = getVendorPrefix(property);
		const unprefixedProperty = property.slice(childVendorPrefix.length);

		if (unprefixedProperty === 'all' || childVendorPrefix !== '') {
			addCandidate();
			clearState();
			continue;
		}

		const affectedResetProperties = resetProperties.filter(resetProperty => propertyAffectsComponent(unprefixedProperty, resetProperty));
		if (unprefixedProperty !== shorthand && affectedResetProperties.length > 0) {
			addCandidate();
			const keyword = getCssWideKeyword(child);
			const directlyAffectedProperties = getAffectedProperties(unprefixedProperty);
			for (const resetProperty of affectedResetProperties) {
				if (
					keyword
					&& directlyAffectedProperties.has(resetProperty)
				) {
					resetStates.set(resetProperty, {declaration: child, keyword});
				} else {
					resetStates.delete(resetProperty);
				}
			}

			continue;
		}

		const affectedComponents = components.filter(component => propertyAffectsComponent(unprefixedProperty, component));
		if (affectedComponents.length === 0) {
			continue;
		}

		if (unprefixedProperty === shorthand || !components.includes(unprefixedProperty)) {
			addCandidate();
			for (const component of affectedComponents) {
				declarations.delete(component);
				duplicateComponents.delete(component);
			}

			shorthandDeclaration = unprefixedProperty === shorthand ? child : undefined;
			if (unprefixedProperty === shorthand) {
				resetStates.clear();
				const keyword = getCssWideKeyword(child);
				if (
					!hasSubstitutionOrRandomFunction(child.value)
					&& !sourceCode.lexer.matchProperty(shorthand, child.value).error
					&& (!['animation', 'columns'].includes(shorthand) || keyword)
				) {
					setAllResetStates(child, keyword ?? 'initial');
				}
			}

			continue;
		}

		if (declarations.has(unprefixedProperty)) {
			duplicateComponents.add(unprefixedProperty);
		}

		declarations.set(unprefixedProperty, child);
	}

	addCandidate();
	return candidates;
};

const getCandidateValue = (candidate, sourceCode) => {
	const importance = candidate.declarations[0].important;
	if (
		candidate.declarations.some(declaration => declaration.important !== importance)
		|| candidate.resetStates.some(({declaration}) => declaration.important !== importance)
	) {
		return;
	}

	for (const [index, declaration] of candidate.declarations.entries()) {
		if (
			hasSubstitutionOrRandomFunction(declaration.value)
			|| sourceCode.lexer.matchProperty(candidate.components[index], declaration.value).error
		) {
			return;
		}
	}

	const value = serializeShorthand(candidate.shorthand, candidate.declarations, sourceCode);
	if (
		!value
		|| candidate.resetStates.some(({keyword}) => keyword !== (isCssWideKeyword(value) ? value : 'initial'))
		|| sourceCode.lexer.matchProperty(candidate.shorthand, value).error
	) {
		return;
	}

	return value;
};

const getFix = (candidate, block, context) => {
	const {sourceCode} = context;
	const declarationIndices = candidate.sourceDeclarations.map(declaration => block.children.indexOf(declaration));
	if (declarationIndices.some((index, arrayIndex) => arrayIndex > 0 && index !== declarationIndices[arrayIndex - 1] + 1)) {
		return;
	}

	const [start] = sourceCode.getRange(candidate.sourceDeclarations[0]);
	const lastDeclaration = candidate.sourceDeclarations.at(-1);
	const [, declarationEnd] = sourceCode.getRange(lastDeclaration);
	const trailingWhitespaceLength = sourceCode.getText(lastDeclaration).match(/[\t\n\f\r ]*$/v)[0].length;
	const end = declarationEnd - trailingWhitespaceLength;
	if (hasCommentInRange(context, [start, end])) {
		return;
	}

	const important = candidate.declarations[0].important ? ' !important' : '';
	const replacement = `${candidate.shorthand}: ${candidate.value}${important}`;
	return fixer => fixer.replaceTextRange([start, end], replacement);
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const ignoredShorthands = new Set(context.options[0].ignoreShorthands);

	context.on('Block', function * (block) {
		const firstDeclaration = block.children.find(child => child.type === 'Declaration');
		if (
			!firstDeclaration
			|| isCssModulesInteropDeclaration(firstDeclaration, context)
			// Tolerant mode keeps invalid values as `Raw` nodes, which cannot be analyzed.
			|| block.children.some(child => child.type === 'Declaration' && child.value.type === 'Raw' && !child.property.startsWith('--'))
		) {
			return;
		}

		const parent = sourceCode.getParent(block);
		if (parent?.type === 'Atrule') {
			const atRule = sourceCode.lexer.getAtrule(normalizeCssIdentifier(parent.name));
			if (!atRule || atRule.descriptors !== null) {
				return;
			}
		}

		const properties = new Set(block.children.filter(child => child.type === 'Declaration').map(child => toAsciiLowerCase(child.property)));
		const candidates = [];
		let catalogIndex = 0;
		for (const [shorthand, definition] of shorthandProperties) {
			// These shorthands need dedicated serializers for slash-separated values and comma-separated ranges.
			if (
				!ignoredShorthands.has(shorthand)
				&& !['mask-border', 'animation-range'].includes(shorthand)
				// A candidate needs every component, so skip the shorthand early.
				&& definition.components.every(component => properties.has(component))
			) {
				candidates.push(...getCandidates(block.children, {shorthand, definition, catalogIndex}, sourceCode));
			}

			catalogIndex++;
		}

		const usedDeclarations = new Set();
		const sortedCandidates = candidates
			.map(candidate => ({...candidate, value: getCandidateValue(candidate, sourceCode)}))
			.filter(candidate => candidate.value !== undefined)
			.toSorted((first, second) => second.sourceDeclarations.length - first.sourceDeclarations.length || first.catalogIndex - second.catalogIndex);

		for (const candidate of sortedCandidates) {
			if (candidate.sourceDeclarations.some(declaration => usedDeclarations.has(declaration))) {
				continue;
			}

			for (const declaration of candidate.sourceDeclarations) {
				usedDeclarations.add(declaration);
			}

			yield {
				node: candidate.sourceDeclarations.at(-1),
				messageId: MESSAGE_ID,
				data: {shorthand: candidate.shorthand},
				fix: getFix(candidate, block, context),
			};
		}
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow longhand properties that can be combined into a shorthand.',
			recommended: true,
		},
		fixable: 'code',
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					ignoreShorthands: {
						description: 'The shorthand properties to ignore.',
						type: 'array',
						uniqueItems: true,
						items: {
							type: 'string',
							enum: shorthandProperties.keys().toArray(),
						},
					},
				},
			},
		],
		defaultOptions: [{ignoreShorthands: []}],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
