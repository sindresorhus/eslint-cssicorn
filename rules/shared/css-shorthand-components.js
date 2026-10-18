// @ts-check

import {generate} from '@eslint/css-tree';
import {
	decodeCssIdentifier,
	getCanonicalLexerNode,
	getCommaSeparatedGroups,
	getCssWideKeyword,
	hasSubstitutionOrRandomFunction,
	normalizeCssIdentifier,
} from '../utils/index.js';
import {fourSideShorthands, pairShorthands, shorthandProperties} from './css-shorthand-properties.js';

/**
@import {CssNodePlain, DeclarationPlain, Lexer, LexerMatchResult, SyntaxDescriptor} from '@eslint/css-tree';
*/

/**
@typedef {{nodes: CssNodePlain[], keys: string[], text?: string}} ShorthandSlot
@typedef {Map<string, (ShorthandSlot | undefined)[]>} ShorthandComponents
@typedef {(nodes: CssNodePlain[]) => ShorthandSlot} GetSlot
@typedef {{getSlot: GetSlot, match: PlainLexerMatchResult, canonicalNodes: CssNodePlain[]}} ComponentOptions
*/

/**
The lexer accepts plain nodes, but its trace methods are currently typed for linked-list nodes only.

@typedef {LexerMatchResult & {getTrace: (node: CssNodePlain) => SyntaxDescriptor[] | null, isKeyword: (node: CssNodePlain) => boolean, isType: (node: CssNodePlain, type: string) => boolean}} PlainLexerMatchResult
*/

/**
Additional components used only for comparison, without extending the shared shorthand serializers.

@type {Map<string, string[]>}
*/
const additionalShorthandComponents = new Map([
	['caret', ['caret-color', 'caret-animation', 'caret-shape']],
	['contain-intrinsic-size', ['contain-intrinsic-width', 'contain-intrinsic-height']],
	['container', ['container-name', 'container-type']],
	['corner-block-end-shape', ['corner-end-start-shape', 'corner-end-end-shape']],
	['corner-block-start-shape', ['corner-start-start-shape', 'corner-start-end-shape']],
	['corner-bottom-shape', ['corner-bottom-left-shape', 'corner-bottom-right-shape']],
	['corner-inline-end-shape', ['corner-start-end-shape', 'corner-end-end-shape']],
	['corner-inline-start-shape', ['corner-start-start-shape', 'corner-end-start-shape']],
	['corner-left-shape', ['corner-top-left-shape', 'corner-bottom-left-shape']],
	['corner-right-shape', ['corner-top-right-shape', 'corner-bottom-right-shape']],
	['corner-shape', ['corner-top-left-shape', 'corner-top-right-shape', 'corner-bottom-right-shape', 'corner-bottom-left-shape']],
	['corner-top-shape', ['corner-top-left-shape', 'corner-top-right-shape']],
	['cue', ['cue-before', 'cue-after']],
	['interest-delay', ['interest-delay-start', 'interest-delay-end']],
	['offset', ['offset-position', 'offset-path', 'offset-distance', 'offset-rotate', 'offset-anchor']],
	['pause', ['pause-before', 'pause-after']],
	['position-try', ['position-try-order', 'position-try-fallbacks']],
	['rest', ['rest-before', 'rest-after']],
	['scroll-timeline', ['scroll-timeline-name', 'scroll-timeline-axis']],
	['text-box', ['text-box-trim', 'text-box-edge']],
	['text-wrap', ['text-wrap-mode', 'text-wrap-style']],
	['view-timeline', ['view-timeline-name', 'view-timeline-axis', 'view-timeline-inset']],
	['white-space', ['white-space-collapse', 'text-wrap-mode', 'white-space-trim']],
]);

