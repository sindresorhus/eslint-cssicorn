// @ts-check

import {tokenize, tokenTypes} from '@eslint/css-tree';
import isParsedAsNestedRule from './is-parsed-as-nested-rule.js';

/**
Get a nested rule prelude that the parser reads as a rule.

If the parser reads the prelude as a declaration, like `span::before`, an explicit `& ` is added when allowed. A nested selector without `&` is relative to the parent rule, so `& span::before` means the same as `span::before`.

@param {string} prelude - The exact prelude text the fix writes, including the whitespace before `{`.
@param {{canAddNestingSelector: boolean}} options - Pass `false` to never add `&`, like in `@scope`, which is not worth the extra care.
@returns {string | undefined} The prelude, the prelude with `& ` added, or `undefined` when neither is read as a rule.
*/
export default function getParsableNestedRulePrelude(prelude, {canAddNestingSelector}) {
	if (isParsedAsNestedRule(`${prelude}{}`)) {
		return prelude;
	}

	if (!canAddNestingSelector) {
		return;
	}

	// A selector with `&` does not get the implicit `&`. Only the first selector matters, but to keep it simple, skip a list with `&` anywhere.
	let hasNestingSelector = false;
	tokenize(prelude, (type, start) => {
		if (type === tokenTypes.Delim && prelude[start] === '&') {
			hasNestingSelector = true;
		}
	});

	const explicitPrelude = `& ${prelude}`;
	return !hasNestingSelector && isParsedAsNestedRule(`${explicitPrelude}{}`) ? explicitPrelude : undefined;
}
