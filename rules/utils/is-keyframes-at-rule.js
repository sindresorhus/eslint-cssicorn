import normalizeCssIdentifier from './normalize-css-identifier.js';

const keyframesNamePattern = /^(?:-(?:moz|o|webkit)-)?keyframes$/u;

/**
Check whether a node is a `@keyframes` at-rule, including vendor-prefixed and escaped names like `@-webkit-keyframes` and `@\6b eyframes`.

@param {object | undefined} node - The node to check.
@returns {boolean}
*/
export default function isKeyframesAtRule(node) {
	return node?.type === 'Atrule' && keyframesNamePattern.test(normalizeCssIdentifier(node.name));
}
