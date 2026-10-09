import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
Get the normalized pseudo-selector name with its prefix, like `::before` or `:hover`. It decodes escapes and lowercases ASCII letters.

@param {import('@eslint/css-tree').PseudoClassSelectorPlain | import('@eslint/css-tree').PseudoElementSelectorPlain} node
@returns {string}
*/
export default function getPseudoSelectorName(node) {
	return `${node.type === 'PseudoElementSelector' ? '::' : ':'}${normalizeCssIdentifier(node.name)}`;
}
