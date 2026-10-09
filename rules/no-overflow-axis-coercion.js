import {
	getCssWideKeyword,
	groupingAtRules,
	hasSubstitutionOrRandomFunction,
	isCssModulesInteropDeclaration,
	isImportantDeclaration,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID = 'no-overflow-axis-coercion';
const messages = {
	[MESSAGE_ID]: '`{{property}}: visible` computes to `auto` because `{{otherProperty}}` is `{{otherValue}}`. Result: `{{firstProperty}}: {{firstValue}}` and `{{secondProperty}}: {{secondValue}}`.',
};

const physicalProperties = ['overflow-x', 'overflow-y'];
const logicalProperties = ['overflow-block', 'overflow-inline'];
const overflowProperties = new Set(['overflow', ...physicalProperties, ...logicalProperties]);
const scrollableValues = new Set(['hidden', 'auto', 'scroll', 'overlay']);
const overflowValues = new Set(['visible', 'clip', ...scrollableValues]);

// An empty array represents an unknown value that still overrides earlier declarations.
const getOverflowValues = (declaration, property) => {
	if (
		getCssWideKeyword(declaration) !== undefined
		|| hasSubstitutionOrRandomFunction(declaration.value)
	) {
		return [];
	}

	const {value} = declaration;
	if (
		property === 'all'
		|| value.type !== 'Value'
		|| value.children.length === 0
		|| value.children.length > (property === 'overflow' ? 2 : 1)
	) {
		return;
	}

	const values = [];
	for (const node of value.children) {
		if (node.type !== 'Identifier') {
			return;
		}

		const name = normalizeCssIdentifier(node.name);
		if (!overflowValues.has(name)) {
			return;
		}

		values.push({node, value: name});
	}

	return values;
};

// A `Rule` also matches keyframe selectors, like `from`, so every ancestor at-rule must be checked.
const isStyleBlock = (block, sourceCode) => {
	const ancestors = sourceCode.getAncestors(block);
	return ancestors.some(node => node.type === 'Rule')
		&& ancestors.every(node => node.type !== 'Atrule' || groupingAtRules.has(normalizeCssIdentifier(node.name)));
};

const getOverflowAxes = (declarations, properties) => {
	const axes = new Map();
	for (const {declaration, property} of declarations) {
		const values = getOverflowValues(declaration, property);
		if (!values) {
			continue;
		}

		const important = isImportantDeclaration(declaration);
		const affectedProperties = property === 'overflow' || property === 'all' ? properties : [property];
		for (const [index, affectedProperty] of affectedProperties.entries()) {
			if (axes.get(affectedProperty)?.important && !important) {
				continue;
			}

			axes.set(affectedProperty, {...(values[index] ?? values[0]), important});
		}
	}

	return axes;
};

const getOverflowProblem = (axes, properties) => {
	const [firstProperty, secondProperty] = properties;
	const first = axes.get(firstProperty);
	const second = axes.get(secondProperty);
	if (!first?.value || !second?.value) {
		return;
	}

	const firstIsCoerced = first.value === 'visible' && scrollableValues.has(second.value);
	const secondIsCoerced = second.value === 'visible' && scrollableValues.has(first.value);
	if (!firstIsCoerced && !secondIsCoerced) {
		return;
	}

	return {
		node: firstIsCoerced ? first.node : second.node,
		messageId: MESSAGE_ID,
		data: {
			property: firstIsCoerced ? firstProperty : secondProperty,
			otherProperty: firstIsCoerced ? secondProperty : firstProperty,
			otherValue: firstIsCoerced ? second.value : first.value,
			firstProperty,
			firstValue: firstIsCoerced || first.value === 'overlay' ? 'auto' : first.value,
			secondProperty,
			secondValue: secondIsCoerced || second.value === 'overlay' ? 'auto' : second.value,
		},
	};
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Block', block => {
		const declarations = [];
		let hasPhysicalProperties = false;
		let hasLogicalProperties = false;
		for (const declaration of block.children) {
			if (declaration.type !== 'Declaration') {
				continue;
			}

			const property = normalizeCssIdentifier(declaration.property);
			if (!overflowProperties.has(property) && property !== 'all') {
				continue;
			}

			hasPhysicalProperties ||= property === 'overflow' || physicalProperties.includes(property);
			hasLogicalProperties ||= logicalProperties.includes(property);
			declarations.push({declaration, property});
		}

		if (
			hasPhysicalProperties === hasLogicalProperties
			|| !isStyleBlock(block, sourceCode)
			|| isCssModulesInteropDeclaration(declarations[0].declaration, context)
		) {
			return;
		}

		const properties = hasLogicalProperties ? logicalProperties : physicalProperties;
		return getOverflowProblem(getOverflowAxes(declarations, properties), properties);
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
			description: 'Disallow overflow values that are coerced by the other axis.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
