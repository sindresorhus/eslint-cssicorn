import {isPseudoElementNode, isStandardPseudoSelector} from './shared/css-selector-specificity.js';
import {
	getBasePropertyName,
	getCanonicalLexerNode,
	getCssWideKeyword,
	getSingleValueIdentifier,
	hasSubstitutionOrRandomFunction,
	isCssModulesInteropDeclaration,
	isCssWideKeyword,
	isStyleBlock,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {BlockPlain, DeclarationPlain, Raw, ValuePlain} from '@eslint/css-tree';
@import {CSSSourceCode} from '@eslint/css';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID_DISPLAY = 'no-ineffective-properties/display';
const MESSAGE_ID_VERTICAL_ALIGN = 'no-ineffective-properties/vertical-align';
const MESSAGE_ID_FLEX_ITEM = 'no-ineffective-properties/flex-item';
const MESSAGE_ID_GRID_ITEM = 'no-ineffective-properties/grid-item';
const MESSAGE_ID_FLOW_ITEM = 'no-ineffective-properties/flow-item';
const MESSAGE_ID_NOWRAP = 'no-ineffective-properties/nowrap';
const MESSAGE_ID_STATIC = 'no-ineffective-properties/static';
const MESSAGE_ID_POSITION = 'no-ineffective-properties/position';
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
const MESSAGE_ID_OMITTED_SHORTHAND_COMPONENT = 'no-ineffective-properties/omitted-shorthand-component';
const messages = {
	[MESSAGE_ID_DISPLAY]: '`{{property}}` has no effect with `display: {{display}}`. It requires a {{layout}} container.',
	[MESSAGE_ID_VERTICAL_ALIGN]: '`vertical-align` has no effect with `display: {{display}}`. It requires an inline-level box or a table cell.',
	[MESSAGE_ID_FLEX_ITEM]: '`{{property}}` has no effect on a flex item.',
	[MESSAGE_ID_GRID_ITEM]: '`{{property}}` has no effect on a grid item.',
	[MESSAGE_ID_FLOW_ITEM]: '`{{property}}` has no effect on an ordinary flow item.',
	[MESSAGE_ID_NOWRAP]: '`align-content` has no effect on a flex container with `nowrap`. Consider `align-items` or enabling wrapping.',
	[MESSAGE_ID_STATIC]: '`{{property}}` has no effect with `position: static`. Insets require a positioned element.',
	[MESSAGE_ID_POSITION]: '`{{property}}` has no effect with `position: {{position}}`. It requires an in-flow box.',
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
	[MESSAGE_ID_OMITTED_SHORTHAND_COMPONENT]: '`{{property}}` omits {{component}}, which defaults to `none`.',
};

const flexProperties = new Set(['flex-direction', 'flex-wrap', 'flex-flow']);
const gridProperties = new Set(['grid', 'grid-template', 'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-columns', 'grid-auto-rows', 'grid-auto-flow']);
const gridPlacementProperties = new Set(['grid-area', 'grid-row', 'grid-column', 'grid-row-start', 'grid-row-end', 'grid-column-start', 'grid-column-end']);
const flexItemProperties = new Set(['justify-self', ...gridPlacementProperties]);
const flexSizingProperties = new Set(['flex', 'flex-basis', 'flex-grow', 'flex-shrink']);
const flowItemProperties = new Set([...flexSizingProperties, ...gridPlacementProperties, 'order', 'align-self']);
const itemProperties = new Set([...flexItemProperties, ...flowItemProperties, 'float', 'clear', 'column-span']);
const flowDisplayKeywords = new Set(['block', 'inline', 'flow', 'flow-root', 'list-item']);
const blockDisplayKeywords = new Set(['block', 'flow', 'flow-root', 'flex', 'grid', 'table', 'list-item', 'table-caption']);
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
const borderShorthands = [
	'border',
	'border-top',
	'border-right',
	'border-bottom',
	'border-left',
	'border-block',
	'border-inline',
	'border-block-start',
	'border-block-end',
	'border-inline-start',
	'border-inline-end',
];
const shorthandPropertyGroups = [
	{
		properties: borderShorthands,
		controllingProperties: [...borderShorthands, ...borderShorthands.map(property => `${property}-style`), 'border-image', 'border-image-source'],
		component: 'the border style',
		type: 'line-style',
	},
	{
		properties: ['outline'], controllingProperties: ['outline', 'outline-style'], component: 'the outline style', property: 'outline-style',
	},
	{
		properties: ['animation'], controllingProperties: ['animation', 'animation-name'], component: 'an animation name', type: 'keyframes-name',
	},
	{
		properties: ['column-rule'], controllingProperties: ['column-rule', 'column-rule-style', 'rule', 'rule-style'], component: 'the column rule style', type: 'line-style',
	},
	{
		properties: ['text-decoration'], controllingProperties: ['text-decoration', 'text-decoration-line'], component: 'the decoration line', property: 'text-decoration-line',
	},
	{
		properties: ['text-emphasis'], controllingProperties: ['text-emphasis', 'text-emphasis-style'], component: 'the emphasis mark style', property: 'text-emphasis-style',
	},
];
const shorthandProperties = new Set(shorthandPropertyGroups.flatMap(({properties}) => properties));
const targetProperties = new Set([
	...flexProperties,
	...gridProperties,
	...itemProperties,
	...insetProperties,
	...paddingProperties,
	...multicolProperties,
	...shorthandProperties,
	...inactivePropertyGroups.flatMap(({properties}) => properties),
	'align-content',
	'vertical-align',
	'text-overflow',
	'border-spacing',
	'table-layout',
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
	if (keywords.some(keyword => !/^[a-z][\-a-z]*$/v.test(keyword))) {
		return;
	}

	const value = keywords.join(' ');
	if (isCssWideKeyword(value) || sourceCode.lexer.matchProperty(property, value).error) {
		return;
	}

	return value;
};

/**
Check whether a node is a supported element filter in a parent or item compound.

@param {import('@eslint/css-tree').CssNodePlain} node
@returns {boolean}
*/
const isSupportedSelectorFilter = node => ['ClassSelector', 'IdSelector', 'TypeSelector', 'AttributeSelector'].includes(node.type)
	|| (node.type === 'PseudoClassSelector' && !isPseudoElementNode(node) && isStandardPseudoSelector(node));

/**
Get the flex, grid, or ordinary flow layout from a validated display value.

@param {string | undefined} display
@returns {'flex' | 'grid' | 'flow' | undefined}
*/
const getDisplayLayout = display => {
	if (display === undefined) {
		return;
	}

	const keywords = display.split(' ');
	if (display === 'inline-flex' || keywords.includes('flex')) {
		return 'flex';
	}

	if (display === 'inline-grid' || keywords.includes('grid')) {
		return 'grid';
	}

	if (display === 'inline-block' || keywords.every(keyword => flowDisplayKeywords.has(keyword))) {
		return 'flow';
	}
};

/**
Get the layout of an explicit parent container for ordinary items. Only nested child selectors are supported; no cascade or descendant layout is inferred.

@param {BlockPlain} block
@param {Map<string, {node: DeclarationPlain, property: string}[]>} declarationsByProperty
@param {ReturnType<typeof getBlockControls>} controls
@param {CSSSourceCode} sourceCode
@returns {'flex' | 'grid' | 'flow' | undefined}
*/
const getItemLayout = (block, declarationsByProperty, {position, hasVisibleDisplay}, sourceCode) => {
	if (
		(declarationsByProperty.has('position') && !['static', 'relative', 'sticky'].includes(position))
		|| (declarationsByProperty.has('display') && !hasVisibleDisplay)
	) {
		return;
	}

	const rule = sourceCode.getParent(block);
	if (rule?.type !== 'Rule' || rule.prelude?.type !== 'SelectorList' || rule.prelude.children.length === 0) {
		return;
	}

	const selectsChildren = rule.prelude.children.every(selector => {
		if (selector.type !== 'Selector') {
			return false;
		}

		const nodes = selector.children;
		const combinatorIndex = nodes.findIndex(node => node.type === 'Combinator');
		return nodes[combinatorIndex]?.type === 'Combinator'
			&& nodes[combinatorIndex].name === '>'
			&& (combinatorIndex === 0 || (nodes[0]?.type === 'NestingSelector' && nodes.slice(1, combinatorIndex).every(node => isSupportedSelectorFilter(node))))
			&& nodes.length > combinatorIndex + 1
			&& nodes.slice(combinatorIndex + 1).every(node => isSupportedSelectorFilter(node));
	});
	if (!selectsChildren) {
		return;
	}

	const parentBlock = sourceCode.getParent(rule);
	if (parentBlock?.type !== 'Block') {
		return;
	}

	const parentDeclarations = parentBlock.children.filter(node => node.type === 'Declaration').map(node => ({node, property: normalizeCssIdentifier(node.property)}));
	if (parentDeclarations.some(({property}) => property === 'all')) {
		return;
	}

	const display = getControllingValue(Map.groupBy(parentDeclarations, ({property}) => property), ['display'], sourceCode);
	return getDisplayLayout(display);
};

/**
Get the problem for a property that cannot affect an ordinary item in its known parent layout.

@param {DeclarationPlain} node
@param {string} property
@param {string | undefined} keyword
@param {'flex' | 'grid' | 'flow' | undefined} layout
*/
const getItemProblem = (node, property, keyword, layout) => {
	if (layout === undefined) {
		return;
	}

	if (layout === 'flow') {
		return flowItemProperties.has(property) ? {node, messageId: MESSAGE_ID_FLOW_ITEM, data: {property}} : undefined;
	}

	const ineffectiveProperties = layout === 'flex' ? flexItemProperties : flexSizingProperties;
	if (
		ineffectiveProperties.has(property)
		|| (property === 'float' && floatValues.has(keyword))
		|| (property === 'clear' && clearValues.has(keyword))
		|| (property === 'column-span' && keyword === 'all')
	) {
		return {node, messageId: layout === 'flex' ? MESSAGE_ID_FLEX_ITEM : MESSAGE_ID_GRID_ITEM, data: {property}};
	}
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
	if (property === 'vertical-align' && hasVisibleDisplay && display.split(' ').every(keyword => blockDisplayKeywords.has(keyword))) {
		return {node, messageId: MESSAGE_ID_VERTICAL_ALIGN, data: {display}};
	}

	const isFlexProperty = flexProperties.has(property);
	const isGridProperty = gridProperties.has(property);
	if (hasVisibleDisplay && ((isFlexProperty && !isFlex) || (isGridProperty && !isGrid) || (property === 'table-layout' && !isTable))) {
		const layout = isFlexProperty ? 'flex' : (isGridProperty ? 'grid' : 'table');
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

	if (position !== 'absolute' && position !== 'fixed') {
		return;
	}

	if (flexSizingProperties.has(property) || property === 'order' || property === 'vertical-align') {
		return {node, messageId: MESSAGE_ID_POSITION, data: {property, position}};
	}

	if (keyword === undefined) {
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
Get problems for omitted shorthand components without resolving competing declarations or their vendor-prefixed aliases.

@param {{node: DeclarationPlain, property: string}[]} declarations
@param {CSSSourceCode} sourceCode
*/
const getOmittedShorthandProblems = function * (declarations, sourceCode) {
	if (declarations.every(({property}) => !shorthandProperties.has(property))) {
		return;
	}

	const declarationsByProperty = Map.groupBy(declarations, ({property}) => getBasePropertyName(property));
	for (const group of shorthandPropertyGroups) {
		const controllingDeclarations = group.controllingProperties.flatMap(property => declarationsByProperty.get(property) ?? []);
		if (controllingDeclarations.length !== 1) {
			continue;
		}

		const [{node, property}] = controllingDeclarations;
		if (
			!group.properties.includes(property)
			|| node.value.type !== 'Value'
			|| getCssWideKeyword(node) !== undefined
			|| hasSubstitutionOrRandomFunction(node.value)
		) {
			continue;
		}

		const value = getCanonicalLexerNode(node.value);
		const match = sourceCode.lexer.matchProperty(property, value);
		if (!match.matched) {
			continue;
		}

		const {children} = value;
		if (children.some(child => group.type ? match.isType(child, group.type) : match.isProperty(child, group.property))) {
			continue;
		}

		if (property === 'animation') {
			// Explicit `none` can be an intentional reset; browsers and the grammar differ on `auto` and timeline components.
			if (children.some(child => match.isType(child, 'single-animation-timeline') || (child.type === 'Identifier' && ['none', 'auto'].includes(normalizeCssIdentifier(child.name))))) {
				continue;
			}
		} else if (children.some(child => (child.type === 'Number' || child.type === 'Dimension') && Number(child.value) === 0 && match.isType(child, 'line-width'))) {
			continue;
		}

		yield {node, messageId: MESSAGE_ID_OMITTED_SHORTHAND_COMPONENT, data: {property, component: group.component}};
	}
};

/**
Get the problem for a declaration given the explicit controls in its block.

@param {DeclarationPlain} node
@param {string} property
@param {ReturnType<typeof getBlockControls>} controls
@param {'flex' | 'grid' | 'flow' | undefined} itemLayout
*/
const getDeclarationProblem = (node, property, controls, itemLayout) => {
	const identifier = getSingleValueIdentifier(node);
	const keyword = identifier ? normalizeCssIdentifier(identifier.name) : undefined;
	if (isCssWideKeyword(keyword)) {
		return;
	}

	const itemProblem = getItemProblem(node, property, keyword, itemLayout);
	if (itemProblem) {
		return itemProblem;
	}

	const containerProblem = getContainerProblem(node, property, controls);
	if (containerProblem) {
		return containerProblem;
	}

	const {display, isFlex, isGrid, hasNowrap, hasVisibleOverflow} = controls;
	if (property === 'align-content' && hasNowrap) {
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
	const layout = getDisplayLayout(display);
	const isFlex = layout === 'flex';
	const isGrid = layout === 'grid';
	const isTable = hasVisibleDisplay && (display === 'inline-table' || display.split(' ').includes('table'));
	const wrapping = isFlex ? getControllingValue(declarationsByProperty, ['flex-wrap', 'flex-flow', '-webkit-flex-wrap', '-webkit-flex-flow'], sourceCode) : undefined;
	const hasNowrap = wrapping !== undefined && wrapping.split(' ').every(keyword => !(keyword === 'wrap' || keyword === 'wrap-reverse'));
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
		hasNowrap,
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
			|| !isStyleBlock(block, context)
		) {
			return;
		}

		const declarationsByProperty = Map.groupBy(declarations, ({property}) => property);
		const controls = getBlockControls(declarationsByProperty, sourceCode);
		const itemLayout = declarations.some(({property}) => itemProperties.has(property))
			? getItemLayout(block, declarationsByProperty, controls, sourceCode)
			: undefined;

		yield * getOmittedShorthandProblems(declarations, sourceCode);

		for (const {node, property} of declarations) {
			if (!targetProperties.has(property) || node.value.type !== 'Value') {
				continue;
			}

			const problem = getDeclarationProblem(node, property, controls, itemLayout);
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
			description: 'Disallow properties that have no effect given other declarations or shorthand defaults.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
