// @ts-check

import {tokenize, tokenTypes} from '@eslint/css-tree';
import isParsedAsNestedRule from './is-parsed-as-nested-rule.js';

const openingTypes = new Set([tokenTypes.Function, tokenTypes.LeftParenthesis, tokenTypes.LeftSquareBracket]);
const closingTypes = new Set([tokenTypes.RightParenthesis, tokenTypes.RightSquareBracket]);

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

	// A selector with `&` does not get the implicit `&`. The `&` is added only before the first selector, so only the first selector matters. It ends at the first comma outside of parentheses and brackets.
	let hasNestingSelector = false;
	let isFirstSelector = true;
	let depth = 0;
	tokenize(prelude, (type, start) => {
		if (!isFirstSelector) {
			return;
		}

		if (openingTypes.has(type)) {
			depth++;
		} else if (closingTypes.has(type)) {
			depth--;
		} else if (type === tokenTypes.Comma && depth === 0) {
			isFirstSelector = false;
		} else if (type === tokenTypes.Delim && prelude[start] === '&') {
			hasNestingSelector = true;
		}
	});

	const explicitPrelude = `& ${prelude}`;
	return !hasNestingSelector && isParsedAsNestedRule(`${explicitPrelude}{}`) ? explicitPrelude : undefined;
}
