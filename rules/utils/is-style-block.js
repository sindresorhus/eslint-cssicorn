import isKeyframesAtRule from './is-keyframes-at-rule.js';
import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
Check whether a block contains style declarations, excluding keyframes and descriptors.

@param {object} block - The parsed block.
@param {object} context - The rule context.
@returns {boolean}
*/
export default function isStyleBlock(block, context) {
	const {sourceCode} = context;
	const parent = sourceCode.getParent(block);
	if (parent?.type === 'Atrule') {
		const atRule = sourceCode.lexer.getAtrule(normalizeCssIdentifier(parent.name));
		if (!atRule || atRule.descriptors !== null) {
			return false;
		}
	} else if (parent?.type !== 'Rule') {
		return false;
	}

	const ancestors = sourceCode.getAncestors(block);
	return ancestors.some(node => node.type === 'Rule' && node.prelude?.type === 'SelectorList')
		&& ancestors.every(node => !isKeyframesAtRule(node));
}
