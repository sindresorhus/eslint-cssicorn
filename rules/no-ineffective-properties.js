import {
	getSingleValueIdentifier,
	hasSubstitutionOrRandomFunction,
	isCssModulesInteropDeclaration,
	isCssWideKeyword,
	isKeyframesAtRule,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {BlockPlain, DeclarationPlain, Raw, ValuePlain} from '@eslint/css-tree';
@import {CSSSourceCode} from '@eslint/css';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID_DISPLAY = 'no-ineffective-properties/display';
const MESSAGE_ID_NOWRAP = 'no-ineffective-properties/nowrap';
const MESSAGE_ID_STATIC = 'no-ineffective-properties/static';
const MESSAGE_ID_OVERFLOW = 'no-ineffective-properties/overflow';
const MESSAGE_ID_MULTICOL = 'no-ineffective-properties/multicol';
const MESSAGE_ID_FLOAT = 'no-ineffective-properties/float';
const MESSAGE_ID_TEXT_OVERFLOW_DISPLAY = 'no-ineffective-properties/text-overflow-display';
const MESSAGE_ID_TABLE_SPACING = 'no-ineffective-properties/table-spacing';
const messages = {
	[MESSAGE_ID_DISPLAY]: '`{{property}}` has no effect with `display: {{display}}`. It requires a {{layout}} container.',
	[MESSAGE_ID_NOWRAP]: '`align-content` has no effect on a flex container with `nowrap`. Consider `align-items` or enabling wrapping.',
	[MESSAGE_ID_STATIC]: '`{{property}}` has no effect with `position: static`. Insets require a positioned element.',
	[MESSAGE_ID_OVERFLOW]: '`text-overflow: {{value}}` has no effect with `overflow: visible`. Ellipsis requires clipped inline overflow.',
	[MESSAGE_ID_MULTICOL]: '`{{property}}` has no effect with `display: {{display}}`. Multicol properties require a block container.',
	[MESSAGE_ID_FLOAT]: '`float: {{value}}` has no effect with `position: {{position}}`. Absolutely positioned elements cannot float.',
	[MESSAGE_ID_TEXT_OVERFLOW_DISPLAY]: '`text-overflow: {{value}}` has no effect with `display: {{display}}`. Apply it to a block container holding the text.',
	[MESSAGE_ID_TABLE_SPACING]: '`border-spacing` has no effect on this table with `border-collapse: collapse`. Use `border-collapse: separate` for spacing between cells.',
};

const flexProperties = new Set(['flex-direction', 'flex-wrap', 'flex-flow']);
const gridProperties = new Set(['grid', 'grid-template', 'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-columns', 'grid-auto-rows', 'grid-auto-flow']);
const insetProperties = new Set(['top', 'right', 'bottom', 'left', 'inset', 'inset-block', 'inset-inline', 'inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end']);
const multicolProperties = new Set(['columns', 'column-count', 'column-width']);
const floatValues = new Set(['left', 'right', 'inline-start', 'inline-end']);
const targetProperties = new Set([...flexProperties, ...gridProperties, ...insetProperties, ...multicolProperties, 'align-content', 'text-overflow', 'float', 'border-spacing']);
const overflowProperties = ['overflow', 'overflow-x', 'overflow-y', 'overflow-inline', 'overflow-block'];

/**
Get a validated keyword value only when exactly one declaration controls the property or shorthand group. Multiple declarations may be intentional fallbacks.

@param {Map<string, {node: DeclarationPlain, property: string}[]>} declarationsByProperty
@param {string[]} properties
@param {CSSSourceCode} sourceCode
*/
const getControllingValue = (declarationsByProperty, properties, sourceCode) => {
	const declarations = properties.flatMap(property => declarationsByProperty.get(property) ?? []);
	if (declarations.length !== 1) {
		return;
	}

	const [{node, property}] = declarations;
	if (node.value.type !== 'Value' || node.value.children.length === 0) {
		return;
	}

	const keywords = node.value.children.map(child => child.type === 'Identifier' ? normalizeCssIdentifier(child.name) : '');
	// Only ordinary ASCII keywords are supported, so joining decoded names cannot introduce extra tokens or escape syntax.
	if (keywords.some(keyword => !/^[a-z][-a-z]*$/u.test(keyword))) {
		return;
	}

	const value = keywords.join(' ');
	if (isCssWideKeyword(value) || sourceCode.lexer.matchProperty(property, value).error) {
		return;
	}

	return value;
};

/**
Check whether a block contains style declarations, excluding keyframes and descriptors.

@param {BlockPlain} block
@param {CSSSourceCode} sourceCode
*/
const isStyleBlock = (block, sourceCode) => {
	const parent = sourceCode.getParent(block);
	if (parent?.type === 'Atrule') {
		const atRule = sourceCode.lexer.getAtrule(normalizeCssIdentifier(parent.name));
		if (!atRule || atRule.descriptors !== null) {
			return false;
		}
	} else if (parent?.type !== 'Rule') {
		return false;
	}

	const ancestors = sourceCode.getAncestors(block);
	return ancestors.some(node => node.type === 'Rule' && node.prelude?.type === 'SelectorList')
		&& ancestors.every(node => !isKeyframesAtRule(node));
};

/**
Get a validated one- or two-keyword text-overflow value that includes ellipsis.

@param {ValuePlain | Raw} value
@returns {string | undefined}
*/
const getEllipsisValue = value => {
	if (value.type !== 'Value' || value.children.length > 2) {
		return;
	}

	const keywords = value.children.map(child => child.type === 'Identifier' ? normalizeCssIdentifier(child.name) : undefined);
	if (!keywords.includes('ellipsis') || keywords.some(keyword => keyword !== 'clip' && keyword !== 'ellipsis')) {
		return;
	}

	return keywords.join(' ');
};

/**
Get the problem for a container property given the explicit layout controls in its block.

@param {DeclarationPlain} node
@param {string} property
@param {{display: string | undefined, hasVisibleDisplay: boolean, isFlex: boolean, isGrid: boolean, hasCollapsedTable: boolean}} controls
*/
const getContainerProblem = (node, property, {display, hasVisibleDisplay, isFlex, isGrid, hasCollapsedTable}) => {
	if (hasVisibleDisplay && ((flexProperties.has(property) && !isFlex) || (gridProperties.has(property) && !isGrid))) {
		const layout = flexProperties.has(property) ? 'flex' : 'grid';
		return {node, messageId: MESSAGE_ID_DISPLAY, data: {property, display, layout}};
	}

	if (multicolProperties.has(property) && (isFlex || isGrid)) {
		return {node, messageId: MESSAGE_ID_MULTICOL, data: {property, display}};
	}

	if (property === 'border-spacing' && hasCollapsedTable) {
		return {node, messageId: MESSAGE_ID_TABLE_SPACING};
	}
};

/**
Get the problem for a declaration given the explicit layout controls in its block.

@param {DeclarationPlain} node
@param {string} property
@param {{display: string | undefined, hasVisibleDisplay: boolean, isFlex: boolean, isGrid: boolean, hasCollapsedTable: boolean, hasExplicitNowrap: boolean, position: string | undefined, hasVisibleOverflow: boolean}} controls
*/
const getDeclarationProblem = (node, property, controls) => {
	const identifier = getSingleValueIdentifier(node);
	const keyword = identifier ? normalizeCssIdentifier(identifier.name) : undefined;
	if (isCssWideKeyword(keyword)) {
		return;
	}

	const containerProblem = getContainerProblem(node, property, controls);
	if (containerProblem) {
		return containerProblem;
	}

	const {display, isFlex, isGrid, hasExplicitNowrap, position, hasVisibleOverflow} = controls;
	if (property === 'align-content' && hasExplicitNowrap) {
		return {node, messageId: MESSAGE_ID_NOWRAP};
	}

	if (insetProperties.has(property) && position === 'static') {
		return {node, messageId: MESSAGE_ID_STATIC, data: {property}};
	}

	if (property === 'float' && (position === 'absolute' || position === 'fixed') && floatValues.has(keyword)) {
		return {node, messageId: MESSAGE_ID_FLOAT, data: {value: keyword, position}};
	}

	if (property === 'text-overflow' && (isFlex || isGrid || hasVisibleOverflow)) {
		const value = getEllipsisValue(node.value);
		if (!value) {
			return;
		}

		if (isFlex || isGrid) {
			return {node, messageId: MESSAGE_ID_TEXT_OVERFLOW_DISPLAY, data: {value, display}};
		}

		return {node, messageId: MESSAGE_ID_OVERFLOW, data: {value}};
	}
};

/**
Get the explicit layout controls for a declaration block.

@param {Map<string, {node: DeclarationPlain, property: string}[]>} declarationsByProperty
@param {CSSSourceCode} sourceCode
*/
const getLayoutControls = (declarationsByProperty, sourceCode) => {
	const display = getControllingValue(declarationsByProperty, ['display'], sourceCode);
	const hasVisibleDisplay = display !== undefined && display !== 'none' && display !== 'contents';
	const isFlex = hasVisibleDisplay && (display === 'inline-flex' || display.split(' ').includes('flex'));
	const isGrid = hasVisibleDisplay && (display === 'inline-grid' || display.split(' ').includes('grid'));
	const wrapping = isFlex ? getControllingValue(declarationsByProperty, ['flex-wrap', 'flex-flow'], sourceCode) : undefined;
	const hasExplicitNowrap = wrapping?.split(' ').includes('nowrap') === true;
	const position = getControllingValue(declarationsByProperty, ['position'], sourceCode);
	const overflow = getControllingValue(declarationsByProperty, overflowProperties, sourceCode);
	// Only the shorthand establishes both axes without needing writing-mode or computed-value inference.
	const hasVisibleOverflow = declarationsByProperty.has('overflow') && (overflow === 'visible' || overflow === 'visible visible');
	const hasCollapsedTable = (display === 'inline-table' || display?.split(' ').includes('table') === true)
		&& getControllingValue(declarationsByProperty, ['border-collapse'], sourceCode) === 'collapse';

	return {
		display, hasVisibleDisplay, isFlex, isGrid, hasCollapsedTable, hasExplicitNowrap, position, hasVisibleOverflow,
	};
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Block', function * (block) {
		const declarations = block.children.filter(node => node.type === 'Declaration').map(node => ({node, property: normalizeCssIdentifier(node.property)}));
		if (
			declarations.every(({property}) => !targetProperties.has(property))
			|| declarations.some(({property}) => property === 'all')
			|| isCssModulesInteropDeclaration(declarations[0].node, context)
			|| !isStyleBlock(block, sourceCode)
		) {
			return;
		}

		const declarationsByProperty = Map.groupBy(declarations, ({property}) => property);
		const controls = getLayoutControls(declarationsByProperty, sourceCode);

		for (const {node, property} of declarations) {
			if (!targetProperties.has(property) || node.value.type !== 'Value') {
				continue;
			}

			const problem = getDeclarationProblem(node, property, controls);
			if (problem && !hasSubstitutionOrRandomFunction(node.value)) {
				yield problem;
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
			description: 'Disallow properties that have no effect given other declarations in the same block.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
