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
const MESSAGE_ID_TABLE_PADDING = 'no-ineffective-properties/table-padding';
const MESSAGE_ID_CLEAR = 'no-ineffective-properties/clear';
const MESSAGE_ID_PERSPECTIVE = 'no-ineffective-properties/perspective';
const MESSAGE_ID_COLUMN_SPAN = 'no-ineffective-properties/column-span';
const MESSAGE_ID_MOTION = 'no-ineffective-properties/motion';
const MESSAGE_ID_SHAPE_IMAGE_THRESHOLD = 'no-ineffective-properties/shape-image-threshold';
const MESSAGE_ID_DECORATION = 'no-ineffective-properties/decoration';
const MESSAGE_ID_BACKGROUND_IMAGE = 'no-ineffective-properties/background-image';
const MESSAGE_ID_BORDER_IMAGE = 'no-ineffective-properties/border-image';
const MESSAGE_ID_MASK_IMAGE = 'no-ineffective-properties/mask-image';
const MESSAGE_ID_ANIMATION = 'no-ineffective-properties/animation';
const MESSAGE_ID_TRANSITION = 'no-ineffective-properties/transition';
const MESSAGE_ID_SCROLL_TIMELINE = 'no-ineffective-properties/scroll-timeline';
const MESSAGE_ID_VIEW_TIMELINE = 'no-ineffective-properties/view-timeline';
const messages = {
	[MESSAGE_ID_DISPLAY]: '`{{property}}` has no effect with `display: {{display}}`. It requires a {{layout}} container.',
	[MESSAGE_ID_NOWRAP]: '`align-content` has no effect on a flex container with `nowrap`. Consider `align-items` or enabling wrapping.',
	[MESSAGE_ID_STATIC]: '`{{property}}` has no effect with `position: static`. Insets require a positioned element.',
	[MESSAGE_ID_OVERFLOW]: '`text-overflow: {{value}}` has no effect with `overflow: visible`. Ellipsis requires clipped inline overflow.',
	[MESSAGE_ID_MULTICOL]: '`{{property}}` has no effect with `display: {{display}}`. Multicol properties require a block container.',
	[MESSAGE_ID_FLOAT]: '`float: {{value}}` has no effect with `position: {{position}}`. Absolutely positioned elements cannot float.',
	[MESSAGE_ID_TEXT_OVERFLOW_DISPLAY]: '`text-overflow: {{value}}` has no effect with `display: {{display}}`. Apply it to a block container holding the text.',
	[MESSAGE_ID_TABLE_SPACING]: '`border-spacing` has no effect on this table with `border-collapse: collapse`. Use `border-collapse: separate` for spacing between cells.',
	[MESSAGE_ID_TABLE_PADDING]: '`{{property}}` has no effect on this table with `border-collapse: collapse`. Apply padding to table cells or use separate borders.',
	[MESSAGE_ID_CLEAR]: '`clear: {{value}}` has no effect with `position: {{position}}`. Absolutely positioned elements do not participate in normal flow.',
	[MESSAGE_ID_PERSPECTIVE]: '`perspective-origin` has no effect with `perspective: none`. Set a perspective distance to use this origin.',
	[MESSAGE_ID_COLUMN_SPAN]: '`column-span: all` has no effect with `position: {{position}}`. Only in-flow elements can span columns.',
	[MESSAGE_ID_MOTION]: '`{{property}}` has no effect with `offset-path: none`. Set an offset path to use this property.',
	[MESSAGE_ID_SHAPE_IMAGE_THRESHOLD]: '`shape-image-threshold` has no effect with `shape-outside: none`. It defines the alpha threshold for an image-based shape.',
	[MESSAGE_ID_DECORATION]: '`{{property}}` has no effect with `text-decoration-line: none`. Enable a text decoration line on this element.',
	[MESSAGE_ID_BACKGROUND_IMAGE]: '`{{property}}` has no effect with `background-image: none`. Set a background image to use this property.',
	[MESSAGE_ID_BORDER_IMAGE]: '`{{property}}` has no effect with `border-image-source: none`. Set a border image to use this property.',
	[MESSAGE_ID_MASK_IMAGE]: '`{{property}}` has no effect with `mask-image: none`. Set a mask image to use this property.',
	[MESSAGE_ID_ANIMATION]: '`{{property}}` has no effect with `animation-name: none`. Set an animation name to use this property.',
	[MESSAGE_ID_TRANSITION]: '`{{property}}` has no effect with `transition-property: none`. Select at least one property to transition.',
	[MESSAGE_ID_SCROLL_TIMELINE]: '`{{property}}` has no effect with `scroll-timeline-name: none`. Name a scroll timeline to use this property.',
	[MESSAGE_ID_VIEW_TIMELINE]: '`{{property}}` has no effect with `view-timeline-name: none`. Name a view timeline to use this property.',
};

