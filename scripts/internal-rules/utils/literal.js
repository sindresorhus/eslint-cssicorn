export function isLiteral(node, value) {
	if (node?.type !== 'Literal') {
		return false;
	}

	return node.value === value;
}
