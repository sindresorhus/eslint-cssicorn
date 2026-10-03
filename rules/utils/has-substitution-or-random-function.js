import isSubstitutionFunction from './is-substitution-function.js';
import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
Check whether a node or any of its descendants is a substitution function (see `isSubstitutionFunction`) or `random()`. Random values are cached per property and per position in the value, so moving, merging, or removing a `random()` can change its value.

@param {object} node - The node to check, usually a declaration value.
@returns {boolean}
*/
export default function hasSubstitutionOrRandomFunction(node) {
	const nodes = [node];
	while (nodes.length > 0) {
		const target = nodes.pop();
		if (
			isSubstitutionFunction(target)
			|| (target.type === 'Function' && normalizeCssIdentifier(target.name) === 'random')
		) {
			return true;
		}

		if (target.children) {
			nodes.push(...target.children);
		}
	}

	return false;
}
