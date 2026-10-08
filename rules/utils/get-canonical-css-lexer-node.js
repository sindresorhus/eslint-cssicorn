import {ident} from '@eslint/css-tree';

/**
Canonicalize escaped identifier, function, and unit spellings for CSS grammar matching, preserving source locations.

@param {object} node - The parsed CSS node.
@returns {object}
*/
export default function getCanonicalCssLexerNode(node) {
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
			children: node.children.map(child => getCanonicalCssLexerNode(child)),
		};
	}

	return canonicalNode;
}