const flexProperties = new Set(['flex-direction', 'flex-wrap', 'flex-flow']);
const gridProperties = new Set(['grid', 'grid-template', 'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-columns', 'grid-auto-rows', 'grid-auto-flow']);
const insetProperties = new Set(['top', 'right', 'bottom', 'left', 'inset', 'inset-block', 'inset-inline', 'inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end']);
const paddingProperties = new Set([
	'padding',
	'padding-top',
	'padding-right',
	'padding-bottom',
	'padding-left',
	'padding-block',
	'padding-inline',
	'padding-block-start',
	'padding-block-end',
	'padding-inline-start',
	'padding-inline-end',
]);
const multicolProperties = new Set(['columns', 'column-count', 'column-width', 'column-fill']);
// The first controller must be explicit. Other controllers can override or reset it.
const inactivePropertyGroups = [
	{properties: ['perspective-origin'], controllingProperties: ['perspective', '-webkit-perspective'], messageId: MESSAGE_ID_PERSPECTIVE},
	{properties: ['offset-distance', 'offset-rotate', 'offset-anchor'], controllingProperties: ['offset-path', 'offset'], messageId: MESSAGE_ID_MOTION},
	{properties: ['shape-image-threshold'], controllingProperties: ['shape-outside', '-webkit-shape-outside'], messageId: MESSAGE_ID_SHAPE_IMAGE_THRESHOLD},
	{
		properties: ['text-decoration-color', 'text-decoration-style', 'text-decoration-thickness'],
		controllingProperties: ['text-decoration-line', 'text-decoration', '-webkit-text-decoration-line', '-webkit-text-decoration'],
		messageId: MESSAGE_ID_DECORATION,
	},
	{
		properties: ['background-position', 'background-position-x', 'background-position-y', 'background-size', 'background-repeat', 'background-origin'],
		controllingProperties: ['background-image', 'background'],
		messageId: MESSAGE_ID_BACKGROUND_IMAGE,
	},
	{
		properties: ['border-image-slice', 'border-image-width', 'border-image-outset', 'border-image-repeat'],
		controllingProperties: ['border-image-source', 'border-image', 'border', '-webkit-border-image'],
		messageId: MESSAGE_ID_BORDER_IMAGE,
	},
	{
		properties: ['mask-position', 'mask-size', 'mask-repeat', 'mask-origin', 'mask-clip', 'mask-mode', 'mask-composite'],
		controllingProperties: ['mask-image', 'mask', '-webkit-mask-image', '-webkit-mask'],
		messageId: MESSAGE_ID_MASK_IMAGE,
	},
	{
		properties: [
			'animation-duration',
			'animation-delay',
			'animation-timing-function',
			'animation-iteration-count',
			'animation-direction',
			'animation-fill-mode',
			'animation-play-state',
			'animation-composition',
			'animation-timeline',
			'animation-range',
			'animation-range-start',
			'animation-range-end',
		],
		controllingProperties: ['animation-name', 'animation', '-webkit-animation-name', '-webkit-animation'],
		messageId: MESSAGE_ID_ANIMATION,
	},
	{
		properties: ['transition-duration', 'transition-delay', 'transition-timing-function', 'transition-behavior'],
		controllingProperties: ['transition-property', 'transition', '-webkit-transition-property', '-webkit-transition'],
		messageId: MESSAGE_ID_TRANSITION,
	},
	{properties: ['scroll-timeline-axis'], controllingProperties: ['scroll-timeline-name', 'scroll-timeline'], messageId: MESSAGE_ID_SCROLL_TIMELINE},
	{properties: ['view-timeline-axis', 'view-timeline-inset'], controllingProperties: ['view-timeline-name', 'view-timeline'], messageId: MESSAGE_ID_VIEW_TIMELINE},
];
const floatValues = new Set(['left', 'right', 'inline-start', 'inline-end']);
const clearValues = new Set([...floatValues, 'both']);
const targetProperties = new Set([
	...flexProperties,
	...gridProperties,
	...insetProperties,
	...paddingProperties,
	...multicolProperties,
	...inactivePropertyGroups.flatMap(({properties}) => properties),
	'align-content',
	'text-overflow',
	'float',
	'clear',
	'border-spacing',
	'table-layout',
	'column-span',
]);
const overflowProperties = ['overflow', 'overflow-x', 'overflow-y', 'overflow-inline', 'overflow-block'];

/**
Get a validated keyword value from a single unprefixed controlling declaration. Multiple declarations in the property or shorthand group may be intentional fallbacks.

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
	if (property.startsWith('-') || node.value.type !== 'Value' || node.value.children.length === 0) {
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
@param {ReturnType<typeof getBlockControls>} controls
*/
const getContainerProblem = (node, property, {display, hasVisibleDisplay, isFlex, isGrid, isTable, hasCollapsedTable}) => {
	if (hasVisibleDisplay && ((flexProperties.has(property) && !isFlex) || (gridProperties.has(property) && !isGrid) || (property === 'table-layout' && !isTable))) {
		const layout = flexProperties.has(property) ? 'flex' : (gridProperties.has(property) ? 'grid' : 'table');
		return {node, messageId: MESSAGE_ID_DISPLAY, data: {property, display, layout}};
	}

	if (multicolProperties.has(property) && (isFlex || isGrid)) {
		return {node, messageId: MESSAGE_ID_MULTICOL, data: {property, display}};
	}

	if (property === 'border-spacing' && hasCollapsedTable) {
		return {node, messageId: MESSAGE_ID_TABLE_SPACING};
	}

	if (paddingProperties.has(property) && hasCollapsedTable) {
		return {node, messageId: MESSAGE_ID_TABLE_PADDING, data: {property}};
	}
};

