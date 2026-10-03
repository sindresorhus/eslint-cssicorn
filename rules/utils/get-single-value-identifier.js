/**
Get the identifier when it is the whole value of a declaration, like `inherit` in `color: inherit`.

@param {object} declaration - The `Declaration` node.
@returns {object | undefined} The `Identifier` node.
*/
export default function getSingleValueIdentifier(declaration) {
	const {value} = declaration;
	if (
		value.type !== 'Value'
		|| value.children.length !== 1
	) {
		return;
	}

	const [child] = value.children;
	return child.type === 'Identifier' ? child : undefined;
}
