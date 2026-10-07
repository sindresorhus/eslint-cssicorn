import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	{
		code: '.card { color: red; } .theme .active.card:hover { color: blue; }',
		output: '.card { color: red; .theme .active&:hover { color: blue; } }',
	},
	{
		code: '.card {} .theme .card .title { color: blue !important; & .body { color: green; } }',
		output: '.card { .theme & .title { color: blue !important; & .body { color: green; } } }',
	},
	{
		code: '.card {} .theme > .active.card:focus + .title { color: blue; }',
		output: '.card { .theme > .active&:focus + .title { color: blue; } }',
	},
	{
		code: '.card.active {} .theme .extra.card.active:hover { color: blue; }',
		output: '.card.active { .theme .extra&:hover { color: blue; } }',
	},
	{
		code: '.card:not(.disabled) {} .theme .active.card:not(.disabled):focus > .title { color: blue; }',
		output: '.card:not(.disabled) { .theme .active&:focus > .title { color: blue; } }',
	},
	{
		code: '[data-kind="CARD" i] {} .theme .active[data-kind="CARD" i]:focus .title { color: blue; }',
		output: '[data-kind="CARD" i] { .theme .active&:focus .title { color: blue; } }',
	},
	{
		code: String.raw`.c\61 rd {} .th\65 me .active.c\61 rd:HOVER .t\69 tle { color: blue; }`,
		output: String.raw`.c\61 rd { .th\65 me .active&:HOVER .t\69 tle { color: blue; } }`,
	},
	{
		code: String.raw`.card {} .theme .card    .t\69 tle { color: blue; }`,
		output: String.raw`.card { .theme &    .t\69 tle { color: blue; } }`,
	},
	{
		code: '.card {} .theme.card .card.title { color: blue; }',
		output: '.card { .theme& .card.title { color: blue; } }',
	},
	{
		code: '.card {} .theme .active.card:hover, .other > .card .title { color: blue; }',
		output: '.card { .theme .active&:hover, .other > & .title { color: blue; } }',
	},
	{
		code: '.card {} @media (color) { @layer theme { .theme .active.card:hover .title { color: blue; } } }',
		output: '.card { @media (color) { @layer theme { .theme .active&:hover .title { color: blue; } } } }',
	},
	{
		code: '.a, .b { color: red; } .theme .a:hover, .theme .b:hover { color: blue; }',
		output: '.a, .b { color: red; .theme &:hover { color: blue; } }',
	},
	{
		code: '.a, .b {} .theme .a:hover, .theme .b:hover, .other > .a.active, .other > .b.active { color: blue; }',
		output: '.a, .b { .theme &:hover, .other > &.active { color: blue; } }',
	},
	{
		code: '.a, .b {} .other > .b.active, .theme .a .title, .other > .a.active, .theme .b .title { color: blue; }',
		output: '.a, .b { .other > &.active, .theme & .title { color: blue; } }',
	},
	{
		code: '.a.active, .b.active {} .theme .extra.a.active:hover, .theme .extra.b.active:hover { color: blue; }',
		output: '.a.active, .b.active { .theme .extra&:hover { color: blue; } }',
		settledOutput: '.active { .a&, .b& { .theme .extra&:hover { color: blue; } } }',
	},
	{
		code: ':where(.a), :where(.b) {} .theme :where(.b) .title, .theme :where(.a) .title { color: blue; }',
		output: ':where(.a), :where(.b) { .theme & .title { color: blue; } }',
	},
	{
		code: '.a, .b {} @media (color) { .theme .b .title, .theme .a .title { color: blue !important; & .body { color: green; } } }',
		output: '.a, .b { @media (color) { .theme & .title { color: blue !important; & .body { color: green; } } } }',
	},
	...['link', 'defined', 'fullscreen', 'autofill', 'modal', 'popover-open'].map(pseudoClass => ({
		code: `.card:${pseudoClass} { color: red; } .card:${pseudoClass} .title { color: blue; }`,
		output: `.card:${pseudoClass} { color: red; & .title { color: blue; } }`,
	})),
	{
		code: 'a:LINK {} a:LINK:hover { color: blue; }',
		output: 'a:LINK { &:hover { color: blue; } }',
	},
	{
		code: String.raw`.card:\44 EFINED {} .card:\44 EFINED .title { color: blue; }`,
		output: String.raw`.card:\44 EFINED { & .title { color: blue; } }`,
	},
	{
		code: String.raw`.card:\50 OPOVER-OPEN {} .card:\50 OPOVER-OPEN:hover { color: blue; }`,
		output: String.raw`.card:\50 OPOVER-OPEN { &:hover { color: blue; } }`,
	},
	{
		code: '.outer { .card:modal {} .card:modal:hover { color: blue; } }',
		output: '.outer { .card:modal { &:hover { color: blue; } } }',
	},
	{
		code: '.card {\r\n  color: red;\r\n}\r\n.theme .active.card:hover .title {\r\n  color: blue;\r\n}',
		output: '.card {\r\n  color: red;\r\n  .theme .active&:hover .title {\r\n    color: blue;\r\n  }\r\n}',
	},
	{
		code: '.a, .b {\n  color: red;\n}\n.theme .a .title,\n.theme .b .title {\n  color: blue;\n}',
		output: '.a, .b {\n  color: red;\n  .theme & .title {\n    color: blue;\n  }\n}',
	},
];

