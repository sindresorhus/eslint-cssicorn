/**
@import {CSSSourceCode} from '@eslint/css';
*/

/**
Get the rule or at-rule whose block directly contains a node, like the `a` rule for `color: red` in `a { color: red }`. Returns `undefined` when the parent of the node is not a block.

@param {import('@eslint/css-tree').CssNodePlain} node - The node to check.
@param {{sourceCode: CSSSourceCode}} context
@returns {import('@eslint/css-tree').CssNodePlain | undefined}
*/
export default function getBlockOwner(node, {sourceCode}) {
	const parent = sourceCode.getParent(node);
	return parent?.type === 'Block' ? sourceCode.getParent(parent) : undefined;
}