/**
Shorthands whose components can be compared without computing styles.
*/
export const supportedShorthands = new Set([
	'animation',
	'animation-range',
	'background',
	'border',
	'border-block',
	'border-block-color',
	'border-block-end',
	'border-block-start',
	'border-block-style',
	'border-block-width',
	'border-bottom',
	'border-color',
	'border-image',
	'border-inline',
	'border-inline-color',
	'border-inline-end',
	'border-inline-start',
	'border-inline-style',
	'border-inline-width',
	'border-left',
	'border-radius',
	'border-right',
	'border-style',
	'border-top',
	'border-width',
	'column-rule',
	'columns',
	'flex',
	'flex-flow',
	'font',
	'font-synthesis',
	'gap',
	'grid',
	'grid-area',
	'grid-column',
	'grid-row',
	'grid-template',
	'inset',
	'inset-block',
	'inset-inline',
	'list-style',
	'margin',
	'margin-block',
	'margin-inline',
	'mask-border',
	'outline',
	'overflow',
	'overscroll-behavior',
	'padding',
	'padding-block',
	'padding-inline',
	'place-content',
	'place-items',
	'place-self',
	'scroll-margin',
	'scroll-margin-block',
	'scroll-margin-inline',
	'scroll-padding',
	'scroll-padding-block',
	'scroll-padding-inline',
	'text-decoration',
	'text-emphasis',
	'transition',
	...additionalShorthandComponents.keys(),
]);

/**
@param {string} property
@returns {string[]}
*/
const getComponentNames = property => additionalShorthandComponents.get(property) ?? /** @type {{components: string[]}} */ (shorthandProperties.get(property)).components;

const layeredShorthands = new Set(['background', 'animation', 'animation-range', 'transition', 'scroll-timeline', 'view-timeline']);
const copyingPairShorthands = new Set(['place-content', 'place-items', 'place-self', 'cue', 'pause', 'rest']);
const gridPlacementShorthands = new Set(['grid-row', 'grid-column', 'grid-area']);
const fontComponents = ['font-style', 'font-variant-caps', 'font-weight', 'font-width', 'font-size', 'line-height', 'font-family'];
const componentTypes = new Map([
	['bg-image', 'background-image'],
	['bg-position', 'background-position'],
	['bg-size', 'background-size'],
	['repeat-style', 'background-repeat'],
	['attachment', 'background-attachment'],
	['font-variant-css2', 'font-variant-caps'],
	['font-width-css3', 'font-width'],
	['easing-function', 'timing-function'],
	['single-animation-iteration-count', 'animation-iteration-count'],
	['single-animation-direction', 'animation-direction'],
	['single-animation-fill-mode', 'animation-fill-mode'],
	['single-animation-play-state', 'animation-play-state'],
	['keyframes-name', 'animation-name'],
	['single-transition-property', 'transition-property'],
	['transition-behavior-value', 'transition-behavior'],
]);

/**
@param {CssNodePlain} node
@param {CssNodePlain} canonicalNode
@param {PlainLexerMatchResult} match
*/
const getNodeKey = (node, canonicalNode, match) => {
	if (node.type === 'Identifier') {
		return `Identifier:${match.isKeyword(canonicalNode) ? normalizeCssIdentifier(node.name) : decodeCssIdentifier(node.name)}`;
	}

	if (node.type === 'Dimension') {
		return `Dimension:${node.value}${normalizeCssIdentifier(node.unit)}`;
	}

	if (node.type === 'Hash') {
		return `Hash:${node.value.toLowerCase()}`;
	}

	return `${node.type}:${generate(canonicalNode)}`;
};

/**
@param {string} name
@returns {ShorthandSlot}
*/
const getSyntheticKeyword = name => ({nodes: [], keys: [`Identifier:${name}`], text: name});

/**
@param {ShorthandSlot[]} values
*/
const expandFourSides = values => {
	const [first, second = first, third = first, fourth = second] = values;
	return [first, second, third, fourth];
};

/**
@param {string} property
@param {CssNodePlain[]} nodes
@param {GetSlot} getSlot
*/
const getPositionalComponents = (property, nodes, getSlot) => {
	if (nodes.some(node => node.type === 'Operator')) {
		return;
	}

	const names = getComponentNames(property);
	const values = nodes.map(node => getSlot([node]));
	const expanded = fourSideShorthands.has(property) || property === 'corner-shape' ? expandFourSides(values) : [values[0], values[1] ?? values[0]];
	return new Map(names.map((name, index) => [name, expanded[index]]));
};

