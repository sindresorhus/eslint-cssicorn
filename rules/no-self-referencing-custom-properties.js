import {tokenize, tokenTypes} from '@eslint/css-tree';
import {decodeCssIdentifier, normalizeCssIdentifier, toLocation} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-self-referencing-custom-properties';
const MESSAGE_ID_CYCLE = 'no-self-referencing-custom-properties/cycle';
const messages = {
	[MESSAGE_ID]: 'Custom property `{{property}}` must not reference itself.',
	[MESSAGE_ID_CYCLE]: 'Custom property `{{property}}` is part of a dependency cycle.',
};

const getReferences = (declaration, sourceCode) => {
	const references = [];
	const text = sourceCode.getText(declaration.value);
	// A custom-property reference contains `--`, unless it is escaped.
	if (!text.includes('--') && !text.includes('\\')) {
		return references;
	}

	const [offset] = sourceCode.getRange(declaration.value);
	const tokens = [];
	// Custom-property values and var() fallbacks can be opaque Raw nodes.
	tokenize(text, (type, start, end) => {
		if (type !== tokenTypes.WhiteSpace && type !== tokenTypes.Comment) {
			tokens.push({type, start, end});
		}
	});

	for (const [index, token] of tokens.entries()) {
		const reference = tokens[index + 1];
		const boundary = tokens[index + 2];
		if (
			token.type !== tokenTypes.Function
			|| reference?.type !== tokenTypes.Ident
			|| (boundary?.type !== tokenTypes.Comma && boundary?.type !== tokenTypes.RightParenthesis)
			|| normalizeCssIdentifier(text.slice(token.start, token.end - 1)) !== 'var'
		) {
			continue;
		}

		references.push({
			property: decodeCssIdentifier(text.slice(reference.start, reference.end)),
			sourceRange: [offset + reference.start, offset + reference.end],
		});
	}

	return references;
};

const getCyclicComponents = declarations => {
	const states = new Map();
	const stack = [];
	const frames = [];
	const components = [];

	// Tarjan's algorithm finds cycles without reporting properties that merely depend on one.
	// Use an explicit traversal stack so long dependency chains cannot exhaust the call stack.
	const enter = property => {
		const state = {
			property,
			index: states.size,
			lowLink: states.size,
			onStack: true,
			references: declarations.get(property).references.values(),
		};
		states.set(property, state);
		stack.push(property);
		frames.push(state);
	};

	for (const property of declarations.keys()) {
		if (states.has(property)) {
			continue;
		}

		enter(property);
		while (frames.length > 0) {
			const state = frames.at(-1);
			const {value: reference, done} = state.references.next();
			if (!done) {
				if (!declarations.has(reference.property)) {
					continue;
				}

				const referenceState = states.get(reference.property);
				if (!referenceState) {
					enter(reference.property);
				} else if (referenceState.onStack) {
					state.lowLink = Math.min(state.lowLink, referenceState.index);
				}

				continue;
			}

			frames.pop();
			const parentState = frames.at(-1);
			if (parentState) {
				parentState.lowLink = Math.min(parentState.lowLink, state.lowLink);
			}

			if (state.lowLink !== state.index) {
				continue;
			}

			const component = new Set();
			let member;
			do {
				member = stack.pop();
				states.get(member).onStack = false;
				component.add(member);
			} while (member !== state.property);

			if (component.size > 1) {
				components.push(component);
			}
		}
	}

	return components;
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Block', function * (block) {
		const declarations = new Map();
		for (const declaration of block.children) {
			if (declaration.type !== 'Declaration') {
				continue;
			}

			const property = decodeCssIdentifier(declaration.property);
			if (!property.startsWith('--')) {
				continue;
			}

			const references = getReferences(declaration, sourceCode);
			const selfReference = references.find(reference => reference.property === property);
			if (selfReference) {
				yield {
					node: declaration,
					loc: toLocation(selfReference.sourceRange, context),
					messageId: MESSAGE_ID,
					data: {property},
				};
			}

			const important = declaration.important === true
				|| (typeof declaration.important === 'string' && normalizeCssIdentifier(declaration.important) === 'important');
			if (!declarations.get(property)?.important || important) {
				declarations.set(property, {
					declaration, references, selfReference, important,
				});
			}
		}

		for (const component of getCyclicComponents(declarations)) {
			for (const property of component) {
				const {declaration, references, selfReference} = declarations.get(property);
				if (selfReference) {
					continue;
				}

				const reference = references.find(reference => component.has(reference.property));
				yield {
					node: declaration,
					loc: toLocation(reference.sourceRange, context),
					messageId: MESSAGE_ID_CYCLE,
					data: {property},
				};
			}
		}
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow cyclic dependencies in CSS custom properties.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
