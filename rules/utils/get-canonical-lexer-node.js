// @ts-check

import {ident} from '@eslint/css-tree';

/**
@import {CssNodePlain} from '@eslint/css-tree';
*/

/**
Canonicalize escaped identifiers, function names, and units for CSS lexer matching without changing their source locations.

@template {CssNodePlain} Node
@param {Node} node - The CSS AST node to canonicalize.
@returns {Node}
*/
export default function getCanonicalLexerNode(node) {
	// The lexer does not consistently recognize escaped keyword, function, or unit spellings.
	let canonicalNode = node;
	if (node.type === 'Identifier' || node.type === 'Function') {
		canonicalNode = {...node, name: ident.encode(ident.decode(node.name))};
	} else if (node.type === 'Dimension') {
		canonicalNode = {...node, unit: ident.encode(ident.decode(node.unit))};
	}

	if ('children' in node && node.children) {
		canonicalNode = {
			...canonicalNode,
			children: node.children.map(child => getCanonicalLexerNode(child)),
		};
	}

	return canonicalNode;
}
