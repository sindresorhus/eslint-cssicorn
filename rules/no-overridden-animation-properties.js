import {
	getAnimationName,
	getGroupAnimationNameNodes,
	getKeyframeOffsets,
	getKeyframesName,
} from './shared/css-animations.js';
import {nonAnimatableProperties} from './shared/css-property-animation-types.js';
import {propertyNameAliases} from './shared/css-property-name-aliases.js';
import {shorthandToAffectedProperties} from './shared/css-shorthand-properties.js';
import {
	getCanonicalLexerNode,
	getCommaSeparatedGroups,
	getCssWideKeyword,
	hasSubstitutionOrRandomFunction,
	isCssModulesInteropDeclaration,
	isImportantDeclaration,
	isStyleBlock,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID = 'no-overridden-animation-properties';
const messages = {
	[MESSAGE_ID]: 'Animation `{{name}}` replaces {{properties}} from earlier overlapping animations.',
};

const animationComponents = [
	{property: 'animation-name'},
	{property: 'animation-duration', defaultValue: 0},
	{property: 'animation-delay', defaultValue: 0},
	{property: 'animation-iteration-count', type: 'single-animation-iteration-count', defaultValue: 1},
	{property: 'animation-play-state', type: 'single-animation-play-state', defaultValue: 'running'},
	{property: 'animation-timeline', type: 'single-animation-timeline', defaultValue: 'auto'},
];
const animationProperties = new Set(['animation', 'animation-composition', ...animationComponents.map(({property}) => property)]);
const unsupportedProperties = new Set(['all', 'animation-delay-start', 'animation-delay-end', 'animation-trigger']);
const nonAnimatablePropertyNames = new Set(nonAnimatableProperties);

/**
Get the supported literal value of an animation component.
*/
const getComponentValue = (node, property) => {
	if (property === 'animation-name') {
		return getAnimationName(node);
	}

	if (property === 'animation-duration' || property === 'animation-delay') {
		if (node.type !== 'Dimension') {
			return;
		}

		const unit = normalizeCssIdentifier(node.unit);
		if (unit === 's' || unit === 'ms') {
			return Number(node.value) * (unit === 's' ? 1000 : 1);
		}

		return;
	}

	if (property === 'animation-iteration-count') {
		if (node.type === 'Number') {
			return Number(node.value);
		}

		if (node.type === 'Identifier' && normalizeCssIdentifier(node.name) === 'infinite') {
			return Infinity;
		}

		return;
	}

	if (node.type === 'Identifier') {
		return normalizeCssIdentifier(node.name);
	}
};

/**
Get fully parsed animation control lists, leaving unresolved declarations unknown.
*/
const getAnimationLists = (declaration, property, lexer) => {
	const {value} = declaration;
	if (
		value.type !== 'Value'
		|| hasSubstitutionOrRandomFunction(value)
		|| getCssWideKeyword(declaration)
	) {
		return;
	}

	const canonicalValue = getCanonicalLexerNode(value);
	const matchResult = lexer.matchProperty(property, canonicalValue);
	if (!matchResult.matched) {
		return;
	}

	const groups = getCommaSeparatedGroups(value);
	const canonicalGroups = getCommaSeparatedGroups(canonicalValue);
	const components = property === 'animation' ? animationComponents : [{property}];
	const lists = Object.fromEntries(components.map(({property}) => [property, []]));
	for (const [index, {nodes}] of groups.entries()) {
		const canonicalNodes = canonicalGroups[index].nodes;
		for (const component of components) {
			let node;
			if (component.property === 'animation-name') {
				const names = getGroupAnimationNameNodes(nodes, property, value, lexer);
				if (names.length > 1) {
					return;
				}

				[node] = names;
			} else if (property === 'animation') {
				const componentIndex = canonicalNodes.findIndex(node => component.type
					? matchResult.isType(node, component.type)
					: matchResult.isProperty(node, component.property));
				node = nodes[componentIndex];
			} else {
				if (nodes.length !== 1) {
					return;
				}

				[node] = nodes;
			}

			const componentValue = node ? getComponentValue(node, component.property) : component.defaultValue;
			if (node && componentValue === undefined) {
				return;
			}

			lists[component.property].push({node, value: componentValue});
		}
	}

	return lists;
};

/**
Resolve source order and importance for locally declared animation controls.
*/
const getBlockAnimations = (declarations, lexer) => {
	const controls = new Map();
	for (const {declaration, property} of declarations) {
		const important = isImportantDeclaration(declaration);
		const properties = property === 'animation' ? animationComponents.map(({property}) => property) : [property];
		const lists = getAnimationLists(declaration, property, lexer);
		for (const affectedProperty of properties) {
			if (controls.get(affectedProperty)?.important && !important) {
				continue;
			}

			// Unresolved winning declarations must not leave stale literal controls behind.
			controls.set(affectedProperty, {entries: lists?.[affectedProperty], important});
		}
	}

	return controls;
};

/**
Get the known leaf properties affected by a keyframe declaration.
*/
const getAnimatedProperties = (property, lexer) => {
	property = propertyNameAliases.get(property) ?? property;
	if (!Object.hasOwn(lexer.properties, property) || property.startsWith('--')) {
		return [];
	}

	return [...shorthandToAffectedProperties.get(property) ?? [property]]
		.filter(property => !shorthandToAffectedProperties.has(property) && !nonAnimatablePropertyNames.has(property));
};

/**
Get properties with explicit, known values at both endpoints of a keyframes definition.
*/
const getKeyframesProperties = (atRule, lexer) => {
	const starts = new Set();
	const ends = new Set();
	const unknown = new Set();
	for (const keyframe of atRule.block.children) {
		if (keyframe.type !== 'Rule' || keyframe.block?.type !== 'Block') {
			return new Set();
		}

		const offsets = getKeyframeOffsets(keyframe);
		if (offsets.includes(undefined)) {
			return new Set();
		}

		for (const declaration of keyframe.block.children) {
			if (declaration.type !== 'Declaration' || isImportantDeclaration(declaration)) {
				continue;
			}

			const property = normalizeCssIdentifier(declaration.property);
			if (property === 'animation-composition' || property === 'all') {
				return new Set();
			}

			const properties = getAnimatedProperties(property, lexer);
			if (properties.length === 0) {
				continue;
			}

			const {value} = declaration;
			const known = value.type === 'Value'
				&& !hasSubstitutionOrRandomFunction(value)
				&& !getCssWideKeyword(declaration)
				&& lexer.matchProperty(propertyNameAliases.get(property) ?? property, getCanonicalLexerNode(value)).matched;
			for (const affectedProperty of properties) {
				if (!known) {
					unknown.add(affectedProperty);
				}

				if (offsets.includes(0)) {
					starts.add(affectedProperty);
				}

				if (offsets.includes(100)) {
					ends.add(affectedProperty);
				}
			}
		}
	}

	return new Set([...starts].filter(property => ends.has(property) && !unknown.has(property)));
};

/**
Get eligible tracks and their active intervals after initial application.
*/
const getTracks = (controls, keyframes) => {
	const names = controls.get('animation-name')?.entries;
	if (!names || names.length < 2 || animationComponents.some(({property}) => !controls.get(property)?.entries)) {
		return [];
	}

	return names.map(({node, value: name}, index) => {
		const getValue = property => {
			const entries = controls.get(property)?.entries;
			return entries?.[index % entries.length]?.value;
		};

		const properties = keyframes.get(name);
		const duration = getValue('animation-duration');
		const iterations = getValue('animation-iteration-count');
		const delay = getValue('animation-delay');
		if (
			!node
			|| !properties?.size
			|| duration <= 0
			|| iterations <= 0
			|| getValue('animation-play-state') !== 'running'
			|| getValue('animation-timeline') !== 'auto'
		) {
			return;
		}

		return {
			node, name, properties, start: Math.max(0, Math.round(delay)), end: Math.round(delay + (duration * iterations)), composition: getValue('animation-composition'),
		};
	});
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {lexer} = sourceCode;
	const keyframes = new Map();
	const definedNames = new Set();
	const blocks = [];

	context.on('Atrule', atRule => {
		const name = getKeyframesName(atRule, lexer);
		if (name === undefined) {
			return;
		}

		if (definedNames.has(name)) {
			keyframes.delete(name);
			return;
		}

		definedNames.add(name);
		if (normalizeCssIdentifier(atRule.name) === 'keyframes' && sourceCode.getParent(atRule)?.type === 'StyleSheet') {
			keyframes.set(name, atRule);
		}
	});

	context.on('Block', block => {
		const declarations = [];
		for (const declaration of block.children) {
			if (declaration.type !== 'Declaration') {
				continue;
			}

			const name = normalizeCssIdentifier(declaration.property);
			const property = propertyNameAliases.get(name) ?? name;
			if (unsupportedProperties.has(property)) {
				return;
			}

			if (animationProperties.has(property)) {
				declarations.push({declaration, property});
			}
		}

		if (
			declarations.every(({property}) => property !== 'animation-composition')
			|| !isStyleBlock(block, context)
			|| isCssModulesInteropDeclaration(declarations[0].declaration, context)
		) {
			return;
		}

		blocks.push(declarations);
	});

	context.onExit('StyleSheet', function * () {
		if (blocks.length === 0) {
			return;
		}

		const propertiesByName = new Map([...keyframes].map(([name, atRule]) => [name, getKeyframesProperties(atRule, lexer)]));
		for (const declarations of blocks) {
			const tracks = getTracks(getBlockAnimations(declarations, lexer), propertiesByName);
			for (const [index, track] of tracks.entries()) {
				if (track?.composition !== 'replace') {
					continue;
				}

				const properties = new Set();
				for (const earlier of tracks.slice(0, index)) {
					if (!earlier || Math.max(earlier.start, track.start) >= Math.min(earlier.end, track.end)) {
						continue;
					}

					for (const property of track.properties.intersection(earlier.properties)) {
						properties.add(property);
					}
				}

				if (properties.size > 0) {
					yield {
						node: track.node,
						messageId: MESSAGE_ID,
						data: {name: track.name, properties: [...properties].toSorted((left, right) => left.localeCompare(right)).map(property => `\`${property}\``).join(', ')},
					};
				}
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
		type: 'suggestion',
		docs: {
			description: 'Disallow properties overridden by overlapping animations.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
