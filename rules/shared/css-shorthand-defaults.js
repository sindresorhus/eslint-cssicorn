// @ts-check

import {generate, toPlainObject} from '@eslint/css-tree';
import {
	evaluateCssMath,
	getCanonicalLexerNode,
	getCommaSeparatedGroups,
	normalizeCssIdentifier,
	parse,
} from '../utils/index.js';
import {areEquivalentColors} from './css-colors.js';
import {getGroupAnimationNameNodes} from './css-animations.js';

/**
@import {CssNodePlain, Lexer, LexerMatchResult, SyntaxDescriptor, ValuePlain} from '@eslint/css-tree';
@import {CssicornContext} from '../rule/cssicorn-context.js';
*/

/**
@typedef {{name: string, type?: string, default?: string, number?: number, unit?: string}} ShorthandComponent
@typedef {{key: string, removableGroups: CssNodePlain[][]}} ShorthandExpansion
*/

/**
Every profile component is initialized before nodes are assigned to its group.

@typedef {Omit<Map<string, CssNodePlain[]>, 'get'> & {get: (name: string) => CssNodePlain[]}} ComponentGroups
*/

/**
The lexer accepts plain nodes, but its trace method is currently typed for linked-list nodes only.

@typedef {LexerMatchResult & {getTrace: (node: CssNodePlain) => SyntaxDescriptor[] | null}} PlainLexerMatchResult
*/

/**
@type {ShorthandComponent[]}
*/
const borderComponents = [
	{name: 'width', type: 'line-width', default: 'medium'},
	{name: 'style', type: 'line-style', default: 'none'},
	{name: 'color', type: 'color', default: 'currentcolor'},
];

const borderProperties = [
	'border',
	'border-top',
	'border-right',
	'border-bottom',
	'border-left',
	'border-block',
	'border-block-start',
	'border-block-end',
	'border-inline',
	'border-inline-start',
	'border-inline-end',
];

/**
@type {Map<string, ShorthandComponent[]>}
*/
const profiles = new Map([
	...borderProperties.map(property => /** @type {[string, ShorthandComponent[]]} */ ([property, borderComponents])),
	['outline', [
		{name: 'outline-width', default: 'medium'},
		{name: 'outline-style', default: 'none'},
		// Explicit color `auto` is not supported consistently, so removing it can turn an ignored declaration into an applied one.
		{name: 'outline-color'},
	]],
	['column-rule', [
		{name: 'column-rule-width', default: 'medium'},
		{name: 'column-rule-style', default: 'none'},
		{name: 'column-rule-color', default: 'currentcolor'},
	]],
	['font', [
		{name: 'font-style', default: 'normal'},
		{name: 'font-variant', type: 'font-variant-css2', default: 'normal'},
		{name: 'font-weight', default: 'normal', number: 400},
		{name: 'font-width', type: 'font-width-css3', default: 'normal'},
		{name: 'font-size'},
		{name: 'line-height', default: 'normal'},
		{name: 'font-family'},
	]],
	['flex-flow', [
		{name: 'flex-direction', default: 'row'},
		{name: 'flex-wrap', default: 'nowrap'},
	]],
	['columns', [
		{name: 'column-width', default: 'auto'},
		{name: 'column-count', default: 'auto'},
		{name: 'column-height', default: 'auto'},
	]],
	['container', [
		{name: 'container-name'},
		{name: 'container-type', default: 'normal'},
	]],
	['position-try', [
		{name: 'position-try-order', default: 'normal'},
		{name: 'position-try-fallbacks'},
	]],
	['scroll-timeline', [
		{name: 'scroll-timeline-name'},
		{name: 'scroll-timeline-axis', default: 'block'},
	]],
	['view-timeline', [
		{name: 'view-timeline-name'},
		{name: 'view-timeline-axis', default: 'block'},
		{name: 'view-timeline-inset', default: 'auto'},
	]],
	['list-style', [
		{name: 'list-style-type', default: 'disc'},
		{name: 'list-style-position', default: 'outside'},
		{name: 'list-style-image', default: 'none'},
	]],
	['text-decoration', [
		{name: 'text-decoration-line', default: 'none'},
		{name: 'text-decoration-style', default: 'solid'},
		{name: 'text-decoration-color', default: 'currentcolor'},
		{name: 'text-decoration-thickness', default: 'auto'},
	]],
	['text-emphasis', [
		{name: 'text-emphasis-style', default: 'none'},
		{name: 'text-emphasis-color', default: 'currentcolor'},
	]],
	['text-box', [
		// Omitted trimming defaults to `trim-both`, while the longhand's initial value is `none`.
		{name: 'text-box-trim', default: 'trim-both'},
		{name: 'text-box-edge', default: 'auto'},
	]],
	['text-wrap', [
		{name: 'text-wrap-mode', default: 'wrap'},
		{name: 'text-wrap-style', default: 'auto'},
	]],
	['white-space', [
		{name: 'white-space-collapse', default: 'collapse'},
		{name: 'text-wrap-mode', default: 'wrap'},
	]],
	['background', [
		{name: 'background-image', type: 'bg-image', default: 'none'},
		{name: 'background-position', type: 'bg-position', default: 'position'},
		{name: 'background-size', type: 'bg-size', default: 'auto'},
		{name: 'background-repeat', type: 'repeat-style', default: 'repeat'},
		{name: 'background-attachment', type: 'attachment', default: 'scroll'},
		{name: 'background-boxes', type: 'visual-box'},
		{name: 'background-color', default: 'transparent'},
	]],
	['animation', [
		{name: 'animation-duration', default: 'auto'},
		{name: 'animation-timing-function', type: 'easing-function', default: 'ease'},
		{name: 'animation-delay', number: 0, unit: 's'},
		{name: 'animation-iteration-count', type: 'single-animation-iteration-count', number: 1},
		{name: 'animation-direction', type: 'single-animation-direction', default: 'normal'},
		{name: 'animation-fill-mode', type: 'single-animation-fill-mode', default: 'none'},
		{name: 'animation-play-state', type: 'single-animation-play-state', default: 'running'},
		{name: 'animation-name', type: 'keyframes-name', default: 'none'},
	]],
	['transition', [
		{name: 'transition-property', type: 'single-transition-property', default: 'all'},
		{name: 'transition-duration', number: 0, unit: 's'},
		{name: 'transition-timing-function', type: 'easing-function', default: 'ease'},
		{name: 'transition-delay', number: 0, unit: 's'},
		{name: 'transition-behavior', type: 'transition-behavior-value', default: 'normal'},
	]],
]);

