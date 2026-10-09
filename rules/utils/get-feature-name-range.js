// @ts-check

/**
@import {Feature} from '@eslint/css-tree';
@import {CssRuleContext} from '../rule/cssicorn-context.js';
*/

const cssWhitespacePattern = /[\t\n\f\r ]/v;

/**
Get the range of the name of a media or container feature, like `width` in `( width: 1px)`. The node starts at the `(`, which can be followed by whitespace and comments before the name.

@param {Feature} node - The `Feature` node.
@param {CssRuleContext} context - The ESLint rule context object.
@returns {[number, number]}
*/
export default function getFeatureNameRange(node, context) {
	const {sourceCode} = context;
	const text = sourceCode.getText(node);
	let index = 0;

	while (index < text.length) {
		if (text[index] === '(' || cssWhitespacePattern.test(text[index])) {
			index++;
			continue;
		}

		if (text.startsWith('/*', index)) {
			const commentEnd = text.indexOf('*/', index + 2);
			if (commentEnd === -1) {
				break;
			}

			index = commentEnd + 2;
			continue;
		}

		break;
	}

	const [start] = sourceCode.getRange(node);
	return [start + index, start + index + node.name.length];
}
