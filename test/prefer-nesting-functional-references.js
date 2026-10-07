import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	...[
		':not(&).card',
		'.card:has(> &)',
		'.card:is(&, .foo)',
		'.card:where(&, .foo)',
		'.card:nth-child(2n of &)',
		'.card:nth-last-child(2 of &.active)',
		':not(:where(&)).card',
	].map(parent => ({
		code: `.outer, #missing { ${parent} {} ${parent} .title { color: blue; } }`,
		output: `.outer, #missing { ${parent} { & .title { color: blue; } } }`,
	})),
	{
		code: '.outer { .card:HAS(> &) {} .card:HAS(> &).active { color: blue; } }',
		output: '.outer { .card:HAS(> &) { &.active { color: blue; } } }',
	},
	{
		code: String.raw`.outer { .c\61 rd:not(&) {} .c\61 rd:not(&) > .t\69 tle { color: blue; } }`,
		output: String.raw`.outer { .c\61 rd:not(&) { & > .t\69 tle { color: blue; } } }`,
	},
	{
		code: '.outer { .card:has(> &:not(.disabled)) .title, .card:has(> &:not(.disabled)).active { color: blue; } }',
		output: '.outer { .card:has(> &:not(.disabled)) { & .title, &.active { color: blue; } } }',
	},
	{
		code: '.outer { .card:is(&, :where(.foo))::before { content: "test"; } .card:is(&, :where(.foo))::after { content: "test"; } }',
		output: '.outer { .card:is(&, :where(.foo)) { &::before { content: "test"; } &::after { content: "test"; } } }',
	},
	{
		code: '.outer { .card:has(> &):is(.a, #missing) { color: blue; } }',
		output: '.outer { .card:has(> &) { &:is(.a, #missing) { color: blue; } } }',
		messageId: 'prefer-nesting',
	},
	{
		code: '.outer { :is(&.a, .b).active { color: blue; } }',
		output: '.outer { :is(&.a, .b) { &.active { color: blue; } } }',
		messageId: 'prefer-nesting',
	},
	{
		code: '.outer { :where(&.a, .b)::before { content: "test"; } }',
		output: '.outer { :where(&.a, .b) { &::before { content: "test"; } } }',
		messageId: 'prefer-nesting',
	},
	{
		code: '.outer { .card:not(&) :is(.title, .body) { color: blue; } }',
		output: '.outer { .card:not(&) { .title, .body { color: blue; } } }',
		messageId: 'prefer-nesting',
	},
	{
		code: '.outer { .card:where(&, .foo):where(.a, .b)::before { content: "test"; } }',
		output: '.outer { .card:where(&, .foo) { &:where(.a, .b)::before { content: "test"; } } }',
		messageId: 'prefer-nesting',
	},
	{
		code: '.outer { .card:not(&) {} .card:not(&).active { color: blue !important; & .body { color: green; } } }',
		output: '.outer { .card:not(&) { &.active { color: blue !important; & .body { color: green; } } } }',
	},
	{
		code: '@media (color) { .outer { .card:has(> &) {} @layer theme { .card:has(> &) .title { color: blue; } } } }',
		output: '@media (color) { .outer { .card:has(> &) { @layer theme { & .title { color: blue; } } } } }',
	},
	{
		code: '.outer { .card:has(> &) {} @media (color) { .card:has(> &) { color: blue; } } }',
		output: '.outer { .card:has(> &) { @media (color) { color: blue; } } }',
	},
	{
		code: '.outer { &.card {} .theme &.card .title { color: blue; } }',
		output: '.outer { &.card { .theme & .title { color: blue; } } }',
	},
	{
		code: '.outer { &.card {} .theme .active&.card:hover { color: blue; } }',
		output: '.outer { &.card { .theme .active&:hover { color: blue; } } }',
	},
	{
		code: '.outer, #missing { &&.card {} .theme > &&.card .title { color: blue !important; & .body { color: green; } } }',
		output: '.outer, #missing { &&.card { .theme > & .title { color: blue !important; & .body { color: green; } } } }',
	},
	{
		code: '.outer { .active& {} .theme + .active&::before { content: "test"; } }',
		output: '.outer { .active& { .theme + &::before { content: "test"; } } }',
	},
	{
		code: '.outer { div&.card {} body div&.card:hover { color: blue; } }',
		output: '.outer { div&.card { body &:hover { color: blue; } } }',
	},
	{
		code: '.outer { &.card& {} .theme &.card&.active { color: blue; } }',
		output: '.outer { &.card& { .theme &.active { color: blue; } } }',
	},
	{
		code: '.outer, #missing { &.card:is(&, .foo) {} .theme &.card:is(&, .foo) .title { color: blue; } }',
		output: '.outer, #missing { &.card:is(&, .foo) { .theme & .title { color: blue; } } }',
	},
	{
		code: '.outer, #missing { &&.card:where(&, .foo) {} &&.card:where(&, .foo).active { color: blue; } }',
		output: '.outer, #missing { &&.card:where(&, .foo) { &.active { color: blue; } } }',
	},
	{
		code: String.raw`.outer { &.c\61 rd {} .th\65 me &.c\61 rd .t\69 tle { color: blue; } }`,
		output: String.raw`.outer { &.c\61 rd { .th\65 me & .t\69 tle { color: blue; } } }`,
	},
	{
		code: '.outer { &.a, &.b {} .theme &.b .title, .theme &.a .title { color: blue; } }',
		output: '.outer { &.a, &.b { .theme & .title { color: blue; } } }',
	},
	{
		code: '.outer, #missing { &&.a, &&.b {} .theme &&.a:hover, .theme &&.b:hover, .other > &&.b .title, .other > &&.a .title { color: blue; } }',
		output: '.outer, #missing { &&.a, &&.b { .theme &:hover, .other > & .title { color: blue; } } }',
	},
	{
		code: '.outer { &.card {} @media (color) { @layer theme { .theme &.card .title { color: blue; } } } }',
		output: '.outer { &.card { @media (color) { @layer theme { .theme & .title { color: blue; } } } } }',
	},
	...['\n', '\r\n'].flatMap(lineBreak => ['  ', '\t'].map(indentation => ({
		code: [
			'.outer {',
			`${indentation}.card:has(> &) {`,
			`${indentation.repeat(2)}color: red;`,
			`${indentation}}`,
			`${indentation}.card:has(> &) .title {`,
			`${indentation.repeat(2)}color: blue;`,
			`${indentation}}`,
			'}',
		].join(lineBreak),
		output: [
			'.outer {',
			`${indentation}.card:has(> &) {`,
			`${indentation.repeat(2)}color: red;`,
			`${indentation.repeat(2)}& .title {`,
			`${indentation.repeat(3)}color: blue;`,
			`${indentation.repeat(2)}}`,
			`${indentation}}`,
			'}',
		].join(lineBreak),
	}))),
	{
		code: '.outer {\r\n  &.card {\r\n    color: red;\r\n  }\r\n  .theme &.card .title {\r\n    color: blue;\r\n  }\r\n}',
		output: '.outer {\r\n  &.card {\r\n    color: red;\r\n    .theme & .title {\r\n      color: blue;\r\n    }\r\n  }\r\n}',
	},
];

