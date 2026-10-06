// @ts-check

import {tokenize, tokenTypes} from '@eslint/css-tree';
import {decodeCssIdentifier, normalizeCssIdentifier, toLocation} from './utils/index.js';

/**
@import {CSSSourceCode} from '@eslint/css';
@import {DeclarationPlain} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';

@typedef {{property: string, sourceRange: [number, number]}} Reference
@typedef {'empty' | 'valid' | 'unknown' | 'invalid' | 'initial' | 'inherit' | 'unset' | 'revert' | 'revert-layer'} Value
@typedef {{type: number, start: number, end: number, closing?: number}} Token
@typedef {{declaration: DeclarationPlain, important: boolean, evaluate: () => Generator<Reference, Value, Value>}} CustomPropertyDeclaration
@typedef {{property: string, declaration: CustomPropertyDeclaration, iterator: Generator<Reference, Value, Value>, input: Value, reference?: Reference, cycleReference?: Reference, value?: Value}} EvaluationState
*/

const MESSAGE_ID = 'no-self-referencing-custom-properties';
const MESSAGE_ID_CYCLE = 'no-self-referencing-custom-properties/cycle';
const messages = {
	[MESSAGE_ID]: 'Custom property `{{property}}` must not reference itself.',
	[MESSAGE_ID_CYCLE]: 'Custom property `{{property}}` is part of a dependency cycle.',
};

/**
@param {Value} left
@param {Value} right
@returns {Value}
*/
const combineValues = (left, right) => {
	if (left === 'invalid' || right === 'invalid') {
		return 'invalid';
	}

	if (left === 'unknown' || right === 'unknown') {
		return 'unknown';
	}

	if (left === 'empty') {
		return right;
	}

	return right === 'empty' ? left : 'valid';
};

/**
@param {Token[]} tokens
@param {number} start
@param {number} end
@returns {number}
*/
const getFirstArgumentEnd = (tokens, start, end) => {
	for (let index = start; index < end; index++) {
		if (tokens[index].type === tokenTypes.Comma) {
			return index;
		}

		index = tokens[index].closing ?? index;
	}

	return end;
};

/**
@param {DeclarationPlain} declaration
@param {CSSSourceCode} sourceCode
@returns {() => Generator<Reference, Value, Value>}
*/
const getEvaluator = (declaration, sourceCode) => {
	const text = sourceCode.getText(declaration.value);
	const [offset] = sourceCode.getRange(declaration.value);
	/**
	@type {Token[]}
	*/
	const tokens = [];
	/**
	@type {number[]}
	*/
	const openingTokens = [];
	// Custom-property values and var() fallbacks can be opaque Raw nodes.
	tokenize(text, (type, start, end) => {
		if (type === tokenTypes.WhiteSpace || type === tokenTypes.Comment) {
			return;
		}

		const index = tokens.length;
		tokens.push({type, start, end});
		if ([tokenTypes.Function, tokenTypes.LeftParenthesis, tokenTypes.LeftSquareBracket, tokenTypes.LeftCurlyBracket].includes(type)) {
			openingTokens.push(index);
		} else if ([tokenTypes.RightParenthesis, tokenTypes.RightSquareBracket, tokenTypes.RightCurlyBracket].includes(type)) {
			const opening = openingTokens.pop();
			if (opening !== undefined) {
				tokens[opening].closing = index;
			}
		}
	});

	return function * () {
		/**
		@type {{index: number, end: number, value: Value, dynamic?: boolean}[]}
		*/
		const frames = [{index: 0, end: tokens.length, value: 'empty'}];
		while (frames.length > 0) {
			const frame = /** @type {typeof frames[number]} */ (frames.at(-1));
			if (frame.index >= frame.end) {
				frames.pop();
				const value = frame.dynamic ? 'unknown' : frame.value;
				const parent = frames.at(-1);
				if (!parent) {
					return value;
				}

				parent.value = combineValues(parent.value, value);
				continue;
			}

			const token = tokens[frame.index++];
			if (token.type !== tokenTypes.Function) {
				const name = token.type === tokenTypes.Ident ? normalizeCssIdentifier(text.slice(token.start, token.end)) : '';
				const value = ['initial', 'inherit', 'unset', 'revert', 'revert-layer'].includes(name) ? /** @type {Value} */ (name) : 'valid';
				frame.value = combineValues(frame.value, value);
				continue;
			}

			const name = normalizeCssIdentifier(text.slice(token.start, token.end - 1));
			const closing = token.closing ?? frame.end;
			if (['if', 'env', 'attr', 'inherit', 'first-valid', 'random-item', 'ident'].includes(name) || name.startsWith('--')) {
				frame.index = closing + 1;
				frame.value = combineValues(frame.value, 'unknown');
				continue;
			}

			if (name !== 'var') {
				frame.value = combineValues(frame.value, 'valid');
				continue;
			}

			const referenceIndex = frame.index;
			const reference = tokens[referenceIndex];
			const boundary = tokens[frame.index + 1];
			if (reference?.type !== tokenTypes.Ident || !boundary || ![tokenTypes.Comma, tokenTypes.RightParenthesis].includes(boundary.type)) {
				// A dynamic var() name still evaluates literal references in its first argument.
				const start = frame.index;
				const end = getFirstArgumentEnd(tokens, start, closing);

				frame.index = closing + 1;
				frames.push({
					index: start, end, value: 'empty', dynamic: true,
				});
				continue;
			}

			const property = decodeCssIdentifier(text.slice(reference.start, reference.end));
			frame.index = closing + 1;
			// A custom-property reference contains `--`, unless it is escaped.
			const value = property.startsWith('--')
				? yield {property, sourceRange: [offset + reference.start, offset + reference.end]}
				: 'unknown';
			if (value === 'invalid' && boundary.type === tokenTypes.Comma) {
				frames.push({index: referenceIndex + 2, end: closing, value: 'empty'});
			} else {
				frame.value = combineValues(frame.value, value);
			}
		}

		return 'empty';
	};
};

