import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getParenthesizedRange} from './utils/index.js';

const messageIdError = path.basename(fileURLToPath(import.meta.url), '.js');
const suggestionMemberAccess = 'suggestion/member-access';
const suggestionDestructuringInBody = 'suggestion/destructuring-in-body';
const suggestionDestructuringInParameter = 'suggestion/destructuring-in-parameter';

const fix = (context, variable, functionNode, type) => ({
	* [suggestionMemberAccess](fixer) {
		for (const identifier of variable.identifiers) {
			yield fixer.replaceText(identifier, 'context');
		}

		for (const reference of variable.references) {
			if (variable.identifiers.includes(reference.identifier)) {
				continue;
			}

			const {identifier} = reference;
			const replacement = identifier.parent.type === 'Property' && identifier.parent.shorthand
				? `${identifier.name}: context.sourceCode`
				: 'context.sourceCode';
			yield fixer.replaceText(identifier, replacement);
		}
	},
	* [suggestionDestructuringInBody](fixer) {
		const {sourceCode} = context;

		for (const identifier of variable.identifiers) {
			yield fixer.replaceText(identifier, 'context');
		}

		const functionBody = functionNode.body;

		if (functionBody.type === 'BlockStatement') {
			yield fixer.insertTextAfter(
				sourceCode.getFirstToken(functionBody),
				'\n\tconst {sourceCode} = context;',
			);
			return;
		}

		const range = getParenthesizedRange(functionBody, context);
		yield fixer.insertTextBeforeRange(
			range,
			'{\n\tconst {sourceCode} = context;\n\treturn ',
		);

		yield fixer.insertTextAfterRange(
			range,
			';\n}',
		);
	},
	* [suggestionDestructuringInParameter](fixer) {
		for (const identifier of variable.identifiers) {
			const needsParentheses = functionNode.type === 'ArrowFunctionExpression'
				&& context.sourceCode.getTokenAfter(identifier).value === '=>';
			yield fixer.replaceText(identifier, needsParentheses ? '({sourceCode})' : '{sourceCode}');
		}
	},
})[type];

const config = {
	create: context => ({
		':function'(functionNode) {
			for (let parameter of functionNode.params) {
				if (parameter.type === 'AssignmentPattern') {
					parameter = parameter.left;
				}

				if (parameter.type !== 'Identifier' || parameter.name !== 'sourceCode') {
					continue;
				}

				const variable = context.sourceCode.getDeclaredVariables(functionNode)
					.find(variable => variable.defs.length === 1 && variable.defs[0].name === parameter);

				context.report({
					node: parameter,
					messageId: messageIdError,
					suggest: [
						suggestionDestructuringInBody,
						suggestionMemberAccess,
						suggestionDestructuringInParameter,
					].map(type => ({
						messageId: type,
						fix: fix(context, variable, functionNode, type),
					})),
				});
			}
		},
	}),
	meta: {
		fixable: 'code',
		hasSuggestions: true,
		messages: {
			[messageIdError]: 'Accept `context` instead of `sourceCode` in utilities.',
			[suggestionMemberAccess]: 'Use `context.sourceCode`.',
			[suggestionDestructuringInBody]: 'Add `const {sourceCode} = context;`.',
			[suggestionDestructuringInParameter]: 'Change parameter to `{sourceCode}`.',
		},
	},
};

export default config;
