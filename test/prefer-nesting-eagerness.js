import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

test({
	valid: [
		'a.under { color: red; } a.upper { color: blue; }',
		'.under a { color: red; } .upper a { color: blue; }',
		'a.under, a.upper { color: red; }',
		'.under a, .upper a { color: red; }',
		'.card .title { color: red; } .card .body { color: blue; }',
		'.card .title, .card .body { color: red; }',
		'button.rgh-deep-reblame .octicon-versions { color: red; } .rgh-deep-reblame:hover .octicon-versions { color: blue; }',
		'.rgh-fit-textareas { min-height: 4.5lh; } :root textarea.rgh-fit-textareas.form-control { height: auto; }',
		'.card { color: red; } .other { color: blue; } .card:hover { color: green; }',
		'@media (color) { .card { color: red; } } .card:hover { color: blue; }',
		'.card:hover { color: blue; } @media (color) { .card { color: red; } }',
		'a:is(.under, .upper) { color: red; }',
		'.card :is(.title, #title) { color: red; }',
		'.card > :is(.title, .body) { color: red; }',
		'.card :is(.context .title, .body) .icon { color: red; }',
		':is(.card, :unknown) .title { color: red; }',
		':where(.card, .panel) .title { color: red; }',
		'.card :where(.title, .body) { color: red; }',
		'.card:where(.active, .open)::before { content: "test"; }',
	],
	invalid: [
		{
			code: 'a { color: green; } a.under { color: red; } a.upper { color: blue; }',
			output: 'a { color: green; &.under { color: red; } &.upper { color: blue; } }',
			errors: [{messageId: 'prefer-nesting/related-rules'}],
		},
		{
			code: '.card { color: red; } .card:where(.active, .open)::before { content: "test"; }',
			output: '.card { color: red; &:where(.active, .open)::before { content: "test"; } }',
			errors: [{messageId: 'prefer-nesting/related-rules'}],
		},
		{
			code: 'h1, .h1 { font-size: 2rem; } @media (color) { h1, .h1 { font-size: 3rem; } }',
			output: 'h1, .h1 { font-size: 2rem; @media (color) { font-size: 3rem; } }',
			errors: [{messageId: 'prefer-nesting/related-rules'}],
		},
	],
});

nodeTest('structural is conversions converge without expanding retained wrappers', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/prefer-nesting': 'error'}};
	for (const {code, output} of [
		{
			code: '.card:is(.foo, #bar)::before { content: "test"; }',
			output: '.card { &.foo, &#bar { &::before { content: "test"; } } }',
		},
		{
			code: '.outer { &:is(:focus, :hover) svg { fill: red; } }',
			output: '.outer { &:focus, &:hover { svg { fill: red; } } }',
		},
		{
			code: ':is(.card, .panel) .title { color: red; } .card .body, .panel .body { color: blue; }',
			output: '.card, .panel { .title { color: red; } .body { color: blue; } }',
		},
		{
			code: '.card :is(.title, .body) { color: red; } .card .footer { color: blue; }',
			output: '.card { .title, .body { color: red; } .footer { color: blue; } }',
		},
		{
			code: '.card :is(.a, :unknown) :is(.b, .c) { color: red; }',
			output: '.card :is(.a, :unknown) { .b, .c { color: red; } }',
		},
	]) {
		assert.deepEqual(linter.verifyAndFix(code, config, {filename: 'test.css'}), {fixed: true, output, messages: []});
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []});
	}
});
