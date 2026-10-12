import test from 'node:test';
import assert from 'node:assert/strict';
import {isParsedAsNestedRule} from '../../rules/utils/index.js';

test('nested rules that the parser reads as rules', () => {
	for (const ruleText of [
		'.a {}',
		'& span::before {}',
		'span:hover {}',
		'> span {}',
		'+ span {}',
		'span .a {}',
		'a:hover, a:focus { color: red; }',
		'html :root:not(.a, .b) &{}',
	]) {
		assert.equal(isParsedAsNestedRule(ruleText), true, ruleText);
	}
});

test('nested rules that the parser reads as declarations or rejects', () => {
	for (const ruleText of [
		'span::before {}',
		'span::part(x) {}',
		'+span {}',
		'|span {}',
		'a:hover, button:focus, span:hover, div:hover { color: red; }',
		'input:not([type=checkbox], [type=radio], [type=range]) {}',
		'color: red;',
		// Whitespace before `{` counts toward the parser lookahead.
		'html :root:not(.a, .b) & {}',
	]) {
		assert.equal(isParsedAsNestedRule(ruleText), false, ruleText);
	}
});
