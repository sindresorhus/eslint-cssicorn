import hasCommentInRange from './has-comment-in-range.js';

/**
@import {CssicornContext} from '../rule/cssicorn-context.js';
*/

/**
Get the range to remove so a whole declaration disappears, including its trailing `;`. Returns `undefined` when the declaration contains a comment, because removing it would drop the comment.

@param {import('@eslint/css-tree').DeclarationPlain} declaration
@param {CssicornContext} context
@returns {[number, number] | undefined}
*/
export default function getDeclarationRemovalRange(declaration, context) {
	const {sourceCode} = context;
	const [start, end] = sourceCode.getRange(declaration);
	if (hasCommentInRange(context, [start, end])) {
		return;
	}

	return [start, end + (sourceCode.text[end] === ';' ? 1 : 0)];
}
