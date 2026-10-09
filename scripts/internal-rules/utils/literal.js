export function isLiteral(node, value) {
	return node?.type === 'Literal' && node.value === value;
}