test({
	valid: [
		'.outer { .card:has(> &) {} .card:has(> &) & .title {} }',
		'.outer { .card:not(&.b) {} .card:not(&.b):has(> &) { color: blue; } }',
		'.outer { .card:is(&, .foo) .title, .card:is(&, .foo) & .body {} }',
		'.outer { .card:has(> &) {} .card:has(> &):is(.active, &.active) {} }',
		'.outer { .card:is(.active, :unknown(&)) {} .card:is(.active, :unknown(&)) .title {} }',
		'.outer { .card:unknown(&) {} .card:unknown(&) .title {} }',
		'.outer { .card:has(> &) {} .theme .card:has(> &) {} }',
		'.outer { .a:not(&), .b:not(&) {} .a:not(&) .title, .b:not(&) .title {} }',
		'.outer, #missing { .a:is(&, :where(.foo)), .b:where(&) {} .a:is(&, :where(.foo)) .title, .b:where(&) .title { color: blue; } } .outer.b .title { color: red; }',
		'.outer { .card {} .theme .card .title {} }',
		'.outer { &.card {} .theme & &.card .title {} }',
		'.outer { &.card {} .theme &.card & .title {} }',
		'.outer { &.card {} .theme &.card:has(> &) {} }',
		'.outer { .page &.card {} .theme .page &.card {} }',
		'.outer { &.card {} body .theme &.card {} }',
		'.outer { & {} .theme & .title {} }',
		'.outer { &.a, &&.b {} .theme &.a .title, .theme &&.b .title {} }',
		'.outer { &.a, &.b {} .theme &.a .title {} }',
		'.outer { &.a, &.b {} .theme &.a .title, .other &.b .body {} }',
		'@scope (.outer) { .card:has(> &) {} .card:has(> &) .title {} }',
		'@scope (.outer) { .outer { &.card {} .theme &.card {} } }',
		'@namespace url("https://example.com"); .outer { .card:has(> &) {} .card:has(> &) .title {} }',
		'@namespace url("https://example.com"); .outer { &.card {} .theme &.card {} }',
	],
	invalid: [
		...cases.map(({code, output, messageId = 'prefer-nesting/related-rules'}) => ({code, output, errors: [{messageId}]})),
		...[
			'.outer { .card:has(> &) {} /* keep */ .card:has(> &) .title {} }',
			'.outer { .card:has(> /* keep */ &) {} .card:has(> /* keep */ &) .title {} }',
			'.outer { .card:has(> &) {} .card:has(> &) .title { color: blue; /* keep */ } }',
			'.outer { &.card {} .theme /* keep */ &.card .title {} }',
			'.outer { &.card { color: red } .theme &.card .title {} }',
		].map(code => ({code, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
	],
});

nodeTest('retained functional references and explicit contexts reparse and converge with nesting rules', () => {
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
