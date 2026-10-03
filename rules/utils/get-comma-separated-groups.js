/**
Split the children of a value into the groups between top-level commas, like the layers of `font-family` or `animation`.

@param {object} value - The `Value` node.
@returns {{nodes: object[], previousComma: object | undefined, nextComma: object | undefined}[]}
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