const layeredProperties = new Set(['background', 'animation', 'transition', 'scroll-timeline', 'view-timeline']);

/**
@param {CssNodePlain} node
@param {string | undefined} keyword
*/
const isKeyword = (node, keyword) => node.type === 'Identifier' && normalizeCssIdentifier(node.name) === keyword;

/**
@param {CssNodePlain[]} nodes
*/
const getNodesKey = nodes => nodes.map(node => generate(node)).join(' ');

/**
Recognize a zero length or percentage without accepting unitless calculations or other dimension types.

@param {CssNodePlain} node
@param {Lexer} lexer
*/
const isZeroPositionValue = (node, lexer) => {
	const quantity = evaluateCssMath(node);
	if (quantity?.value !== 0) {
		return false;
	}

	if (quantity.unit === undefined) {
		return node.type === 'Number';
	}

	return quantity.unit === '%' || Boolean(lexer.matchType('length', {type: 'Dimension', value: '0', unit: quantity.unit}).matched);
};

/**
Recognize the initial two-axis position without resolving lengths against a layout.

@param {CssNodePlain[]} nodes
@param {Lexer} lexer
*/
const isInitialPosition = (nodes, lexer) => {
	if (nodes.length !== 2) {
		return false;
	}

	const [horizontal, vertical] = nodes;
	return (isKeyword(horizontal, 'top') && isKeyword(vertical, 'left'))
		|| ((isKeyword(horizontal, 'left') || isZeroPositionValue(horizontal, lexer)) && (isKeyword(vertical, 'top') || isZeroPositionValue(vertical, lexer)));
};

/**
Recognize only finite, exactly equal default values, retaining numeric units and nondefault color channels.

@param {CssNodePlain[]} nodes
@param {ShorthandComponent} component
@param {Lexer} lexer
*/
const isDefaultComponent = (nodes, component, lexer) => {
	if (nodes.length === 0) {
		return true;
	}

	if (component.default === 'position') {
		return isInitialPosition(nodes, lexer);
	}

	if (['background-size', 'background-repeat', 'view-timeline-inset'].includes(component.name)) {
		return nodes.every(node => isKeyword(node, component.default));
	}

	if (nodes.length !== 1) {
		return false;
	}

	const [node] = nodes;
	if (component.default && isKeyword(node, component.default)) {
		return true;
	}

	if (component.number !== undefined) {
		const quantity = evaluateCssMath(node);
		return quantity?.value === component.number && quantity.unit === component.unit;
	}

	if (component.default === 'transparent') {
		return areEquivalentColors(node, {type: 'Identifier', name: 'transparent'});
	}

	if (component.default === 'ease' && node.type === 'Function' && normalizeCssIdentifier(node.name) === 'cubic-bezier') {
		const arguments_ = node.children.filter(child => child.type !== 'Operator');
		return arguments_.length === 4 && arguments_.every((argument, index) => {
			const quantity = evaluateCssMath(argument);
			return quantity?.unit === undefined && quantity?.value === [0.25, 0.1, 0.25, 1][index];
		});
	}

	return false;
};