/**
Get the problem for a property given the explicit position in its block.

@param {DeclarationPlain} node
@param {string} property
@param {string | undefined} keyword
@param {ReturnType<typeof getBlockControls>} controls
*/
const getPositionProblem = (node, property, keyword, {position}) => {
	if (insetProperties.has(property) && position === 'static') {
		return {node, messageId: MESSAGE_ID_STATIC, data: {property}};
	}

	if ((position !== 'absolute' && position !== 'fixed') || keyword === undefined) {
		return;
	}

	if (property === 'float' && floatValues.has(keyword)) {
		return {node, messageId: MESSAGE_ID_FLOAT, data: {value: keyword, position}};
	}

	if (property === 'clear' && clearValues.has(keyword)) {
		return {node, messageId: MESSAGE_ID_CLEAR, data: {value: keyword, position}};
	}

	if (property === 'column-span' && keyword === 'all') {
		return {node, messageId: MESSAGE_ID_COLUMN_SPAN, data: {position}};
	}
};

/**
Get the problem for a property whose effect is explicitly disabled in its block.

@param {DeclarationPlain} node
@param {string} property
@param {ReturnType<typeof getBlockControls>} controls
*/
const getInactiveEffectProblem = (node, property, {inactiveProperties}) => {
	const messageId = inactiveProperties.get(property);
	if (messageId) {
		return {node, messageId, data: {property}};
	}
};

/**
Get the problem for a declaration given the explicit controls in its block.

@param {DeclarationPlain} node
@param {string} property
@param {ReturnType<typeof getBlockControls>} controls
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

	const {display, isFlex, isGrid, hasExplicitNowrap, hasVisibleOverflow} = controls;
	if (property === 'align-content' && hasExplicitNowrap) {
		return {node, messageId: MESSAGE_ID_NOWRAP};
	}

	const positionProblem = getPositionProblem(node, property, keyword, controls);
	if (positionProblem) {
		return positionProblem;
	}

	const inactiveEffectProblem = getInactiveEffectProblem(node, property, controls);
	if (inactiveEffectProblem) {
		return inactiveEffectProblem;
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
Get the explicit controlling values for a declaration block.

@param {Map<string, {node: DeclarationPlain, property: string}[]>} declarationsByProperty
@param {CSSSourceCode} sourceCode
*/
const getBlockControls = (declarationsByProperty, sourceCode) => {
	const display = getControllingValue(declarationsByProperty, ['display'], sourceCode);
	const hasVisibleDisplay = display !== undefined && display !== 'none' && display !== 'contents';
	const isFlex = hasVisibleDisplay && (display === 'inline-flex' || display.split(' ').includes('flex'));
	const isGrid = hasVisibleDisplay && (display === 'inline-grid' || display.split(' ').includes('grid'));
	const isTable = hasVisibleDisplay && (display === 'inline-table' || display.split(' ').includes('table'));
	const wrapping = isFlex ? getControllingValue(declarationsByProperty, ['flex-wrap', 'flex-flow', '-webkit-flex-wrap', '-webkit-flex-flow'], sourceCode) : undefined;
	const hasExplicitNowrap = wrapping?.split(' ').includes('nowrap') === true;
	const position = getControllingValue(declarationsByProperty, ['position'], sourceCode);
	const overflow = getControllingValue(declarationsByProperty, overflowProperties, sourceCode);
	// Only the shorthand establishes both axes without needing writing-mode or computed-value inference.
	const hasVisibleOverflow = declarationsByProperty.has('overflow') && (overflow === 'visible' || overflow === 'visible visible');
	const hasCollapsedTable = isTable && getControllingValue(declarationsByProperty, ['border-collapse'], sourceCode) === 'collapse';
	/**
	@type {Map<string, string>}
	*/
	const inactiveProperties = new Map();
	for (const {properties, controllingProperties, messageId} of inactivePropertyGroups) {
		if (!declarationsByProperty.has(controllingProperties[0]) || getControllingValue(declarationsByProperty, controllingProperties, sourceCode) !== 'none') {
			continue;
		}

		for (const property of properties) {
			inactiveProperties.set(property, messageId);
		}
	}

	return {
		display,
		hasVisibleDisplay,
		isFlex,
		isGrid,
		isTable,
		hasCollapsedTable,
		hasExplicitNowrap,
		position,
		hasVisibleOverflow,
		inactiveProperties,
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
		const controls = getBlockControls(declarationsByProperty, sourceCode);

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