/**
@param {CssNodePlain[]} nodes
@param {GetSlot} getSlot
*/
const getIntrinsicSizeComponents = (nodes, getSlot) => {
	const firstEnd = nodes[0].type === 'Identifier' && normalizeCssIdentifier(nodes[0].name) === 'auto' ? 2 : 1;
	const width = getSlot(nodes.slice(0, firstEnd));
	const height = nodes.length > firstEnd ? getSlot(nodes.slice(firstEnd)) : width;
	return new Map([['contain-intrinsic-width', width], ['contain-intrinsic-height', height]]);
};

/**
@param {CssNodePlain[]} nodes
@param {GetSlot} getSlot
*/
const getRadiusComponents = (nodes, getSlot) => {
	const slashIndex = nodes.findIndex(node => node.type === 'Operator' && node.value === '/');
	const horizontal = expandFourSides((slashIndex === -1 ? nodes : nodes.slice(0, slashIndex)).map(node => getSlot([node])));
	const vertical = slashIndex === -1 ? horizontal : expandFourSides(nodes.slice(slashIndex + 1).map(node => getSlot([node])));
	return new Map(getComponentNames('border-radius').map((name, index) => [name, {
		nodes: horizontal[index].keys[0] === vertical[index].keys[0] ? horizontal[index].nodes : [...horizontal[index].nodes, ...vertical[index].nodes],
		keys: [...horizontal[index].keys, ...vertical[index].keys],
	}]));
};

/**
@param {string} property
@param {CssNodePlain[]} nodes
@param {ComponentOptions} options
*/
const getGridComponents = (property, nodes, {getSlot, match, canonicalNodes}) => {
	/**
	@type {CssNodePlain[][]}
	*/
	const groups = [[]];
	for (const node of nodes) {
		if (node.type === 'Operator' && node.value === '/') {
			groups.push([]);
		} else {
			/** @type {CssNodePlain[]} */ (groups.at(-1)).push(node);
		}
	}

	const values = groups.map(nodes => getSlot(nodes));
	/**
	@param {number} index
	*/
	const getFallback = index => {
		const group = groups[index];
		const node = group?.[0];
		return group?.length === 1 && node.type === 'Identifier' && match.isType(canonicalNodes[nodes.indexOf(node)], 'custom-ident') ? values[index] : getSyntheticKeyword('auto');
	};

	if (property === 'grid-area') {
		values[1] ??= getFallback(0);
		values[2] ??= getFallback(0);
		values[3] ??= groups.length > 1 ? getFallback(1) : values[1];
	} else {
		values[1] ??= getFallback(0);
	}

	return new Map(getComponentNames(property).map((name, index) => [name, values[index]]));
};

/**
@param {string} property
@param {CssNodePlain} canonicalNode
@param {PlainLexerMatchResult} match
@param {string[]} names
*/
const getNamedComponentName = (property, canonicalNode, match, names) => {
	const trace = match.getTrace(canonicalNode) ?? [];
	const directComponent = trace.find(part => part.type === 'Property' && names.includes(part.name))?.name;
	if (directComponent) {
		return directComponent;
	}

	if (property.startsWith('border')) {
		const type = trace.find(part => part.type === 'Type' && ['line-width', 'line-style', 'color'].includes(part.name))?.name;
		if (type) {
			return `${property}-${type === 'color' ? type : type.slice(5)}`;
		}
	}

	// A transition's root `none` is not traced as a single-transition-property.
	if (property === 'transition' && canonicalNode.type === 'Identifier' && normalizeCssIdentifier(canonicalNode.name) === 'none') {
		return 'transition-property';
	}

	const type = trace.find(part => part.type === 'Type' && componentTypes.has(part.name))?.name;
	const component = type === undefined ? undefined : componentTypes.get(type);
	return component === 'timing-function' ? `${property}-timing-function` : component;
};

