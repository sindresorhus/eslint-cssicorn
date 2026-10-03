import normalizeCssIdentifier from './normalize-css-identifier.js';

// The arbitrary substitution functions from CSS Values 5, CSS Variables 2, and CSS Environment Variables 1.
const substitutionFunctions = new Set(['attr', 'env', 'first-valid', 'ident', 'if', 'inherit', 'random-item', 'var']);

/**
Check whether a node is a function that is replaced with an arbitrary value at computed-value time, like `var()`, or a custom function like `--foo()`. The value of a declaration that uses one cannot be known when linting.

@param {object} node - The node to check.
@returns {boolean}
*/
export default function isSubstitutionFunction(node) {
	if (node.type !== 'Function') {
		return false;
	}

	const name = normalizeCssIdentifier(node.name);
	return name.startsWith('--') || substitutionFunctions.has(name);
}
