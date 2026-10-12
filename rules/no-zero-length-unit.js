import mathFunctions from './shared/css-math-functions.js';
import {
	decodeCssIdentifier,
	isCssModulesInteropDeclaration,
	normalizeCssIdentifier,
	toLocation,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-zero-length-unit';
const messages = {
	[MESSAGE_ID]: 'Remove the unit from this zero length.',
};

const zeroPattern = /^[+\-]?(?:0+(?:\.0+)?|\.0+)(?:e[+\-]?\d+)?$/iv;
const calculationFunctions = new Set([
	...mathFunctions,
	'calc-mix',
	'calc-size',
	'container-progress',
	'media-progress',
]);
const excludedProperties = new Set([
	'border-image',
	'border-image-outset',
	'border-image-width',
	'columns',
	'flex',
	'font',
	'initial-value',
	'line-height',
	'mask-border',
	'mask-border-outset',
	'mask-border-width',
	// Chrome rejects a bare unitless zero, like `overflow-clip-margin: 0`.
	'overflow-clip-margin',
	'stroke-dasharray',
	'stroke-dashoffset',
	'stroke-width',
	'tab-size',
]);
const mediaLengthFeatures = new Set(['width', 'height', 'device-width', 'device-height']);
const containerLengthFeatures = new Set(['width', 'height', 'inline-size', 'block-size']);

const isExcludedContext = ancestors => ancestors.some(ancestor => {
	if (ancestor.type === 'Function') {
		const name = normalizeCssIdentifier(ancestor.name);
		return name.startsWith('-') || calculationFunctions.has(name);
	}

	if (ancestor.type === 'Declaration') {
		const name = normalizeCssIdentifier(ancestor.property);
		return name.startsWith('-') || excludedProperties.has(name);
	}

	return false;
});

// A declaration is matched once, not once for every zero length in it.
const declarationMatches = new WeakMap();

const isDeclarationMatched = (declaration, sourceCode) => {
	if (!declarationMatches.has(declaration)) {
		declarationMatches.set(declaration, sourceCode.lexer.matchDeclaration(declaration).matched);
	}

	return declarationMatches.get(declaration);
};

const isSupportedContext = (node, ancestors, context) => {
	const {sourceCode} = context;
	const declaration = ancestors.findLast(ancestor => ancestor.type === 'Declaration');
	if (declaration) {
		if (isCssModulesInteropDeclaration(declaration, context)) {
			return false;
		}

		return Boolean(
			isDeclarationMatched(declaration, sourceCode)
			|| (sourceCode.getParent(node) === declaration.value && sourceCode.lexer.matchProperty(decodeCssIdentifier(declaration.property), node).matched),
		);
	}

	const feature = ancestors.findLast(ancestor => ancestor.type === 'Feature' || ancestor.type === 'FeatureRange');
	if (!feature) {
		return false;
	}

	const identifier = feature.type === 'Feature' ? feature.name : [feature.left, feature.middle, feature.right].find(part => part?.type === 'Identifier')?.name;
	const name = normalizeCssIdentifier(identifier ?? '').replace(/^(?:min|max)-/v, '');
	return (feature.kind === 'media' && mediaLengthFeatures.has(name)) || (feature.kind === 'container' && containerLengthFeatures.has(name));
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	context.on('Dimension', node => {
		if (
			!zeroPattern.test(node.value)
			|| !sourceCode.lexer.matchType('length', node).matched
		) {
			return;
		}

		const ancestors = sourceCode.getAncestors(node);
		if (isExcludedContext(ancestors) || !isSupportedContext(node, ancestors, context)) {
			return;
		}

		const [start, end] = sourceCode.getRange(node);
		const unitRange = [start + node.value.length, end];
		return {
			node,
			loc: toLocation(unitRange, context),
			messageId: MESSAGE_ID,
			fix: fixer => fixer.removeRange(unitRange),
		};
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
			description: 'Disallow units on zero CSS lengths.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
