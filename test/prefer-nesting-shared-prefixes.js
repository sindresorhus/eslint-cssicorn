import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');
const options = [{checkSharedPrefixes: true}];

const cases = [
	{
		code: '.card .title { color: red; } .card .body { color: blue; }',
		output: '.card { .title { color: red; } .body { color: blue; } }',
	},
	{
		code: '.card .title { color: red; } .card .body { color: blue; } .card .footer { color: green; }',
		output: '.card { .title { color: red; } .body { color: blue; } .footer { color: green; } }',
	},
	{
		code: '.card .title {} .card .body {} .panel .title {} .panel .body {}',
		output: '.card { .title {} .body {} } .panel { .title {} .body {} }',
		errors: 2,
	},
	{
		code: '.card.active .title { color: red; } .card.active .body { color: blue; }',
		output: '.card.active { .title { color: red; } .body { color: blue; } }',
	},
	{
		code: 'article.card[data-kind=x] .title { color: red; } article.card[data-kind=x] .body { color: blue; }',
		output: 'article.card[data-kind=x] { .title { color: red; } .body { color: blue; } }',
	},
	{
		code: '.card span::before { content: "test"; } .card button:hover { color: red; }',
		output: '.card { & span::before { content: "test"; } button:hover { color: red; } }',
	},
	{
		code: '.card .title { color: red } .card .body { color: blue }',
		output: '.card { .title { color: red } .body { color: blue } }',
	},
	{
		code: '.card .title { color: red; } .card .title:hover { color: blue; }',
		output: '.card .title { color: red; &:hover { color: blue; } }',
	},
	{
		code: '.card .title { color: red; } .card .body { color: blue; } .other { color: green; } .card .footer { color: black; }',
		output: '.card { .title { color: red; } .body { color: blue; } } .other { color: green; } .card .footer { color: black; }',
	},
	{
		code: '.outer { .card .title { color: red; } .card .body { color: blue; } }',
		output: '.outer { .card { .title { color: red; } .body { color: blue; } } }',
	},
	{
		code: '.outer { &.card .title { color: red; } &.card .body { color: blue; } }',
		output: '.outer { &.card { .title { color: red; } .body { color: blue; } } }',
	},
	{
		code: '.outer, #outer { .card .title { color: red; } .card .body { color: blue; } }',
		output: '.outer, #outer { .card { .title { color: red; } .body { color: blue; } } }',
	},
	{
		code: '@media (color) { @layer theme { .card .title { color: red; } .card .body { color: blue; } } }',
		output: '@media (color) { @layer theme { .card { .title { color: red; } .body { color: blue; } } } }',
	},
	{
		code: String.raw`.c\61 rd .title { COLOR: RED !important; } .c\61 rd .body { color: blue; }`,
		output: String.raw`.c\61 rd { .title { COLOR: RED !important; } .body { color: blue; } }`,
	},
	{
		code: '.card .title { color: red; } .card  .body { color: blue; }',
		output: '.card { .title { color: red; } .body { color: blue; } }',
	},
	...['\n', '\r\n'].flatMap(lineBreak => ['  ', '\t'].map(indentation => ({
		code: ['.card .title {', `${indentation}color: red;`, '}', '.card .body {', `${indentation}color: blue;`, '}'].join(lineBreak),
		output: [
			'.card {',
			`${indentation}.title {`,
			`${indentation.repeat(2)}color: red;`,
			`${indentation}}`,
			`${indentation}.body {`,
			`${indentation.repeat(2)}color: blue;`,
			`${indentation}}`,
			'}',
		].join(lineBreak),
	}))),
];

test({
	valid: [
		{code: cases[0].code},
		{code: cases[0].code, options: [{}]},
		{code: cases[0].code, options: [{checkSharedPrefixes: false}]},
		...[
			'a .title { color: red; } a .body { color: blue; }',
			'#card .title { color: red; } #card .body { color: blue; }',
			'[data-card] .title { color: red; } [data-card] .body { color: blue; }',
			'.card.active .title { color: red; } .card.disabled .body { color: blue; }',
			'.card.active { color: red; } .card.disabled { color: blue; }',
			'.card .title, .card .body { color: red; }',
			'.card .title, .card .body { color: red; } .card .footer { color: blue; }',
			'.card .title { color: red; } .card .body, .card .footer { color: blue; }',
			'.card > .title { color: red; } .card > .body { color: blue; }',
			'.card .title { color: red; } .card > .body { color: blue; }',
			'.card .title { color: red; } .other { color: green; } .card .body { color: blue; }',
			'.card .title { color: red; } @media (color) { .card .body { color: blue; } }',
			'@media (color) { .card .title { color: red; } } .card .body { color: blue; }',
			'.theme .card { color: red; } .other .card { color: blue; }',
			':is(.card, .panel) { color: red; }',
			':where(.card) .title { color: red; } :where(.card) .body { color: blue; }',
			'.card:scope .title { color: red; } .card:scope .body { color: blue; }',
			'.card:visited .title { color: red; } .card:visited .body { color: blue; }',
			'.outer { .card & .title { color: red; } .card & .body { color: blue; } }',
			'.outer { > .card .title { color: red; } > .card .body { color: blue; } }',
			'@scope (.outer) { .card .title { color: red; } .card .body { color: blue; } }',
			'@namespace url("https://example.com"); .card .title { color: red; } .card .body { color: blue; }',
		].map(code => ({code, options})),
	],
	invalid: [
		...cases.map(({code, output, errors = 1}) => ({
			code, output, options, errors,
		})),
		...[
			'@media (color) { .card .footer { /* keep */ } }',
			'.card .footer, .card .aside { /* keep */ }',
		].map(following => ({
			code: `.card .title {} .card .body {} ${following}`,
			output: `.card { .title {} .body {} } ${following}`,
			options,
			errors: [{messageId: 'prefer-nesting/related-rules'}],
		})),
		...[
			'.card .title { /* keep */ color: red; } .card .body { color: blue; }',
			'.card .title { color: red; } /* keep */ .card .body { color: blue; }',
			'.card .title {\n  color: red;\n}\n.card .body {\n\tcolor: blue;\n}',
			'.card .title {\n  --paint: red\n    blue;\n}\n.card .body {\n  color: red;\n}',
		].map(code => ({code, options, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
	],
});

nodeTest('shared prefix fixes converge without changing the default behavior', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/prefer-nesting': ['error', ...options]}};
	for (const {code, output} of cases) {
		assert.deepEqual(linter.verifyAndFix(code, config, {filename: 'test.css'}), {fixed: true, output, messages: []}, code);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
