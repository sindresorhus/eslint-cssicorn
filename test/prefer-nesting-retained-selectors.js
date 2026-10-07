import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	{
		code: '.outer { > &&.card:is(.a, #missing) { color: blue; } }',
		output: '.outer { > &&.card { &:is(.a, #missing) { color: blue; } } }',
	},
	{
		code: '.outer { && .title, && .body { color: blue; } }',
		output: '.outer { && { & .title, & .body { color: blue; } } }',
	},
	{
		code: '.outer { .theme & .card {} .theme & .card .title { color: blue; } }',
		output: '.outer { .theme & .card { & .title { color: blue; } } }',
	},
	{
		code: '.outer { .active& {} .active&:hover { color: blue; } }',
		output: '.outer { .active& { &:hover { color: blue; } } }',
	},
	{
		code: '.outer { div&.active {} div&.active::before { content: "test"; } }',
		output: '.outer { div&.active { &::before { content: "test"; } } }',
	},
	{
		code: '.outer { &.a + &.b {} &.a + &.b .title { color: blue; } }',
		output: '.outer { &.a + &.b { & .title { color: blue; } } }',
	},
	{
		code: '.outer { &&.card {} &&.card.active { color: blue; } }',
		output: '.outer { &&.card { &.active { color: blue; } } }',
	},
	{
		code: '.outer { .theme &.a + &.b .title {} .theme &.a + &.b .body {} }',
		output: '.outer { .theme &.a + &.b { & .title {} & .body {} } }',
	},
	{
		code: '.outer { .theme & .card .title, .theme & .card .body { color: blue; } }',
		output: '.outer { .theme & .card { & .title, & .body { color: blue; } } }',
	},
	{
		code: '.outer { &.a + &.b .title, &.a + &.b .body { color: blue; } }',
		output: '.outer { &.a + &.b { & .title, & .body { color: blue; } } }',
	},
	{
		code: '.outer { .theme & .card:is(.a, #missing) { color: blue; } }',
		output: '.outer { .theme & .card { &:is(.a, #missing) { color: blue; } } }',
	},
	{
		code: '.outer { &.a + &.b :is(.title, .body) { color: blue; } }',
		output: '.outer { &.a + &.b { .title, .body { color: blue; } } }',
	},
	{
		code: '.outer { .theme & .card:WHERE(.a, #missing)::before { color: blue; } }',
		output: '.outer { .theme & .card { &:WHERE(.a, #missing)::before { color: blue; } } }',
	},
	{
		code: String.raw`.outer { .th\65 me & .c\61 rd {} .th\65 me & .c\61 rd:HOVER { color: blue; } }`,
		output: String.raw`.outer { .th\65 me & .c\61 rd { &:HOVER { color: blue; } } }`,
	},
	{
		code: '.outer { .theme & .card {} @media (color) { @layer theme { .theme & .card .title { color: blue; } } } }',
		output: '.outer { .theme & .card { @media (color) { @layer theme { & .title { color: blue; } } } } }',
	},
	{
		code: '.outer { &.a + &.b {} @media (color) { &.a + &.b { color: blue; } } }',
		output: '.outer { &.a + &.b { @media (color) { color: blue; } } }',
	},
	{
		code: '.outer { .theme &.a, .theme &.b {} .theme &.a .title, .theme &.b .title { color: blue; } }',
		output: '.outer { .theme &.a, .theme &.b { & .title { color: blue; } } }',
	},
	{
		code: '.outer { &&.a, &&.b {} &&.b:hover, &&.a:hover { color: blue; } }',
		output: '.outer { &&.a, &&.b { &:hover { color: blue; } } }',
	},
	{
		code: '.outer { .a, &.b {} .a .title, &.b .title { color: blue; } }',
		output: '.outer { .a, &.b { & .title { color: blue; } } }',
	},
	{
		code: '.outer, #missing { .theme & .card {} .theme & .card .title { color: blue !important; & .body { color: green; } } }',
		output: '.outer, #missing { .theme & .card { & .title { color: blue !important; & .body { color: green; } } } }',
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: [
			'.outer {',
			'  .theme & .card {',
			'    color: red;',
			'  }',
			'  .theme & .card .title {',
			'    color: blue;',
			'  }',
			'}',
		].join(lineBreak),
		output: [
			'.outer {',
			'  .theme & .card {',
			'    color: red;',
			'    & .title {',
			'      color: blue;',
			'    }',
			'  }',
			'}',
		].join(lineBreak),
	})),
];

test({
	valid: [
		'.outer { .theme & .card {} .theme & .card & .title {} }',
		'.outer { .theme & .card {} .theme & .card:has(&) {} }',
		'.outer { .theme & .card {} .theme & .card:is(.active, &.active) {} }',
		'.outer { .theme & .card {} .theme & .card:is(.active, :unknown(&)) {} }',
		'.outer { .theme & .card .title, .theme & .card & .body {} }',
		'.outer { .theme & .card:is(&.active, .active) {} }',
		'.outer { &.a, &&.b {} &.a .title, &&.b .title {} }',
		'.outer, #missing { &.a, &&.b {} &.a .title, &&.b .title { color: blue; } }',
		'.outer { & {} & .title {} }',
		'.outer { & .title, & .body {} }',
		'.outer { .card:has(&) {} .card:has(&) .title {} }',
		'.outer { .card:nth-child(2n of &) {} .card:nth-child(2n of &) .title {} }',
		'.outer { :where(&).card {} :where(&).card .title {} }',
		'@scope (.outer) { .theme & .card {} .theme & .card .title {} }',
		'@namespace url("https://example.com"); .outer { .theme & .card {} .theme & .card .title {} }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: 1})),
		...[
			'.outer { .theme & .card {} /* keep */ .theme & .card .title {} }',
			'.outer { .theme & .card {} .theme & .card .title { color: blue; /* keep */ } }',
			'.outer { .theme /* keep */ & .card .title, .theme /* keep */ & .card .body {} }',
		].map(code => ({code, errors: 1})),
	],
});

nodeTest('retained original nesting references reparse and converge with nesting rules', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: Object.fromEntries([
			'prefer-nesting',
			'no-useless-is',
			'no-redundant-nested-style-rules',
			'no-declarations-after-nested-rules',
			'no-unscoped-nesting-selector',
		].map(name => [`cssicorn/${name}`, 'error'])),
	};
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, linter.verifyAndFix(output, config, {filename: 'test.css'}).output, code);
		assert.deepEqual(result.messages, [], code);
		assert.equal(linter.verifyAndFix(result.output, config, {filename: 'test.css'}).fixed, false, code);
	}
});