/**
Assign every token in a validated layer to its shorthand component.

@param {string} property
@param {CssNodePlain[]} nodes
@param {Lexer} lexer
*/
const getComponentGroups = (property, nodes, lexer) => {
	const components = /** @type {ShorthandComponent[]} */ (profiles.get(property));

	/**
	@type {ValuePlain}
	*/
	const value = {type: 'Value', children: nodes};
	const match = /** @type {PlainLexerMatchResult} */ (lexer.matchProperty(property, value));
	if (!match.matched) {
		return;
	}

	const groups = /** @type {ComponentGroups} */ (new Map(components.map(component => [component.name, []])));
	let timeCount = 0;
	let slash;
	for (const node of nodes) {
		if (node.type === 'Operator') {
			if (node.value === '/' && !slash) {
				slash = node;
				continue;
			}

			if (node.value !== ',') {
				return;
			}

			// Font family commas are not layer boundaries.
			if (property === 'font') {
				groups.get('font-family').push(node);
				continue;
			}
		}

		const trace = match.getTrace(node) ?? [];
		let component;
		if (property === 'transition' && trace.some(syntax => syntax.type === 'Type' && syntax.name === 'time')) {
			const name = ['transition-duration', 'transition-delay'][timeCount++];
			component = components.find(component => component.name === name);
		} else {
			component = components.find(component => {
				const syntaxType = component.type ? 'Type' : 'Property';
				const syntaxName = component.type ?? component.name;
				return trace.some(syntax => syntax.type === syntaxType && syntax.name === syntaxName);
			});
		}

		if (!component && ['animation', 'transition'].includes(property) && isKeyword(node, 'none')) {
			component = components.find(component => component.name === (property === 'animation' ? 'animation-name' : 'transition-property'));
		}

		if (!component) {
			return;
		}

		groups.get(component.name).push(node);
	}

	if (property === 'animation') {
		const names = groups.get('animation-name');
		const confirmedNames = getGroupAnimationNameNodes(nodes, property, value, lexer);
		if (names.some(node => !isKeyword(node, 'none') && !confirmedNames.includes(node))) {
			return;
		}
	} else if (property === 'transition') {
		const [propertyNode] = groups.get('transition-property');
		if (propertyNode && components.some(component => component.name !== 'transition-property'
			&& lexer.matchProperty(component.name, propertyNode).matched && groups.get(component.name).length === 0)) {
			return;
		}
	}

	return {groups, slash};
};

/**
Expand a validated layer into component keys. Reset-only longhands are unchanged because the shorthand itself is retained.

@param {string} property
@param {CssNodePlain[]} nodes
@param {Lexer} lexer
@returns {ShorthandExpansion | undefined}
*/
const getExpansion = (property, nodes, lexer) => {
	const result = getComponentGroups(property, nodes, lexer);
	if (!result) {
		return;
	}

	const {groups, slash} = result;
	const components = /** @type {ShorthandComponent[]} */ (profiles.get(property));
	const expansion = components.map(component => isDefaultComponent(groups.get(component.name), component, lexer) ? '' : getNodesKey(groups.get(component.name)));
	const removableGroups = components.filter((component, index) => expansion[index] === '').map(component => groups.get(component.name)).filter(nodes => nodes.length > 0);
	if (property === 'background') {
		const boxes = groups.get('background-boxes');
		const origin = boxes[0];
		const clip = boxes[1] ?? origin;
		const boxIndex = components.findIndex(component => component.name === 'background-boxes');
		expansion[boxIndex] = `${origin && !isKeyword(origin, 'padding-box') ? generate(origin) : ''}/${clip && !isKeyword(clip, 'border-box') ? generate(clip) : ''}`;
		if (boxes.length === 2 && isKeyword(origin, 'padding-box') && isKeyword(clip, 'border-box')) {
			removableGroups.push(boxes);
		}
	}

	if (slash) {
		const slashComponents = {
			font: 'line-height',
			columns: 'column-height',
			container: 'container-type',
			background: 'background-size',
		};
		const slashComponent = slashComponents[/** @type {keyof typeof slashComponents} */ (property)];
		const group = removableGroups.find(group => group === groups.get(slashComponent));
		if (group) {
			removableGroups[removableGroups.indexOf(group)] = [slash, ...group];
		}
	}

	return {key: JSON.stringify(expansion), removableGroups};
};