/**
@param {string} property
@param {Map<string, CssNodePlain[]>} components
@param {{visualBoxes: CssNodePlain[], noneNodes: CssNodePlain[], getSlot: GetSlot}} options
*/
const getNamedComponentSlots = (property, components, {visualBoxes, noneNodes, getSlot}) => {
	if (property === 'background' && visualBoxes.length > 0) {
		components.set('background-origin', [visualBoxes[0]]);
		components.set('background-clip', [visualBoxes[1] ?? visualBoxes[0]]);
	}

	if (noneNodes.length > 0) {
		for (const name of ['list-style-type', 'list-style-image']) {
			if (components.get(name)?.length === 0) {
				components.set(name, [noneNodes[0]]);
			}
		}
	}

	if (property === 'animation' && components.get('animation-name')?.length === 0) {
		return;
	}

	if (property === 'font' && (components.get('font-size')?.length === 0 || components.get('font-family')?.length === 0)) {
		return;
	}

	const result = new Map([...components].map(([name, nodes]) => [name, nodes.length > 0 ? getSlot(nodes) : undefined]));
	if (copyingPairShorthands.has(property)) {
		const [first, second] = components.keys();
		if (!result.get(second)) {
			const firstSlot = /** @type {ShorthandSlot} */ (result.get(first));
			const isBaselineContent = property === 'place-content' && firstSlot.nodes.some(node => node.type === 'Identifier' && normalizeCssIdentifier(node.name) === 'baseline');
			result.set(second, isBaselineContent ? getSyntheticKeyword('start') : firstSlot);
		}
	}

	return result;
};

/**
@param {string} property
@param {CssNodePlain[]} nodes
@param {ComponentOptions} options
*/
const getNamedComponents = (property, nodes, {canonicalNodes, match, getSlot}) => {
	const names = property === 'font' ? fontComponents : getComponentNames(property);
	/**
	@type {Map<string, CssNodePlain[]>}
	*/
	const components = new Map(names.map(name => [name, []]));
	const visualBoxes = [];
	const noneNodes = [];
	let transitionTimeCount = 0;

	for (const [index, node] of nodes.entries()) {
		if (node.type === 'Operator') {
			if (node.value === '/') {
				continue;
			}

			if (node.value !== ',') {
				return;
			}

			if (property === 'font') {
				/** @type {CssNodePlain[]} */ (components.get('font-family')).push(node);
				continue;
			}
		}

		const keyword = node.type === 'Identifier' ? normalizeCssIdentifier(node.name) : undefined;
		if (property === 'list-style' && keyword === 'none') {
			noneNodes.push(node);
			continue;
		}

		if (property === 'outline' && keyword === 'auto') {
			return;
		}

		const canonicalNode = canonicalNodes[index];
		if (property === 'background' && match.isType(canonicalNode, 'visual-box')) {
			visualBoxes.push(node);
			continue;
		}

		let component = getNamedComponentName(property, canonicalNode, match, names);
		if (!component && property === 'transition' && match.isType(canonicalNode, 'time')) {
			component = transitionTimeCount++ === 0 ? 'transition-duration' : 'transition-delay';
		}

		if (!component || !components.has(component)) {
			return;
		}

		/** @type {CssNodePlain[]} */ (components.get(component)).push(node);
	}

	return getNamedComponentSlots(property, components, {visualBoxes, noneNodes, getSlot});
};

/**
@param {string} property
@param {CssNodePlain[]} nodes
@param {ComponentOptions} options
*/
const getGroupComponents = (property, nodes, options) => {
	if (fourSideShorthands.has(property) || pairShorthands.has(property) || property === 'interest-delay' || property.startsWith('corner-')) {
		return getPositionalComponents(property, nodes, options.getSlot);
	}

	if (property === 'contain-intrinsic-size') {
		return getIntrinsicSizeComponents(nodes, options.getSlot);
	}

	if (property === 'border-radius') {
		return getRadiusComponents(nodes, options.getSlot);
	}

	if (property === 'font-synthesis') {
		const names = getComponentNames(property);
		const enabled = new Set();
		for (const node of nodes) {
			if (node.type !== 'Identifier') {
				return;
			}

			const keyword = normalizeCssIdentifier(node.name);
			if (keyword !== 'none' && !names.includes(`font-synthesis-${keyword}`)) {
				return;
			}

			enabled.add(keyword);
		}

		return new Map(names.map(name => [name, getSyntheticKeyword(enabled.has(name.slice('font-synthesis-'.length)) ? 'auto' : 'none')]));
	}

	if (gridPlacementShorthands.has(property)) {
		return getGridComponents(property, nodes, options);
	}

	// The lexer can split `entry 10%` between endpoints, although its end is implicitly `entry 100%`.
	if (property === 'animation-range' && (nodes.length < 2 || (nodes.length === 2 && nodes[1].type !== 'Identifier' && options.match.isType(options.canonicalNodes[0], 'timeline-range-name')))) {
		return;
	}

	return getNamedComponents(property, nodes, options);
};

