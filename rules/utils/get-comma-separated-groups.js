/**
@import {CssNodePlain, Operator} from '@eslint/css-tree';
*/

/**
Split the children of a value into the groups between top-level commas, like the layers of `font-family` or `animation`.

@param {{children: CssNodePlain[]}} value - The node or object containing the value children.
@returns {{nodes: CssNodePlain[], previousComma: Operator | undefined, nextComma: Operator | undefined}[]}
*/
export default function getCommaSeparatedGroups(value) {
	const groups = [];
	let nodes = [];
	let previousComma;

	for (const node of value.children) {
		if (node.type === 'Operator' && node.value === ',') {
			groups.push({nodes, previousComma, nextComma: node});
			nodes = [];
			previousComma = node;
			continue;
		}

		nodes.push(node);
	}

	groups.push({nodes, previousComma, nextComma: undefined});

	return groups;
}