/**
Get nonoverlapping removal ranges, including an adjacent separator while retaining the other separator between surviving tokens.

@param {CssNodePlain[]} nodes
@param {CssNodePlain[]} retainedNodes
@param {CssicornContext} context
*/
const getRemovalRanges = (nodes, retainedNodes, context) => {
	const {sourceCode} = context;
	const retained = new Set(retainedNodes);

	/**
	@type {[number, number][]}
	*/
	const ranges = [];
	for (let index = 0; index < nodes.length; index++) {
		if (retained.has(nodes[index])) {
			continue;
		}

		const startIndex = index;
		while (index + 1 < nodes.length && !retained.has(nodes[index + 1])) {
			index++;
		}

		ranges.push(startIndex === 0
			? [sourceCode.getRange(nodes[startIndex])[0], sourceCode.getRange(nodes[index + 1])[0]]
			: [sourceCode.getRange(nodes[startIndex - 1])[1], sourceCode.getRange(nodes[index])[1]]);
	}

	return ranges;
};

/**
Whether this shorthand has an explicit, supported default-component profile.

@param {string} property
*/
export const hasShorthandDefaults = property => profiles.has(property);

/**
Try the rightmost default group first, keeping every nondefault component assigned to the same longhand.

@param {string} property
@param {CssNodePlain[]} nodes
@param {ShorthandExpansion} expansion
@param {Lexer} lexer
*/
const getNextReduction = (property, nodes, expansion, lexer) => {
	const groups = expansion.removableGroups.toSorted((first, second) =>
		nodes.indexOf(/** @type {CssNodePlain} */ (second.at(-1))) - nodes.indexOf(/** @type {CssNodePlain} */ (first.at(-1))),
	);
	for (const group of groups) {
		const candidate = nodes.filter(node => !group.includes(node));
		if (candidate.length === 0) {
			continue;
		}

		const next = getExpansion(property, candidate, lexer);
		if (next?.key === expansion.key) {
			return {nodes: candidate, expansion: next};
		}
	}
};

/**
Remove provably redundant default groups until no further omission is possible.

@param {string} property
@param {CssNodePlain[]} nodes
@param {ShorthandExpansion} expansion
@param {Lexer} lexer
*/
const getRetainedNodes = (property, nodes, expansion, lexer) => {
	while (true) {
		const next = getNextReduction(property, nodes, expansion, lexer);
		if (!next) {
			return nodes;
		}

		({nodes, expansion} = next);
	}
};

/**
Find default components that can be removed without changing any expanded longhand or layer count.

@param {string} property
@param {ValuePlain} value
@param {CssicornContext} context
*/
export const getDefaultShorthandReduction = (property, value, context) => {
	const {sourceCode} = context;
	if (value.children.length < 2) {
		return;
	}

	const canonicalValue = getCanonicalLexerNode(value);
	if (!sourceCode.lexer.matchProperty(property, canonicalValue).matched) {
		return;
	}

	const groups = layeredProperties.has(property) ? getCommaSeparatedGroups(canonicalValue) : [{nodes: canonicalValue.children}];
	const ranges = [];

	/**
	@type {string[]}
	*/
	const originalKeys = [];
	for (const {nodes} of groups) {
		const original = getExpansion(property, nodes, sourceCode.lexer);
		if (!original) {
			return;
		}

		originalKeys.push(original.key);
		const retained = getRetainedNodes(property, nodes, original, sourceCode.lexer);
		ranges.push(...getRemovalRanges(nodes, retained, context));
	}

	if (ranges.length === 0) {
		return;
	}

	const [start, end] = sourceCode.getRange(value);
	let replacement = sourceCode.text.slice(start, end);
	for (const [rangeStart, rangeEnd] of ranges.toSorted((first, second) => second[0] - first[0])) {
		replacement = replacement.slice(0, rangeStart - start) + replacement.slice(rangeEnd - start);
	}

	// Validate the text as well as the filtered AST, since removing a separator can join tokens.

	/**
	@type {ValuePlain}
	*/
	let parsed;
	try {
		parsed = getCanonicalLexerNode(/** @type {ValuePlain} */ (toPlainObject(parse(replacement, {context: 'value'}))));
	} catch {
		return;
	}

	const parsedGroups = layeredProperties.has(property) ? getCommaSeparatedGroups(parsed) : [{nodes: parsed.children}];
	if (parsedGroups.length !== groups.length || parsedGroups.some(({nodes}, index) => getExpansion(property, nodes, sourceCode.lexer)?.key !== originalKeys[index])) {
		return;
	}

	return {
		replacement,
		reductions: ranges.map(removeRange => ({removeRange})),
	};
};
