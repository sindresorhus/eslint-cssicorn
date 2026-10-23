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
@import {BlockPlain, DeclarationPlain} from '@eslint/css-tree';
@import {CSSSourceCode} from '@eslint/css';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID_DISPLAY = 'no-ineffective-properties/display';
const MESSAGE_ID_VERTICAL_ALIGN = 'no-ineffective-properties/vertical-align';
const MESSAGE_ID_FLEX_ITEM = 'no-ineffective-properties/flex-item';
const MESSAGE_ID_GRID_ITEM = 'no-ineffective-properties/grid-item';
const MESSAGE_ID_FLOW_ITEM = 'no-ineffective-properties/flow-item';
const MESSAGE_ID_INLINE_FLOW_ITEM = 'no-ineffective-properties/inline-flow-item';
const MESSAGE_ID_FLOATED_ITEM = 'no-ineffective-properties/floated-item';
const MESSAGE_ID_NOWRAP = 'no-ineffective-properties/nowrap';
const MESSAGE_ID_FLEX_LINE_COUNT = 'no-ineffective-properties/flex-line-count';
const MESSAGE_ID_STATIC = 'no-ineffective-properties/static';
const MESSAGE_ID_Z_INDEX = 'no-ineffective-properties/z-index';
const MESSAGE_ID_POSITION = 'no-ineffective-properties/position';
const MESSAGE_ID_ABSOLUTE_POSITION = 'no-ineffective-properties/absolute-position';
const MESSAGE_ID_POSITION_TRY_ORDER = 'no-ineffective-properties/position-try-order';
const MESSAGE_ID_MULTICOL = 'no-ineffective-properties/multicol';
const MESSAGE_ID_MULTICOL_GAP = 'no-ineffective-properties/multicol-gap';
const MESSAGE_ID_FLOAT = 'no-ineffective-properties/float';
const MESSAGE_ID_TABLE_SPACING = 'no-ineffective-properties/table-spacing';
const MESSAGE_ID_TABLE_PADDING = 'no-ineffective-properties/table-padding';
const MESSAGE_ID_TABLE_GAP = 'no-ineffective-properties/table-gap';
const MESSAGE_ID_TABLE_JUSTIFY_CONTENT = 'no-ineffective-properties/table-justify-content';
const MESSAGE_ID_FLEX_GAP = 'no-ineffective-properties/flex-gap';
const MESSAGE_ID_CLEAR = 'no-ineffective-properties/clear';
const MESSAGE_ID_PERSPECTIVE = 'no-ineffective-properties/perspective';
const MESSAGE_ID_COLUMN_SPAN = 'no-ineffective-properties/column-span';
const MESSAGE_ID_MOTION = 'no-ineffective-properties/motion';
const MESSAGE_ID_OFFSET_POSITION = 'no-ineffective-properties/offset-position';
const MESSAGE_ID_SHAPE_IMAGE_THRESHOLD = 'no-ineffective-properties/shape-image-threshold';
const MESSAGE_ID_NON_IMAGE_SHAPE = 'no-ineffective-properties/non-image-shape';
const MESSAGE_ID_DECORATION = 'no-ineffective-properties/decoration';
const MESSAGE_ID_ERROR_DECORATION = 'no-ineffective-properties/error-decoration';
const MESSAGE_ID_OUTLINE = 'no-ineffective-properties/outline';
const MESSAGE_ID_COLUMN_RULE_COLOR = 'no-ineffective-properties/column-rule-color';
const MESSAGE_ID_SCROLL_SNAP_STOP = 'no-ineffective-properties/scroll-snap-stop';
const MESSAGE_ID_BACKGROUND_IMAGE = 'no-ineffective-properties/background-image';
const MESSAGE_ID_BORDER_IMAGE = 'no-ineffective-properties/border-image';
const MESSAGE_ID_MASK_IMAGE = 'no-ineffective-properties/mask-image';
const MESSAGE_ID_MASK_BORDER = 'no-ineffective-properties/mask-border';
const MESSAGE_ID_ANIMATION = 'no-ineffective-properties/animation';
const MESSAGE_ID_TRANSITION = 'no-ineffective-properties/transition';
const MESSAGE_ID_SCROLL_TIMELINE = 'no-ineffective-properties/scroll-timeline';
const MESSAGE_ID_VIEW_TIMELINE = 'no-ineffective-properties/view-timeline';
const MESSAGE_ID_TIMELINE_TRIGGER = 'no-ineffective-properties/timeline-trigger';
const MESSAGE_ID_TIMELINE_TRIGGER_SOURCE = 'no-ineffective-properties/timeline-trigger-source';
const MESSAGE_ID_VIEW_TRANSITION = 'no-ineffective-properties/view-transition';
const MESSAGE_ID_OMITTED_SHORTHAND_COMPONENT = 'no-ineffective-properties/omitted-shorthand-component';
const messages = {
	[MESSAGE_ID_DISPLAY]: '`{{property}}` has no effect with `display: {{display}}`. It requires a {{layout}} container.',
	[MESSAGE_ID_VERTICAL_ALIGN]: '`vertical-align` has no effect with `display: {{display}}`. Use an inline-level box, table cell, or flex or grid item.',
	[MESSAGE_ID_FLEX_ITEM]: '`{{property}}` has no effect on a flex item.',
	[MESSAGE_ID_GRID_ITEM]: '`{{property}}` has no effect on a grid item.',
	[MESSAGE_ID_FLOW_ITEM]: '`{{property}}` has no effect on an ordinary flow item.',
	[MESSAGE_ID_INLINE_FLOW_ITEM]: '`{{property}}` has no effect on an inline-level box in ordinary flow.',
	[MESSAGE_ID_FLOATED_ITEM]: '`{{property}}` has no effect on a floated item.',
	[MESSAGE_ID_NOWRAP]: '`align-content` has no effect on a flex container with `nowrap`. Consider `align-items` or enabling wrapping.',
	[MESSAGE_ID_FLEX_LINE_COUNT]: '`flex-line-count` has no effect on a flex container with `nowrap`. Enable wrapping to control the line count.',
	[MESSAGE_ID_STATIC]: '`{{property}}` has no effect with `position: static`. Insets require a positioned element.',
	[MESSAGE_ID_Z_INDEX]: '`z-index` has no effect on an ordinary flow item with `position: static`. It requires a positioned element or a flex or grid item.',
	[MESSAGE_ID_POSITION]: '`{{property}}` has no effect with `position: {{position}}`. It requires an in-flow box.',
	[MESSAGE_ID_ABSOLUTE_POSITION]: '`{{property}}` has no effect with `position: {{position}}`. It requires absolute or fixed positioning.',
	[MESSAGE_ID_POSITION_TRY_ORDER]: '`position-try-order` has no effect with `position-try-fallbacks: none`. Add fallback positions to order them.',
	[MESSAGE_ID_MULTICOL]: '`{{property}}` has no effect with `display: {{display}}`. Multicol properties require a block container.',
	[MESSAGE_ID_MULTICOL_GAP]: '`{{property}}` has no effect between column rows with `column-wrap: nowrap`. Enable column wrapping to use this gap.',
	[MESSAGE_ID_FLOAT]: '`float: {{value}}` has no effect with `position: {{position}}`. Absolutely positioned elements cannot float.',
	[MESSAGE_ID_TABLE_SPACING]: '`border-spacing` has no effect on this table with `border-collapse: collapse`. Use `border-collapse: separate` for spacing between cells.',
	[MESSAGE_ID_TABLE_GAP]: '`{{property}}` has no effect on a table box. Use `border-spacing` for spacing between cells.',
	[MESSAGE_ID_TABLE_JUSTIFY_CONTENT]: '`justify-content` has no effect on a table box. It requires a flex, grid, or multicol container.',
	[MESSAGE_ID_FLEX_GAP]: '`{{property}}` has no effect between flex lines with `nowrap`. Enable wrapping to use this gap.',
	[MESSAGE_ID_TABLE_PADDING]: '`{{property}}` has no effect on this table with `border-collapse: collapse`. Apply padding to table cells or use separate borders.',
	[MESSAGE_ID_CLEAR]: '`clear: {{value}}` has no effect with `position: {{position}}`. Absolutely positioned elements do not participate in normal flow.',
	[MESSAGE_ID_PERSPECTIVE]: '`perspective-origin` has no effect with `perspective: none`. Set a perspective distance to use this origin.',
	[MESSAGE_ID_COLUMN_SPAN]: '`column-span: all` has no effect with `position: {{position}}`. Only in-flow elements can span columns.',
	[MESSAGE_ID_MOTION]: '`{{property}}` has no effect with `offset-path: none`. Set an offset path to use this property.',
	[MESSAGE_ID_OFFSET_POSITION]: '`offset-position` has no effect when `offset-path` is a coordinate box. The box determines the path position.',
	[MESSAGE_ID_SHAPE_IMAGE_THRESHOLD]: '`shape-image-threshold` has no effect with `shape-outside: none`. It defines the alpha threshold for an image-based shape.',
	[MESSAGE_ID_NON_IMAGE_SHAPE]: '`shape-image-threshold` has no effect with a basic shape or shape box. It defines the alpha threshold for an image-based shape.',
	[MESSAGE_ID_DECORATION]: '`{{property}}` has no effect with `text-decoration-line: none`. Enable a text decoration line on this element.',
	[MESSAGE_ID_ERROR_DECORATION]: '`{{property}}` has no effect on `spelling-error` or `grammar-error` decorations. Their appearance is controlled by the browser.',
	[MESSAGE_ID_OUTLINE]: '`{{property}}` has no effect with `outline-style: none`. Enable an outline style to use it.',
	[MESSAGE_ID_COLUMN_RULE_COLOR]: '`column-rule-color` has no effect with a `none` or `hidden` column rule style. Enable a visible column rule style to use it.',
	[MESSAGE_ID_SCROLL_SNAP_STOP]: '`scroll-snap-stop: always` has no effect when `scroll-snap-align` disables snapping on both axes. Define a snap position to use it.',
	[MESSAGE_ID_BACKGROUND_IMAGE]: '`{{property}}` has no effect with `background-image: none`. Set a background image to use this property.',
	[MESSAGE_ID_BORDER_IMAGE]: '`{{property}}` has no effect with `border-image-source: none`. Set a border image to use this property.',
	[MESSAGE_ID_MASK_IMAGE]: '`{{property}}` has no effect with `mask-image: none`. Set a mask image to use this property.',
	[MESSAGE_ID_MASK_BORDER]: '`{{property}}` has no effect with `mask-border-source: none`. Set a mask border image to use this property.',
	[MESSAGE_ID_ANIMATION]: '`{{property}}` has no effect with `animation-name: none`. Set an animation name to use this property.',
	[MESSAGE_ID_TRANSITION]: '`{{property}}` has no effect with `transition-property: none`. Select at least one property to transition.',
	[MESSAGE_ID_SCROLL_TIMELINE]: '`{{property}}` has no effect with `scroll-timeline-name: none`. Name a scroll timeline to use this property.',
	[MESSAGE_ID_VIEW_TIMELINE]: '`{{property}}` has no effect with `view-timeline-name: none`. Name a view timeline to use this property.',
	[MESSAGE_ID_TIMELINE_TRIGGER]: '`{{property}}` has no effect with `timeline-trigger-name: none`. Name a timeline trigger to use this property.',
	[MESSAGE_ID_TIMELINE_TRIGGER_SOURCE]: '`{{property}}` has no effect with `timeline-trigger-source: none`. Set a timeline source to use this range.',
	[MESSAGE_ID_VIEW_TRANSITION]: '`{{property}}` has no effect with `view-transition-name: none`. Assign a transition name to use this property.',
	[MESSAGE_ID_OMITTED_SHORTHAND_COMPONENT]: '`{{property}}` omits {{component}}, which defaults to `none`.',
};

