import {tokenize, tokenTypes} from '@eslint/css-tree';
import {isSubstitutionFunction, normalizeCssIdentifier} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID_CUSTOM_PROPERTY = 'no-ineffective-supports-conditions/custom-property';
const MESSAGE_ID_SUBSTITUTION = 'no-ineffective-supports-conditions/substitution';
const messages = {
	[MESSAGE_ID_CUSTOM_PROPERTY]: 'This condition does not test support for `{{functionName}}()`. Custom properties accept their values as tokens.',
	[MESSAGE_ID_SUBSTITUTION]: 'This condition does not establish support for `{{functionName}}()` when its value uses `{{substitutionName}}()`.',
};

// Built once per lexer, as files share the lexer unless they use a custom syntax.
const valueFunctionNamesByLexer = new WeakMap();
const getValueFunctionNames = lexer => {
	let valueFunctionNames = valueFunctionNamesByLexer.get(lexer);
	if (!valueFunctionNames) {
		valueFunctionNames = new Set(Object.keys(lexer.types).filter(name => name.endsWith('()')).map(name => normalizeCssIdentifier(name.slice(0, -2))));
		valueFunctionNamesByLexer.set(lexer, valueFunctionNames);
	}

	return valueFunctionNames;
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;

	const getDeclarationProblem = declaration => {
		const valueText = sourceCode.getText(declaration.value);
		if (!valueText.includes('(')) {
			return;
		}

		const valueFunctionNames = getValueFunctionNames(sourceCode.lexer);
		let ignoredDepth = 0;
		let functionName;
		let substitutionName;

		tokenize(valueText, (type, start, end) => {
			if (ignoredDepth > 0) {
				if (type === tokenTypes.Function || type === tokenTypes.LeftParenthesis) {
					ignoredDepth++;
				} else if (type === tokenTypes.RightParenthesis) {
					ignoredDepth--;
				}

				return;
			}

			if (type !== tokenTypes.Function) {
				return;
			}

			const name = valueText.slice(start, end - 1);
			if (isSubstitutionFunction({type: 'Function', name})) {
				substitutionName ??= name;
			} else if (valueFunctionNames.has(normalizeCssIdentifier(name))) {
				functionName ??= name;
			} else {
				// Ignore query syntax, typed attr() arguments, and build-time helpers, including their contents.
				ignoredDepth = 1;
			}
		});

		const isCustomProperty = declaration.property.startsWith('--');
		if (!functionName || (!isCustomProperty && !substitutionName)) {
			return;
		}

		return {
			node: declaration,
			messageId: isCustomProperty ? MESSAGE_ID_CUSTOM_PROPERTY : MESSAGE_ID_SUBSTITUTION,
			data: {functionName, substitutionName},
		};
	};

	context.on('SupportsDeclaration', node => {
		const ancestors = sourceCode.getAncestors(node);
		const atRule = ancestors.findLast(ancestor => ancestor.type === 'Atrule');
		if (!atRule || !ancestors.includes(atRule.prelude)) {
			return;
		}

		const name = normalizeCssIdentifier(atRule.name);
		if (name === 'supports' || name === 'import') {
			return getDeclarationProblem(node.declaration);
		}
	});

	context.on('Atrule', function * (atRule) {
		const name = normalizeCssIdentifier(atRule.name);
		if (name === 'supports-condition') {
			for (const declaration of atRule.block?.children ?? []) {
				if (declaration.type === 'Declaration') {
					yield getDeclarationProblem(declaration);
				}
			}

			return;
		}

		if (name !== 'import') {
			return;
		}

		const supports = atRule.prelude?.children?.find(node => node.type === 'Function' && normalizeCssIdentifier(node.name) === 'supports');
		const declaration = supports?.children?.find(node => node.type === 'Declaration');
		if (declaration) {
			yield getDeclarationProblem(declaration);
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
			description: 'Disallow supports conditions that do not test their value functions.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
