import test from 'node:test';
import assert from 'node:assert/strict';
import {getParsableNestedRulePrelude} from '../../rules/utils/index.js';

test('keeps a prelude that the parser reads as a rule', () => {
	for (const prelude of ['.a ', 'span:hover ', '& span::before ', '> span::before ']) {
		assert.equal(getParsableNestedRulePrelude(prelude, {canAddNestingSelector: true}), prelude, prelude);
	}
});

test('adds `&` to a prelude that the parser reads as a declaration', () => {
	assert.equal(getParsableNestedRulePrelude('span::before ', {canAddNestingSelector: true}), '& span::before ');
	assert.equal(getParsableNestedRulePrelude('/* x */ span::before ', {canAddNestingSelector: true}), '& /* x */ span::before ');
	assert.equal(getParsableNestedRulePrelude('a:hover, button:focus, span:hover, div:hover ', {canAddNestingSelector: true}), '& a:hover, button:focus, span:hover, div:hover ');
	assert.equal(getParsableNestedRulePrelude('input:not([value="&"], [type=radio], [type=range]) ', {canAddNestingSelector: true}), '& input:not([value="&"], [type=radio], [type=range]) ');
	// The `&` is added only before the first selector, so `&` in a later selector does not matter.
	assert.equal(getParsableNestedRulePrelude('span::before, & .a ', {canAddNestingSelector: true}), '& span::before, & .a ');
	assert.equal(getParsableNestedRulePrelude('span::before, .a & ', {canAddNestingSelector: true}), '& span::before, .a & ');
	assert.equal(getParsableNestedRulePrelude('span::before:is(.x, .y), & ', {canAddNestingSelector: true}), '& span::before:is(.x, .y), & ');
});

test('does not add `&` when it is not allowed or would change the selector', () => {
	assert.equal(getParsableNestedRulePrelude('span::before ', {canAddNestingSelector: false}), undefined);
	assert.equal(getParsableNestedRulePrelude('a::before &, .b ', {canAddNestingSelector: true}), undefined);
	assert.equal(getParsableNestedRulePrelude('span::before:is(.x, &), .a ', {canAddNestingSelector: true}), undefined);
	assert.equal(getParsableNestedRulePrelude(') ', {canAddNestingSelector: true}), undefined);
});