const flexProperties = new Set(['flex-direction', 'flex-wrap', 'flex-flow', 'flex-line-count']);
const gridProperties = new Set(['grid', 'grid-template', 'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-columns', 'grid-auto-rows', 'grid-auto-flow']);
const gridPlacementProperties = new Set(['grid-area', 'grid-row', 'grid-column', 'grid-row-start', 'grid-row-end', 'grid-column-start', 'grid-column-end']);
const flexItemProperties = new Set(['justify-self', ...gridPlacementProperties]);
const flexSizingProperties = new Set(['flex', 'flex-basis', 'flex-grow', 'flex-shrink']);
const breakProperties = new Set(['break-before', 'break-after', 'break-inside', 'page-break-before', 'page-break-after', 'page-break-inside']);
const flowItemProperties = new Set([...flexSizingProperties, ...gridPlacementProperties, 'order', 'align-self']);
const shapeProperties = new Set(['shape-outside', 'shape-margin', 'shape-image-threshold']);
const itemProperties = new Set([...flexItemProperties, ...flowItemProperties, ...shapeProperties, 'place-self', 'float', 'clear', 'column-span', 'z-index', 'vertical-align']);
const inlineDisplayKeywords = new Set(['inline', 'inline-block', 'inline-flex', 'inline-grid', 'inline-table']);
const flowDisplayKeywords = new Set(['block', 'inline', 'flow', 'flow-root', 'list-item']);
const blockDisplayKeywords = new Set(['block', 'flow', 'flow-root', 'flex', 'grid', 'table', 'list-item', 'table-caption']);
const insetProperties = new Set(['top', 'right', 'bottom', 'left', 'inset', 'inset-block', 'inset-inline', 'inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end']);
const anchorPlacementProperties = new Set(['position-area', 'position-try', 'position-try-fallbacks', 'position-try-order', 'position-visibility']);
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
const multicolProperties = new Set(['columns', 'column-count', 'column-width', 'column-fill', 'column-height', 'column-wrap']);
const gapProperties = new Set(['gap', 'row-gap', 'column-gap', 'grid-gap', 'grid-row-gap', 'grid-column-gap']);
const decorationProperties = ['text-decoration-color', 'text-decoration-style', 'text-decoration-thickness', 'text-decoration-inset'];
const decorationControllingProperties = ['text-decoration-line', 'text-decoration', '-webkit-text-decoration-line', '-webkit-text-decoration'];
const timelineTriggerRangeProperties = [
	'timeline-trigger-range',
	'timeline-trigger-activation-range',
	'timeline-trigger-activation-range-start',
	'timeline-trigger-activation-range-end',
	'timeline-trigger-active-range',
	'timeline-trigger-active-range-start',
	'timeline-trigger-active-range-end',
];
// The first controller must be explicit. Other controllers can override or reset it.
const inactivePropertyGroups = [
	{properties: ['position-try-order'], controllingProperties: ['position-try-fallbacks', 'position-try'], messageId: MESSAGE_ID_POSITION_TRY_ORDER},
	{properties: ['perspective-origin'], controllingProperties: ['perspective', '-webkit-perspective'], messageId: MESSAGE_ID_PERSPECTIVE},
	{properties: ['offset-distance', 'offset-rotate', 'offset-anchor'], controllingProperties: ['offset-path', 'offset'], messageId: MESSAGE_ID_MOTION},
	{
		properties: ['offset-position'],
		controllingProperties: ['offset-path', 'offset'],
		values: ['border-box', 'padding-box', 'content-box', 'fill-box', 'stroke-box', 'view-box'],
		messageId: MESSAGE_ID_OFFSET_POSITION,
	},
	{properties: ['shape-image-threshold'], controllingProperties: ['shape-outside', '-webkit-shape-outside'], messageId: MESSAGE_ID_SHAPE_IMAGE_THRESHOLD},
	{
		properties: decorationProperties,
		controllingProperties: decorationControllingProperties,
		messageId: MESSAGE_ID_DECORATION,
	},
	{
		properties: decorationProperties,
		controllingProperties: decorationControllingProperties,
		values: ['spelling-error', 'grammar-error'],
		messageId: MESSAGE_ID_ERROR_DECORATION,
	},
	{
		properties: ['outline-color', 'outline-width', 'outline-offset'],
		controllingProperties: ['outline-style', 'outline', '-webkit-outline-style', '-webkit-outline', '-moz-outline-style', '-moz-outline'],
		messageId: MESSAGE_ID_OUTLINE,
	},
	{
		properties: ['column-rule-color'],
		controllingProperties: ['column-rule-style', 'column-rule', 'rule', 'rule-style', '-webkit-column-rule-style', '-webkit-column-rule', '-moz-column-rule-style', '-moz-column-rule'],
		values: ['none', 'hidden'],
		messageId: MESSAGE_ID_COLUMN_RULE_COLOR,
	},
	{
		properties: [
			'background-position',
			'background-position-x',
			'background-position-y',
			'background-position-inline',
			'background-position-block',
			'background-size',
			'background-repeat',
			'background-repeat-x',
			'background-repeat-y',
			'background-repeat-block',
			'background-repeat-inline',
			'background-origin',
			'background-blend-mode',
		],
		controllingProperties: ['background-image', 'background', 'background-tbd'],
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
		properties: ['mask-border-mode', 'mask-border-slice', 'mask-border-width', 'mask-border-outset', 'mask-border-repeat'],
		controllingProperties: ['mask-border-source', 'mask-border', 'mask', '-webkit-mask-box-image-source', '-webkit-mask-box-image', '-webkit-mask'],
		messageId: MESSAGE_ID_MASK_BORDER,
	},
	{
		properties: [
			'animation-duration',
			'animation-delay',
			'animation-delay-start',
			'animation-delay-end',
			'animation-timing-function',
			'animation-iteration-count',
			'animation-direction',
			'animation-fill-mode',
			'animation-play-state',
			'animation-composition',
			'animation-timeline',
			'animation-trigger',
			'animation-range',
			'animation-range-start',
			'animation-range-end',
			'animation-range-center',
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
	{
		properties: timelineTriggerRangeProperties,
		controllingProperties: ['timeline-trigger-source', 'timeline-trigger'],
		messageId: MESSAGE_ID_TIMELINE_TRIGGER_SOURCE,
	},
	{
		properties: ['timeline-trigger-source', ...timelineTriggerRangeProperties],
		controllingProperties: ['timeline-trigger-name', 'timeline-trigger'],
		messageId: MESSAGE_ID_TIMELINE_TRIGGER,
	},
	{properties: ['view-transition-class', 'view-transition-group'], controllingProperties: ['view-transition-name'], messageId: MESSAGE_ID_VIEW_TRANSITION},
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
/**
Text overflow is intentionally not checked because native form controls can still show ellipsis regardless of the element's display and overflow.
*/
const targetProperties = new Set([
	...flexProperties,
	...gridProperties,
	...itemProperties,
	...insetProperties,
	...anchorPlacementProperties,
	...breakProperties,
	...paddingProperties,
	...multicolProperties,
	...gapProperties,
	...shorthandProperties,
	...inactivePropertyGroups.flatMap(({properties}) => properties),
	'align-content',
	'justify-content',
	'scroll-snap-stop',
	'border-spacing',
	'table-layout',
]);

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
Check whether a single unprefixed shape-outside declaration defines a basic shape or shape box instead of an image.

@param {Map<string, {node: DeclarationPlain, property: string}[]>} declarationsByProperty
@param {CSSSourceCode} sourceCode
@returns {boolean}
*/
const hasNonImageShape = (declarationsByProperty, sourceCode) => {
	const declarations = ['shape-outside', '-webkit-shape-outside'].flatMap(property => declarationsByProperty.get(property) ?? []);
	if (declarations.length !== 1) {
		return false;
	}

	const [{node, property}] = declarations;
	if (property !== 'shape-outside' || node.value.type !== 'Value' || getCssWideKeyword(node) !== undefined || hasSubstitutionOrRandomFunction(node.value)) {
		return false;
	}

	const value = getCanonicalLexerNode(node.value);
	const match = sourceCode.lexer.matchProperty(property, value);
	if (!match.matched) {
		return false;
	}

	return value.children.some(child => match.isType(child, 'basic-shape') || match.isType(child, 'shape-box'));
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
Get the problem for a property that cannot affect an ordinary flow item.

@param {DeclarationPlain} node
@param {string} property
@param {string | undefined} keyword
@param {{float: string | undefined, display: string | undefined}} item
*/
const getFlowItemProblem = (node, property, keyword, {float, display}) => {
	if (floatValues.has(float) && (['justify-self', 'place-self', 'vertical-align'].includes(property) || (property === 'column-span' && keyword === 'all'))) {
		return {node, messageId: MESSAGE_ID_FLOATED_ITEM, data: {property}};
	}

	if ((['justify-self', 'place-self'].includes(property) || (property === 'column-span' && keyword === 'all')) && display?.split(' ').some(keyword => inlineDisplayKeywords.has(keyword))) {
		return {node, messageId: MESSAGE_ID_INLINE_FLOW_ITEM, data: {property}};
	}

	return flowItemProperties.has(property) ? {node, messageId: MESSAGE_ID_FLOW_ITEM, data: {property}} : undefined;
};

/**
Get the problem for a property that cannot affect an ordinary item in its known parent layout.

@param {DeclarationPlain} node
@param {string} property
@param {string | undefined} keyword
@param {{layout: 'flex' | 'grid' | 'flow' | undefined, float: string | undefined, display: string | undefined}} item
*/
const getItemProblem = (node, property, keyword, {layout, float, display}) => {
	if (layout === undefined) {
		return;
	}

	if (layout === 'flow') {
		return getFlowItemProblem(node, property, keyword, {float, display});
	}

	const ineffectiveProperties = layout === 'flex' ? flexItemProperties : flexSizingProperties;
	if (
		ineffectiveProperties.has(property)
		|| shapeProperties.has(property)
		|| (property === 'float' && floatValues.has(keyword))
		|| (property === 'clear' && clearValues.has(keyword))
		|| (property === 'column-span' && keyword === 'all')
	) {
		return {node, messageId: layout === 'flex' ? MESSAGE_ID_FLEX_ITEM : MESSAGE_ID_GRID_ITEM, data: {property}};
	}
};

/**
Get the problem for a container property given the explicit layout controls in its block.

@param {DeclarationPlain} node
@param {string} property
@param {ReturnType<typeof getBlockControls>} controls
@param {'flex' | 'grid' | 'flow' | undefined} itemLayout
*/
const getContainerProblem = (node, property, {display, hasVisibleDisplay, isFlex, isGrid, isTable, hasCollapsedTable}, itemLayout) => {
	if (property === 'vertical-align' && hasVisibleDisplay && !['flex', 'grid'].includes(itemLayout) && display.split(' ').every(keyword => blockDisplayKeywords.has(keyword))) {
		return {node, messageId: MESSAGE_ID_VERTICAL_ALIGN, data: {display}};
	}

	const isFlexProperty = flexProperties.has(property);
	const isGridProperty = gridProperties.has(property);
	if (hasVisibleDisplay && ((isFlexProperty && !isFlex) || (isGridProperty && !isGrid) || (property === 'table-layout' && !isTable))) {
		const layout = isFlexProperty ? 'flex' : (isGridProperty ? 'grid' : 'table');
		return {node, messageId: MESSAGE_ID_DISPLAY, data: {property, display, layout}};
	}

	if (multicolProperties.has(property) && [isFlex, isGrid, isTable].includes(true)) {
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

	if (anchorPlacementProperties.has(property) && ['static', 'relative', 'sticky'].includes(position)) {
		return {node, messageId: MESSAGE_ID_ABSOLUTE_POSITION, data: {property, position}};
	}

	if (position !== 'absolute' && position !== 'fixed') {
		return;
	}

	if (flexSizingProperties.has(property) || breakProperties.has(property) || property === 'order' || property === 'vertical-align') {
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
@param {string | undefined} keyword
@param {ReturnType<typeof getBlockControls>} controls
*/
const getInactiveEffectProblem = (node, property, keyword, {inactiveProperties}) => {
	const messageId = inactiveProperties.get(property);
	if (!messageId || (property === 'scroll-snap-stop' && keyword !== 'always')) {
		return;
	}

	if (
		property === 'background-blend-mode'
		&& node.value.children.every(child => (child.type === 'Operator' && child.value === ',')
			|| (child.type === 'Identifier' && normalizeCssIdentifier(child.name) === 'normal'))
	) {
		return;
	}

	return {node, messageId, data: {property}};
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

	if (property === 'z-index' && keyword !== 'auto' && controls.position === 'static' && itemLayout === 'flow') {
		return {node, messageId: MESSAGE_ID_Z_INDEX};
	}

	const itemProblem = getItemProblem(node, property, keyword, {layout: itemLayout, float: controls.float, display: controls.display});
	if (itemProblem) {
		return itemProblem;
	}

	const containerProblem = getContainerProblem(node, property, controls, itemLayout);
	if (containerProblem) {
		return containerProblem;
	}

	if (property === 'align-content' && controls.hasNowrap) {
		return {node, messageId: MESSAGE_ID_NOWRAP};
	}

	const positionProblem = getPositionProblem(node, property, keyword, controls);
	if (positionProblem) {
		return positionProblem;
	}

	return getInactiveEffectProblem(node, property, keyword, controls);
};

/**
Get the properties disabled by explicit layout and wrapping controls.

@param {Map<string, {node: DeclarationPlain, property: string}[]>} declarationsByProperty
@param {CSSSourceCode} sourceCode
@param {{isTable: boolean, hasNowrap: boolean, layout: 'flex' | 'grid' | 'flow' | undefined}} controls
@returns {Map<string, string>}
*/
const getInactiveLayoutProperties = (declarationsByProperty, sourceCode, {isTable, hasNowrap, layout}) => {
	const inactiveProperties = new Map();

	if (isTable) {
		for (const property of gapProperties) {
			inactiveProperties.set(property, MESSAGE_ID_TABLE_GAP);
		}

		inactiveProperties.set('justify-content', MESSAGE_ID_TABLE_JUSTIFY_CONTENT);
	}

	if (hasNowrap) {
		inactiveProperties.set('flex-line-count', MESSAGE_ID_FLEX_LINE_COUNT);
		const direction = getControllingValue(declarationsByProperty, ['flex-direction', 'flex-flow', '-webkit-flex-direction', '-webkit-flex-flow'], sourceCode);
		if (direction !== undefined) {
			const property = direction.split(' ').some(keyword => keyword === 'column' || keyword === 'column-reverse') ? 'column-gap' : 'row-gap';
			inactiveProperties.set(property, MESSAGE_ID_FLEX_GAP);
			inactiveProperties.set(`grid-${property}`, MESSAGE_ID_FLEX_GAP);
		}
	}

	if (
		layout === 'flow'
		&& declarationsByProperty.has('column-wrap')
		&& getControllingValue(declarationsByProperty, ['column-wrap', 'columns', '-webkit-columns', '-moz-columns'], sourceCode) === 'nowrap'
	) {
		inactiveProperties.set('row-gap', MESSAGE_ID_MULTICOL_GAP);
		inactiveProperties.set('grid-row-gap', MESSAGE_ID_MULTICOL_GAP);
	}

	return inactiveProperties;
};

/**
Get the explicit controlling values for a declaration block.

@param {Map<string, {node: DeclarationPlain, property: string}[]>} declarationsByProperty
@param {CSSSourceCode} sourceCode
*/
const getBlockControls = (declarationsByProperty, sourceCode) => {
	// Only explicit controls are used, without writing-mode or computed-value inference.
	const display = getControllingValue(declarationsByProperty, ['display'], sourceCode);
	const hasVisibleDisplay = display !== undefined && display !== 'none' && display !== 'contents';
	const layout = getDisplayLayout(display);
	const isFlex = layout === 'flex';
	const isGrid = layout === 'grid';
	const isTable = hasVisibleDisplay && (display === 'inline-table' || display.split(' ').includes('table'));
	const wrapping = isFlex ? getControllingValue(declarationsByProperty, ['flex-wrap', 'flex-flow', '-webkit-flex-wrap', '-webkit-flex-flow'], sourceCode) : undefined;
	const hasNowrap = wrapping?.split(' ').includes('nowrap') || ['row', 'row-reverse', 'column', 'column-reverse'].includes(wrapping);
	const position = getControllingValue(declarationsByProperty, ['position'], sourceCode);
	const hasCollapsedTable = isTable && getControllingValue(declarationsByProperty, ['border-collapse'], sourceCode) === 'collapse';
	/**
	@type {Map<string, string>}
	*/
	const inactiveProperties = getInactiveLayoutProperties(declarationsByProperty, sourceCode, {isTable, hasNowrap, layout});
	for (const {properties, controllingProperties, values = ['none'], messageId} of inactivePropertyGroups) {
		if (!declarationsByProperty.has(controllingProperties[0]) || !values.includes(getControllingValue(declarationsByProperty, controllingProperties, sourceCode))) {
			continue;
		}

		for (const property of properties) {
			inactiveProperties.set(property, messageId);
		}
	}

	if (declarationsByProperty.has('shape-image-threshold') && hasNonImageShape(declarationsByProperty, sourceCode)) {
		inactiveProperties.set('shape-image-threshold', MESSAGE_ID_NON_IMAGE_SHAPE);
	}

	if (declarationsByProperty.has('scroll-snap-stop') && ['none', 'none none'].includes(getControllingValue(declarationsByProperty, ['scroll-snap-align'], sourceCode))) {
		inactiveProperties.set('scroll-snap-stop', MESSAGE_ID_SCROLL_SNAP_STOP);
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
		float: getControllingValue(declarationsByProperty, ['float'], sourceCode),
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