/**
@param {Map<string, CustomPropertyDeclaration>} declarations
@returns {Map<string, EvaluationState>}
*/
const evaluateDeclarations = declarations => {
	/**
	@type {Map<string, EvaluationState>}
	*/
	const states = new Map();
	/**
	@type {EvaluationState[]}
	*/
	const stack = [];
	/**
	@param {string} property
	*/
	const enter = property => {
		const declaration = /** @type {CustomPropertyDeclaration} */ (declarations.get(property));
		const state = {
			property,
			declaration,
			iterator: declaration.evaluate(),
			input: /** @type {Value} */ ('empty'),
		};
		states.set(property, state);
		stack.push(state);
	};

	// Active evaluation contexts identify cycles without reporting properties that merely depend on one.
	// Use an explicit traversal stack so long dependency chains cannot exhaust the call stack.
	for (const property of declarations.keys()) {
		if (states.has(property)) {
			continue;
		}

		enter(property);
		while (stack.length > 0) {
			const state = /** @type {EvaluationState} */ (stack.at(-1));
			const result = state.cycleReference ? state.iterator.return('invalid') : state.iterator.next(state.input);
			if (result.done) {
				let {value} = result;
				if (value === 'initial') {
					value = 'invalid';
				} else if (['inherit', 'unset', 'revert', 'revert-layer'].includes(value)) {
					value = 'unknown';
				}

				state.value = value;
				stack.pop();
				const parent = stack.at(-1);
				if (parent) {
					parent.input = value;
				}

				continue;
			}

			const reference = result.value;
			state.reference = reference;
			if (!declarations.has(reference.property)) {
				state.input = 'unknown';
				continue;
			}

			const target = states.get(reference.property);
			if (target?.value !== undefined) {
				state.input = target.value;
			} else if (target) {
				// Stop each invalidated context before evaluating later branches or dependencies.
				for (let index = stack.indexOf(target); index < stack.length; index++) {
					const participant = stack[index];
					participant.cycleReference = /** @type {Reference} */ (participant.reference);
				}

				state.input = 'invalid';
			} else {
				enter(reference.property);
			}
		}
	}

	return states;
};

/**
@param {CustomPropertyDeclaration} declaration
@param {string} property
@param {Map<string, EvaluationState>} states
@returns {Reference | undefined}
*/
const getSelfReference = (declaration, property, states) => {
	const iterator = declaration.evaluate();
	let result = iterator.next('empty');
	while (!result.done) {
		const reference = result.value;
		if (reference.property === property) {
			return reference;
		}

		result = iterator.next(states.get(reference.property)?.value ?? 'unknown');
	}
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Block', function * (block) {
		/**
		@type {Map<string, CustomPropertyDeclaration>}
		*/
		const declarations = new Map();
		/**
		@type {{property: string, declaration: CustomPropertyDeclaration}[]}
		*/
		const allDeclarations = [];
		for (const declaration of block.children) {
			if (declaration.type !== 'Declaration') {
				continue;
			}

			const property = decodeCssIdentifier(declaration.property);
			if (!property.startsWith('--')) {
				continue;
			}

			const important = declaration.important === true
				|| (typeof declaration.important === 'string' && normalizeCssIdentifier(declaration.important) === 'important');
			const entry = {
				declaration, important, evaluate: getEvaluator(declaration, sourceCode),
			};
			allDeclarations.push({property, declaration: entry});
			if (!declarations.get(property)?.important || important) {
				declarations.set(property, entry);
			}
		}

		const states = evaluateDeclarations(declarations);
		const selfReferencingProperties = new Set();
		for (const {property, declaration} of allDeclarations) {
			// Preserve direct diagnostics in overridden declarations and prefer them over indirect cycles.
			const reference = getSelfReference(declaration, property, states);
			if (!reference) {
				continue;
			}

			if (declarations.get(property) === declaration) {
				selfReferencingProperties.add(property);
			}

			yield {
				node: declaration.declaration,
				loc: toLocation(reference.sourceRange, context),
				messageId: MESSAGE_ID,
				data: {property},
			};
		}

		for (const [property, state] of states) {
			const {cycleReference} = state;
			if (!cycleReference || selfReferencingProperties.has(property)) {
				continue;
			}

			yield {
				node: state.declaration.declaration,
				loc: toLocation(cycleReference.sourceRange, context),
				messageId: MESSAGE_ID_CYCLE,
				data: {property},
			};
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
