/**
@import * as ESLint from 'eslint';
*/

/**
Get location info for the given node or range.

@param {object | [number, number]} nodeOrRange - The AST node or range to get the location for.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {ESLint.AST.SourceLocation}
*/
export default function toLocation(nodeOrRange, context) {
	const {sourceCode} = context;
	const [start, end] = Array.isArray(nodeOrRange) ? nodeOrRange : sourceCode.getRange(nodeOrRange);

	return {
		start: sourceCode.getLocFromIndex(start),
		end: sourceCode.getLocFromIndex(end),
	};
}
