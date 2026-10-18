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

const borderComponents = [
	{name: 'width', type: 'line-width', initial: 'medium'},
	{name: 'style', type: 'line-style', initial: 'none'},
	{name: 'color', type: 'color', initial: 'currentcolor'},
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

const profiles = new Map([
	...borderProperties.map(property => [property, borderComponents]),
	['outline', [
		{name: 'outline-width', initial: 'medium'},
		{name: 'outline-style', initial: 'none'},
		// Explicit color `auto` is not supported consistently, so removing it can turn an ignored declaration into an applied one.
		{name: 'outline-color'},
	]],
	['column-rule', [
		{name: 'column-rule-width', initial: 'medium'},
		{name: 'column-rule-style', initial: 'none'},
		{name: 'column-rule-color', initial: 'currentcolor'},
	]],
	['font', [
		{name: 'font-style', initial: 'normal'},
		{name: 'font-variant', type: 'font-variant-css2', initial: 'normal'},
		{name: 'font-weight', initial: 'normal', number: 400},
		{name: 'font-width', type: 'font-width-css3', initial: 'normal'},
		{name: 'font-size'},
		{name: 'line-height', initial: 'normal'},
		{name: 'font-family'},
	]],
	['flex-flow', [
		{name: 'flex-direction', initial: 'row'},
		{name: 'flex-wrap', initial: 'nowrap'},
	]],
	['columns', [
		{name: 'column-width', initial: 'auto'},
		{name: 'column-count', initial: 'auto'},
		{name: 'column-height', initial: 'auto'},
	]],
	['list-style', [
		{name: 'list-style-type', initial: 'disc'},
		{name: 'list-style-position', initial: 'outside'},
		{name: 'list-style-image', initial: 'none'},
	]],
	['text-decoration', [
		{name: 'text-decoration-line', initial: 'none'},
		{name: 'text-decoration-style', initial: 'solid'},
		{name: 'text-decoration-color', initial: 'currentcolor'},
		{name: 'text-decoration-thickness', initial: 'auto'},
	]],
	['background', [
		{name: 'background-image', type: 'bg-image', initial: 'none'},
		{name: 'background-position', type: 'bg-position', initial: 'position'},
		{name: 'background-size', type: 'bg-size', initial: 'auto'},
		{name: 'background-repeat', type: 'repeat-style', initial: 'repeat'},
		{name: 'background-attachment', type: 'attachment', initial: 'scroll'},
		{name: 'background-boxes', type: 'visual-box'},
		{name: 'background-color', initial: 'transparent'},
	]],
	['animation', [
		{name: 'animation-duration', initial: 'auto'},
		{name: 'animation-timing-function', type: 'easing-function', initial: 'ease'},
		{name: 'animation-delay', number: 0, unit: 's'},
		{name: 'animation-iteration-count', type: 'single-animation-iteration-count', number: 1},
		{name: 'animation-direction', type: 'single-animation-direction', initial: 'normal'},
		{name: 'animation-fill-mode', type: 'single-animation-fill-mode', initial: 'none'},
		{name: 'animation-play-state', type: 'single-animation-play-state', initial: 'running'},
		{name: 'animation-name', type: 'keyframes-name', initial: 'none'},
	]],
	['transition', [
		{name: 'transition-property', type: 'single-transition-property', initial: 'all'},
		{name: 'transition-duration', number: 0, unit: 's'},
		{name: 'transition-timing-function', type: 'easing-function', initial: 'ease'},
		{name: 'transition-delay', number: 0, unit: 's'},
		{name: 'transition-behavior', type: 'transition-behavior-value', initial: 'normal'},
	]],
]);

const layeredProperties = new Set(['background', 'animation', 'transition']);
const isKeyword = (node, keyword) => node.type === 'Identifier' && normalizeCssIdentifier(node.name) === keyword;
const getNodesKey = nodes => nodes.map(node => generate(node)).join(' ');

/**
Recognize the initial two-axis position without resolving lengths against a layout.
*/
const isInitialPosition = nodes => nodes.length === 2 && (
	(nodes.every(node => evaluateCssMath(node)?.value === 0))
	|| (isKeyword(nodes[0], 'left') && isKeyword(nodes[1], 'top'))
	|| (isKeyword(nodes[0], 'top') && isKeyword(nodes[1], 'left'))
	|| (isKeyword(nodes[0], 'left') && evaluateCssMath(nodes[1])?.value === 0)
	|| (evaluateCssMath(nodes[0])?.value === 0 && isKeyword(nodes[1], 'top'))
);

/**
Recognize only finite, exactly equal default values, retaining numeric units and nondefault color channels.
*/
const isInitialComponent = (nodes, component) => {
	if (nodes.length === 0) {
		return true;
	}

	if (component.initial === 'position') {
		return isInitialPosition(nodes);
	}

	if (component.name === 'background-size' || component.name === 'background-repeat') {
		return nodes.every(node => isKeyword(node, component.initial));
	}

	if (nodes.length !== 1) {
		return false;
	}

	const [node] = nodes;
	if (component.initial && isKeyword(node, component.initial)) {
		return true;
	}

	if (component.number !== undefined) {
		const quantity = evaluateCssMath(node);
		return quantity?.value === component.number && quantity.unit === component.unit;
	}

	if (component.initial === 'transparent') {
		return areEquivalentColors(node, {type: 'Identifier', name: 'transparent'});
	}

	if (component.initial === 'ease' && node.type === 'Function' && normalizeCssIdentifier(node.name) === 'cubic-bezier') {
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
*/
const getComponentGroups = (property, nodes, lexer) => {
	const components = profiles.get(property);
	const value = {type: 'Value', children: nodes};
	const match = lexer.matchProperty(property, value);
	if (!match.matched) {
		return;
	}

	const groups = new Map(components.map(component => [component.name, []]));
	let timeCount = 0;
	let slash;
	for (const node of nodes) {
		if (node.type === 'Operator') {
			if (node.value === '/' && !slash) {
				slash = node;
				continue;
			}

			// Font family commas are not layer boundaries.
			if (property === 'font' && node.value === ',') {
				groups.get('font-family').push(node);
				continue;
			}

			return;
		}

		let component;
		if (property === 'transition' && match.isType(node, 'time')) {
			const name = timeCount++ === 0 ? 'transition-duration' : 'transition-delay';
			component = components.find(component => component.name === name);
		} else {
			component = components.find(component => component.type ? match.isType(node, component.type) : match.isProperty(node, component.name));
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
*/
const getExpansion = (property, nodes, lexer) => {
	const result = getComponentGroups(property, nodes, lexer);
	if (!result) {
		return;
	}

	const {groups, slash} = result;
	const components = profiles.get(property);
	const expansion = components.map(component => isInitialComponent(groups.get(component.name), component) ? '' : getNodesKey(groups.get(component.name)));
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
		const slashComponents = {font: 'line-height', columns: 'column-height', background: 'background-size'};
		const slashComponent = slashComponents[property];
		const group = removableGroups.find(group => group === groups.get(slashComponent));
		if (group) {
			removableGroups[removableGroups.indexOf(group)] = [slash, ...group];
		}
	}

	return {key: JSON.stringify(expansion), removableGroups};
};

/**
Get nonoverlapping removal ranges, including an adjacent separator while retaining the other separator between surviving tokens.
*/
const getRemovalRanges = (nodes, retainedNodes, context) => {
	const {sourceCode} = context;
	const retained = new Set(retainedNodes);
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
*/
export const hasShorthandDefaults = property => profiles.has(property);

/**
Try the rightmost default group first, keeping every nondefault component assigned to the same longhand.
*/
const getNextReduction = (property, nodes, expansion, lexer) => {
	const groups = expansion.removableGroups.toSorted((first, second) => nodes.indexOf(second.at(-1)) - nodes.indexOf(first.at(-1)));
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
	let parsed;
	try {
		parsed = getCanonicalLexerNode(toPlainObject(parse(replacement, {context: 'value'})));
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
