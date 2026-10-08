import {ident} from '@eslint/css-tree';

/**
Canonicalize escaped identifiers, function names, and units for CSS lexer matching without changing their source locations.

@param {object} node - The CSS AST node to canonicalize.
@returns {object}
*/
export default function getCanonicalLexerNode(node) {
	// The lexer does not consistently recognize escaped keyword, function, or unit spellings.
	let canonicalNode = node;
	if (node.type === 'Identifier' || node.type === 'Function') {
		canonicalNode = {...node, name: ident.encode(ident.decode(node.name))};
	} else if (node.type === 'Dimension') {
		canonicalNode = {...node, unit: ident.encode(ident.decode(node.unit))};
	}

	if (node.children) {
		canonicalNode = {
			...canonicalNode,
			children: node.children.map(child => getCanonicalLexerNode(child)),
		};
	}

	return canonicalNode;
}
