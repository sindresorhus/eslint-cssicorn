/**
@import * as ESLint from 'eslint';
*/

/**
Check whether any comment falls entirely within the given range.

@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@param {[number, number]} range - The range to check.
@returns {boolean}
*/
export default function hasCommentInRange(context, [start, end]) {
	const {sourceCode} = context;
	return sourceCode.comments.some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart >= start && commentEnd <= end;
	});
}
