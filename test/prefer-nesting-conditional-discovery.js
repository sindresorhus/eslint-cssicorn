import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	{
		code: '@media (width > 600px) { .card .title { color: blue; } } @media (width > 900px) { .card .body { color: green; } }',
		output: '.card { @media (width > 600px) { & .title { color: blue; } } @media (width > 900px) { & .body { color: green; } } }',
	},
	{
		code: '@media (color) { .card { color: red; } } .card .title { color: blue; }',
		output: '.card { @media (color) { color: red; } & .title { color: blue; } }',
	},
	{
		code: '@layer { .card.small { color: red !important; } } @layer { .card.large { color: blue !important; } }',
		output: '.card { @layer { &.small { color: red !important; } } @layer { &.large { color: blue !important; } } }',
	},
	{
		code: '@media (color) { @layer theme { .card.small { color: red; } } } @layer theme { @media (width > 0px) { .card.large { color: blue; } } }',
		output: '.card { @media (color) { @layer theme { &.small { color: red; } } } @layer theme { @media (width > 0px) { &.large { color: blue; } } } }',
	},
	...['supports (display: grid)', 'container (width > 0px)', 'starting-style'].map(atRule => ({
		code: `@${atRule} { .card { color: red; } } .card:hover { color: blue; }`,
		output: `.card { @${atRule} { color: red; } &:hover { color: blue; } }`,
	})),
	{
		code: '@supports (display: grid) { @media (color) { .card { color: red; } } } .card .title { color: blue; }',
		output: '.card { @supports (display: grid) { @media (color) { color: red; } } & .title { color: blue; } }',
	},
	{
		code: '@media (color) { .a, .b { color: red; } } .b .title, .a .title { color: blue; }',
		output: '.a, .b { @media (color) { color: red; } & .title { color: blue; } }',
	},
	{
		code: '@media (color) { .card .title { color: red; & > .body { color: blue; } } } .card .body { color: green; }',
		output: '.card { @media (color) { & .title { color: red; & > .body { color: blue; } } } & .body { color: green; } }',
	},
	{
		code: '.outer, #outer { @media (color) { & .card.small { color: red; } } @layer theme { & .card.large { color: blue; } } }',
		output: '.outer, #outer { & .card { @media (color) { &.small { color: red; } } @layer theme { &.large { color: blue; } } } }',
	},
	{
		code: '@media (color) { .card.small { color: red; } } @layer theme { .card.large { color: blue; } } .card.active { color: green; }',
		output: '.card { @media (color) { &.small { color: red; } } @layer theme { &.large { color: blue; } } &.active { color: green; } }',
	},
	{
		code: String.raw`@m\65 dia (color) { .c\61 rd.small { color: red; } } @LAYER theme { .c\61 rd.large { color: blue; } }`,
		output: String.raw`.c\61 rd { @m\65 dia (color) { &.small { color: red; } } @LAYER theme { &.large { color: blue; } } }`,
	},
	{
		code: '@media (color) { .card { color: red; } } .theme .card.active { color: blue; }',
		output: '.card { @media (color) { color: red; } .theme &.active { color: blue; } }',
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: [
			'@media (color) {',
			'  .card {',
			'    color: red;',
			'  }',
			'}',
			'',
			'.card:hover {',
			'  color: blue;',
			'}',
		].join(lineBreak),
		output: [
			'.card {',
			'  @media (color) {',
			'    color: red;',
			'  }',
			'  &:hover {',
			'    color: blue;',
			'  }',
			'}',
		].join(lineBreak),
	})),
	{
		code: '@media (color) {\n\t.card.small {\n\t\tcolor: red;\n\t}\n}\n@layer theme {\n\t.card.large {\n\t\tcolor: blue;\n\t}\n}',
		output: '.card {\n\t@media (color) {\n\t\t&.small {\n\t\t\tcolor: red;\n\t\t}\n\t}\n\t@layer theme {\n\t\t&.large {\n\t\t\tcolor: blue;\n\t\t}\n\t}\n}',
	},
];

test({
	valid: [
		'@media (color) { .card { color: red; } } .card { color: blue; }',
		'@media (color) { .card { color: red; } } .card, .card { color: blue; }',
		'@media (color) { .card.small {} } .unrelated {} .card.large {}',
		'@media (color) { .card.small {} } @font-face { font-family: example; src: url(example.woff2); } @layer theme { .card.large {} }',
		'@scope (.outer) { @media (color) { .card.small {} } @layer theme { .card.large {} } }',
		'@namespace url("https://example.com"); @media (color) { .card.small {} } @layer theme { .card.large {} }',
		'@supports (display: grid) { .card.small {} } @media (color) { .card.large {} }',
		'@container (width > 0px) { .card.small {} } .card.large {}',
		'@starting-style { .card.small {} } .card.large {}',
		'@media (color) { @supports (display: grid) { .card.small {} } } .card.large {}',
		'@supports (display: grid) { .card { & .title {} } } .card:hover {}',
		'@media (color) { .a, .b {} } .a .title {}',
		'.outer { @media (color) { .a, #b {} } .a .title, #b .title {} }',
		'.outer { @media (color) { .a, .b {} } .a .title, .b .title, .a.active {} }',
		'.outer { @media (color) { & .card.small {} } & .card & .large {} }',
		'.outer { @media (color) { .card {} } .theme .card.active {} }',
		'@media (color) { .card:unknown.small {} } @layer theme { .card:unknown.large {} }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: 1})),
		...[
			'@media (color) { .card.small { color: red; } } /* keep */ @layer theme { .card.large { color: blue; } }',
			'@media (color) { .card { color: red; /* keep */ } } .card:hover { color: blue; }',
			'@media (color) {\n  .card {\n  color: red;\n  }\n}\n.card:hover {\n  color: blue;\n}',
			'@media (color) {\n\t.card.small {\n\t\t--paint: red\n\t\t\tblue;\n\t}\n}\n@layer theme {\n\t.card.large {\n\t\tcolor: green;\n\t}\n}',
			'@media (color) { .card.small { content: "a\\\nb"; } } @layer theme { .card.large { color: blue; } }',
		].map(code => ({code, errors: 1})),
	],
});

nodeTest('conditional discovery fixes reparse and converge without new nesting warnings', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: {
			'cssicorn/prefer-nesting': 'error',
			'cssicorn/no-useless-is': 'error',
			'cssicorn/no-redundant-nested-style-rules': 'error',
			'cssicorn/no-declarations-after-nested-rules': 'error',
			'cssicorn/no-unscoped-nesting-selector': 'error',
		},
	};
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
