import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	...['is', 'where'].flatMap(name => [
		{
			code: `:${name}(.a, :unknown) .title { color: blue; }`,
			output: `:${name}(.a, :unknown) { .title { color: blue; } }`,
		},
		{
			code: `.card :${name}(.a, :unknown) { color: blue; }`,
			output: `.card { :${name}(.a, :unknown) { color: blue; } }`,
		},
		{
			code: `.card:${name}(.a, :unknown(#missing)).active { color: blue; }`,
			output: `.card { &:${name}(.a, :unknown(#missing)).active { color: blue; } }`,
		},
		{
			code: `.card > :${name}(.a, ::before) { color: blue; }`,
			output: `.card { > :${name}(.a, ::before) { color: blue; } }`,
		},
		{
			code: `:${name}(.a, .invalid*) .title { color: blue; }`,
			output: `:${name}(.a, .invalid*) { .title { color: blue; } }`,
		},
		{
			code: `.card :${name}(.a, .invalid*) { color: blue; }`,
			output: `.card { :${name}(.a, .invalid*) { color: blue; } }`,
		},
	]),
	{
		code: '#chooser img:is(:-moz-broken, :not([src])) { visibility: hidden; }',
		output: '#chooser img { &:is(:-moz-broken, :not([src])) { visibility: hidden; } }',
	},
	{
		code: ':is(.a, :before).active { color: blue; }',
		output: ':is(.a, :before) { &.active { color: blue; } }',
	},
	{
		code: '.card :is(.a > :unknown, .b) { color: blue; }',
		output: '.card { :is(.a > :unknown, .b) { color: blue; } }',
	},
	{
		code: '.card :where(.a, ::before) .title { color: blue; }',
		output: '.card { :where(.a, ::before) .title { color: blue; } }',
	},
	{
		code: String.raw`:IS(.a, :un\6b nown) .title { color: blue; }`,
		output: String.raw`:IS(.a, :un\6b nown) { .title { color: blue; } }`,
	},
	{
		code: '.card :is(.a, :unknown()) { color: blue; }',
		output: '.card { :is(.a, :unknown()) { color: blue; } }',
	},
	{
		code: '.card :is(.a, :nth-child()) { color: blue; }',
		output: '.card { :is(.a, :nth-child()) { color: blue; } }',
	},
	{
		code: '.card :is(.a, :has(:has(.b))) { color: blue; }',
		output: '.card { :is(.a, :has(:has(.b))) { color: blue; } }',
	},
	{
		code: '.card :where(.a, :unknown("&")) { color: blue; }',
		output: '.card { :where(.a, :unknown("&")) { color: blue; } }',
	},
	{
		code: ':is(.a, > .b) .title { color: blue; }',
		output: ':is(.a, > .b) { .title { color: blue; } }',
	},
	{
		code: '.outer, #missing { :is(.a, :unknown) .title { color: blue !important; & .body { color: green; } } }',
		output: '.outer, #missing { :is(.a, :unknown) { .title { color: blue !important; & .body { color: green; } } } }',
	},
];

test({
	valid: [
		':is(:unknown, :also-unknown) .title { color: blue; }',
		'.card :where(::before, ::after) { color: blue; }',
		'.card:is(.a, :unknown(&)) { color: blue; }',
		'.outer { :is(.a, :unknown(&)) .title { color: blue; } }',
		'.outer { .card:where(.a, &) { color: blue; } }',
		':is(.a, :unknown) { color: blue; }',
		'@scope (.outer) { .card :is(.a, :unknown) { color: blue; } }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting'}]})),
		{code: '.card :is(.a, /* keep */ :unknown) { color: blue; }', errors: [{messageId: 'prefer-nesting'}]},
	],
});

nodeTest('forgiving group fixes preserve wrappers and reach parseable stable output', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/prefer-nesting': 'error'}};
	for (const {code, output} of cases) {
		const expected = linter.verifyAndFix(output, config, {filename: 'test.css'});
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, expected.output, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {fixed: false, output: result.output, messages: []}, code);
	}
});
