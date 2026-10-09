/**
@import {CssNodePlain} from '@eslint/css-tree';
@import {CSSSourceCode} from '@eslint/css';
*/

/**
Get the range from the start of the first node to the end of the last node.

@param {CssNodePlain[]} nodes - A non-empty list of sibling nodes.
@param {{sourceCode: CSSSourceCode}} context
@returns {[number, number]} The `[start, end]` range.
*/
export default function getNodesRange(nodes, {sourceCode}) {
	return [sourceCode.getRange(nodes[0])[0], sourceCode.getRange(nodes.at(-1))[1]];
}
