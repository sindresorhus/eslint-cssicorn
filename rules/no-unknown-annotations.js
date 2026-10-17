import {tokenize, tokenTypes} from '@eslint/css-tree';
import {
	hasCommentInRange,
	isImportantDeclaration,
	toLocation,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_ERROR = 'no-unknown-annotations/error';
const MESSAGE_ID_SUGGESTION = 'no-unknown-annotations/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'CSS annotations must use the canonical form `!important`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `!important`.',
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Declaration', declaration => {
		// Custom properties are checked too, because their values cannot contain a top-level `!`, so an unknown annotation drops the declaration.
		if (!declaration.important) {
			return;
		}

		const declarationText = sourceCode.getText(declaration);
		const [declarationStart] = sourceCode.getRange(declaration);
		let annotationStartInDeclaration;
		let identifierEndInDeclaration;
		tokenize(declarationText, (type, start, end) => {
			if (type === tokenTypes.Delim && declarationText[start] === '!') {
				annotationStartInDeclaration = start;
				identifierEndInDeclaration = undefined;
			}

			// The annotation identifier is the first identifier after the `!`.
			if (
				type === tokenTypes.Ident
				&& annotationStartInDeclaration !== undefined
				&& identifierEndInDeclaration === undefined
			) {
				identifierEndInDeclaration = end;
			}
		});

		if (declarationText.slice(annotationStartInDeclaration, identifierEndInDeclaration) === '!important') {
			return;
		}

		const identifierEnd = declarationStart + identifierEndInDeclaration;
		const annotationStart = declarationStart + annotationStartInDeclaration;
		const problem = {
			node: declaration,
			loc: toLocation([annotationStart, identifierEnd], context),
			messageId: MESSAGE_ID_ERROR,
		};

		if (hasCommentInRange(context, [annotationStart, identifierEnd])) {
			return problem;
		}

		/**
		@param {ESLint.Rule.RuleFixer} fixer
		*/
		const fix = fixer => fixer.replaceTextRange([annotationStart, identifierEnd], '!important');

		// A different spelling of `!important`, like `!IMPORTANT` or `! important`, already applies, so only the spelling changes. Fixing a typo would make a dropped declaration apply.
		if (isImportantDeclaration(declaration)) {
			return {...problem, fix};
		}

		return {...problem, suggest: [{messageId: MESSAGE_ID_SUGGESTION, fix}]};
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
			description: 'Disallow unknown and noncanonical CSS annotations.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
