// @ts-check

import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
@import {RulePlain, SelectorPlain} from '@eslint/css-tree';
*/

/**
Check whether a rule has only a bare `:root` or `html` selector.
@param {RulePlain} rule
*/
export default function isBareRootRule(rule) {
	if (rule.prelude?.type !== 'SelectorList' || rule.prelude.children.length !== 1) {
		return false;
	}

	// SelectorListPlain.children is currently broader than the parser's SelectorPlain[] result.
	const [rootSelector] = /** @type {SelectorPlain[]} */ (rule.prelude.children);
	if (rootSelector.children.length !== 1) {
		return false;
	}

	const [selector] = rootSelector.children;
	return (selector.type === 'TypeSelector' && normalizeCssIdentifier(selector.name) === 'html')
		|| (selector.type === 'PseudoClassSelector' && normalizeCssIdentifier(selector.name) === 'root' && !selector.children);
}
