import {keyword} from '@eslint/css-tree';
import {isCssModulesInteropDeclaration, isCssWideKeyword, normalizeCssIdentifier} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID_UNKNOWN = 'no-invalid-property-references/unknown';
const MESSAGE_ID_FORBIDDEN = 'no-invalid-property-references/forbidden';
const messages = {
	[MESSAGE_ID_UNKNOWN]: 'Unknown property reference \'{{name}}\' in \'{{property}}\'.',
	[MESSAGE_ID_FORBIDDEN]: 'Property reference \'{{name}}\' is not allowed in \'{{property}}\'.',
};

const exemptIdentifiersByProperty = new Map([
	['transition', new Set(['all', 'none', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end', 'normal', 'allow-discrete'])],
	['transition-property', new Set(['all', 'none'])],
	['will-change', new Set(['auto', 'scroll-position', 'contents'])],
]);
const forbiddenWillChangeReferences = new Set(['none', 'all', 'will-change']);

/**
Get a problem for a literal property reference in a parsed declaration value.
*/
function getPropertyReferenceProblem(node, property, value, lexer) {
	if (node.type !== 'Identifier') {
		return;
	}

	const name = normalizeCssIdentifier(node.name);
	const reference = keyword(name);
	if (reference.custom || reference.vendor) {
		return;
	}

	const isWideKeyword = isCssWideKeyword(name);
	if (isWideKeyword && value.children.length === 1) {
		return;
	}

	// Some forbidden references are known properties, like `all` and `will-change`.
	const isForbidden = name === 'default' || isWideKeyword || (property === 'will-change' && forbiddenWillChangeReferences.has(name));
	// GetProperty() also accepts declaration hacks and folds non-ASCII letters.
	if (!isForbidden && (exemptIdentifiersByProperty.get(property).has(name) || Object.hasOwn(lexer.properties, name))) {
		return;
	}

	return {
		node,
		messageId: isForbidden ? MESSAGE_ID_FORBIDDEN : MESSAGE_ID_UNKNOWN,
		data: {name: node.name, property},
	};
}

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {lexer} = sourceCode;

	context.on('Declaration', function * (declaration) {
		const property = keyword(normalizeCssIdentifier(declaration.property)).basename;
		if (
			!exemptIdentifiersByProperty.has(property)
			|| declaration.value.type !== 'Value'
			|| sourceCode.getParent(declaration)?.type !== 'Block'
			|| isCssModulesInteropDeclaration(declaration, context)
		) {
			return;
		}

		const owner = sourceCode.getParent(sourceCode.getParent(declaration));
		if (owner?.type === 'Atrule' && lexer.getAtrule(normalizeCssIdentifier(owner.name))?.descriptors) {
			return;
		}

		for (const node of declaration.value.children) {
			const problem = getPropertyReferenceProblem(node, property, declaration.value, lexer);
			if (problem) {
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
			description: 'Disallow invalid property references in transitions and will-change.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
