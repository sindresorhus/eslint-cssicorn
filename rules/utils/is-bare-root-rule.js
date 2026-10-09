// @ts-check

import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
@import {RulePlain, SelectorPlain} from '@eslint/css-tree';
*/

/**
Check whether all selectors in a rule are bare `:root` or `html` selectors.
@param {RulePlain} rule
*/
export default function isBareRootRule(rule) {
	if (rule.prelude?.type !== 'SelectorList' || rule.prelude.children.length === 0) {
		return false;
	}

	// SelectorListPlain.children is currently broader than the parser's SelectorPlain[] result.
	const rootSelectors = /** @type {SelectorPlain[]} */ (rule.prelude.children);
	return rootSelectors.every(rootSelector => {
		if (rootSelector.children.length !== 1) {
			return false;
		}

		const [selector] = rootSelector.children;
		return (selector.type === 'TypeSelector' && normalizeCssIdentifier(selector.name) === 'html')
			|| (selector.type === 'PseudoClassSelector' && normalizeCssIdentifier(selector.name) === 'root' && !selector.children);
	});
}