test({
	valid: [
		'.outer { .card {} .theme .active.card:hover {} }',
		'.outer { .card {} .theme .card .title {} }',
		'.outer { .a, .b {} .theme .a:hover, .other .b:focus {} }',
		'.card {} .theme :not(.card).title {}',
		'.card {} .theme :has(.card) .title {}',
		'.card {} .theme .active.card:not(:unknown) {}',
		'.card {} .theme .activecard:hover {}',
		'.card:scope {} .theme .active.card:scope:hover {}',
		'.card:visited {} .card:visited:hover {}',
		'.card:unknown {} .card:unknown .title {}',
		'@scope (.outer) { .card {} .theme .active.card:hover {} }',
		'@namespace url("https://example.com"); .card {} .theme .active.card:hover {}',
		'.a, .b {} .theme .a.b:hover {}',
		'.a, .b {} .theme .a:hover, .other > .b.active {}',
		'.a, .b {} .theme .a .title, .theme .b .title, .other > .a.active {}',
		'.a, #b {} .theme .active.a:hover, .other .active#b:focus {}',
		'.card {} input:not([type=submit], [type=button], [type=reset]) .active.card:hover {}',
		'.card {} @supports (display: grid) { .theme .active.card:hover {} }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
		...[
			'.card {} .theme /* keep */ .active.card:hover { color: blue; }',
			'.card {} .theme .active.card:hover { color: blue; /* keep */ }',
			'.card { color: red } .theme .active.card:hover { color: blue; }',
			'.a, .b {} .theme .a:hover, .theme /* keep */ .b:hover { color: blue; }',
			'.card {\n  color: red;\n}\n.theme .active.card:hover {\n    color: blue;\n}',
		].map(code => ({code, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
	],
});

nodeTest('contextual parent fixes preserve syntax and converge with nesting rules', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: {
			'cssicorn/prefer-nesting': 'error',
			'cssicorn/no-nesting-with-mixed-specificity': 'error',
			'cssicorn/no-redundant-nested-style-rules': 'error',
			'cssicorn/no-declarations-after-nested-rules': 'error',
			'cssicorn/no-unscoped-nesting-selector': 'error',
		},
	};
	for (const {code, output, settledOutput = output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, settledOutput, code);
		assert.deepEqual(result.messages, [], code);
		assert.equal(linter.verifyAndFix(output, config, {filename: 'test.css'}).output, settledOutput, code);
		assert.deepEqual(linter.verifyAndFix(settledOutput, config, {filename: 'test.css'}), {fixed: false, output: settledOutput, messages: []}, code);
	}
});