/**
Decompose a supported shorthand into component slots, preserving original nodes for suggestions. Omitted independent components remain undefined rather than requiring an initial-value catalog.

@param {DeclarationPlain} declaration
@param {{sourceCode: {lexer: Lexer}}} context
@returns {ShorthandComponents | undefined}
*/
export const getShorthandComponents = (declaration, {sourceCode}) => {
	const property = normalizeCssIdentifier(declaration.property);
	const {value} = declaration;
	if (!supportedShorthands.has(property) || value.type !== 'Value' || !value.children?.length || getCssWideKeyword(declaration) || hasSubstitutionOrRandomFunction(value)) {
		return;
	}

	const canonicalValue = getCanonicalLexerNode(value);
	const wholeMatch = /** @type {PlainLexerMatchResult} */ (sourceCode.lexer.matchProperty(property, canonicalValue));
	if (!wholeMatch.matched) {
		return;
	}

	const canonicalByNode = new Map(value.children.map((node, index) => [node, canonicalValue.children[index]]));
	/**
	@type {GetSlot}
	*/
	const getSlot = slotNodes => ({
		nodes: slotNodes,
		keys: slotNodes.map(node => getNodeKey(node, /** @type {CssNodePlain} */ (canonicalByNode.get(node)), wholeMatch)),
	});
	const groups = layeredShorthands.has(property) ? getCommaSeparatedGroups(value) : [{nodes: value.children}];
	/**
	@type {ShorthandComponents}
	*/
	const result = new Map();
	for (const {nodes} of groups) {
		if (property === 'animation' && nodes.some(node => node.type === 'Identifier' && normalizeCssIdentifier(node.name) === 'auto')) {
			return;
		}

		if (property === 'transition' && groups.length > 1 && nodes.some(node => node.type === 'Identifier' && normalizeCssIdentifier(node.name) === 'none')) {
			return;
		}

		const components = getGroupComponents(property, nodes, {
			getSlot,
			match: wholeMatch,
			canonicalNodes: nodes.map(node => /** @type {CssNodePlain} */ (canonicalByNode.get(node))),
		});
		if (!components) {
			return;
		}

		for (const [name, slot] of components) {
			if (!result.has(name)) {
				result.set(name, []);
			}

			if (name === 'background-color') {
				result.set(name, [slot]);
			} else {
				/** @type {(ShorthandSlot | undefined)[]} */ (result.get(name)).push(slot);
			}
		}
	}

	return result;
};

/**
@param {ShorthandSlot | undefined} first
@param {ShorthandSlot | undefined} second
*/
const areEqualSlots = (first, second) => {
	if (first === second) {
		return true;
	}

	return first !== undefined && second !== undefined && first.keys.length === second.keys.length && first.keys.every((key, index) => key === second.keys[index]);
};

/**
Get the sole differing component when every target slot has a concrete replacement, including copied values and dependent defaults.

@param {ShorthandComponents | undefined} baseComponents
@param {ShorthandComponents | undefined} targetComponents
@returns {{property: string, slots: ShorthandSlot[]} | undefined}
*/
export const getChangedShorthandComponent = (baseComponents, targetComponents) => {
	if (!baseComponents || !targetComponents || baseComponents.size !== targetComponents.size) {
		return;
	}

	let changed;
	for (const [property, slots] of targetComponents) {
		const baseSlots = baseComponents.get(property);
		if (!baseSlots || baseSlots.length !== slots.length) {
			return;
		}

		if (slots.every((slot, index) => areEqualSlots(slot, baseSlots[index]))) {
			continue;
		}

		if (changed || slots.includes(undefined)) {
			return;
		}

		changed = {property, slots: /** @type {ShorthandSlot[]} */ (slots)};
	}

	return changed;
};
