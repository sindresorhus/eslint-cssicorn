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
	const {comments} = sourceCode;

	// Comments are in source order and do not overlap, so if the first comment that starts in the range does not end in it, no later comment can.
	let lowerIndex = 0;
	let upperIndex = comments.length;
	while (lowerIndex < upperIndex) {
		const middleIndex = Math.floor((lowerIndex + upperIndex) / 2);
		if (sourceCode.getRange(comments[middleIndex])[0] < start) {
			lowerIndex = middleIndex + 1;
		} else {
			upperIndex = middleIndex;
		}
	}

	const comment = comments[lowerIndex];
	return comment !== undefined && sourceCode.getRange(comment)[1] <= end;
}
