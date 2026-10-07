import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	{
		code: '.card .title, .card .subtitle { color: blue; } .card .body, .card .footer { color: green; }',
		output: '.card { & .title, & .subtitle { color: blue; } & .body, & .footer { color: green; } }',
	},
	{
		code: '.card .title, .card .subtitle { color: blue; } .card .body { color: green; }',
		output: '.card { & .title, & .subtitle { color: blue; } & .body { color: green; } }',
	},
	{
		code: '.card:hover { color: blue; } .card:focus, .card:active { color: green; }',
		output: '.card { &:hover { color: blue; } &:focus, &:active { color: green; } }',
	},
	{
		code: '.btn:hover { text-decoration: none; } .btn:disabled, .btn.disabled, .btn[aria-disabled=true] { cursor: default; }',
		output: '.btn { &:hover { text-decoration: none; } &:disabled, &.disabled, &[aria-disabled=true] { cursor: default; } }',
	},
	{
		code: '.form-group .form-control.short { width: 250px; } .form-group .form-control.input-block, .form-group .form-control.long { width: 100%; }',
		output: '.form-group .form-control { &.short { width: 250px; } &.input-block, &.long { width: 100%; } }',
	},
	{
		code: '.card .title, .card .subtitle { color: blue !important; & .body { color: orange; } } .card .footer { --text: "a & b"; color: green !important; }',
		output: '.card { & .title, & .subtitle { color: blue !important; & .body { color: orange; } } & .footer { --text: "a & b"; color: green !important; } }',
	},
	{
		code: String.raw`.c\61 rd .t\69 tle, .c\61 rd .subtitle { color: blue; } .c\61 rd:HOVER { color: green; }`,
		output: String.raw`.c\61 rd { & .t\69 tle, & .subtitle { color: blue; } &:HOVER { color: green; } }`,
	},
	{
		code: '.a .title, .b .title { color: blue; } .b .body, .a .body { color: green; }',
		output: '.a, .b { & .title { color: blue; } & .body { color: green; } }',
	},
	{
		code: '.b .title, .a .title, .b .subtitle, .a .subtitle { color: blue; } .a .body, .b .body { color: green; }',
		output: '.b, .a { & .title, & .subtitle { color: blue; } & .body { color: green; } }',
	},
	{
		code: 'thead > th, tfoot > th { text-align: left; } thead > td, tfoot > td { text-align: right; }',
		output: 'thead, tfoot { & > th { text-align: left; } & > td { text-align: right; } }',
	},
	{
		code: '.a .title::before, .b .title::before { content: "title"; } .a .body::after, .b .body::after { content: "body"; }',
		output: '.a, .b { & .title::before { content: "title"; } & .body::after { content: "body"; } }',
	},
	{
		code: '.outer, #missing { &.a .title, &.b .title { color: blue; } &.a .body, &.b .body { color: green; } }',
		output: '.outer, #missing { &.a, &.b { & .title { color: blue; } & .body { color: green; } } }',
	},
	{
		code: '.outer { .a&& .title, .b&& .title { color: blue; } .a&& .body, .b&& .body { color: green; } }',
		output: '.outer { .a&&, .b&& { & .title { color: blue; } & .body { color: green; } } }',
	},
	{
		code: '.card .title, .card .subtitle { color: blue; } @media (color) { .card .body { color: green; } }',
		output: '.card { & .title, & .subtitle { color: blue; } @media (color) { & .body { color: green; } } }',
	},
	{
		code: '@layer theme { .card .title, .card .subtitle { color: blue; } } .card .body { color: green; }',
		output: '.card { @layer theme { & .title, & .subtitle { color: blue; } } & .body { color: green; } }',
	},
	{
		code: '@media (color) { .a .title, .b .title { color: blue; } } @layer theme { .a .body, .b .body { color: green; } }',
		output: '.a, .b { @media (color) { & .title { color: blue; } } @layer theme { & .body { color: green; } } }',
	},
	...['\n', '\r\n'].flatMap(lineBreak => ['\t', '  '].map(indentation => ({
		code: [
			'.card .title, .card .subtitle {',
			`${indentation}color: blue;`,
			'}',
			'.card .body {',
			`${indentation}color: green;`,
			'}',
		].join(lineBreak),
		output: [
			'.card {',
			`${indentation}& .title, & .subtitle {`,
			`${indentation}${indentation}color: blue;`,
			`${indentation}}`,
			`${indentation}& .body {`,
			`${indentation}${indentation}color: green;`,
			`${indentation}}`,
			'}',
		].join(lineBreak),
	}))),
];

test({
	valid: [
		'.outer, #missing { .a .title, &&.b .title {} .a .body, &&.b .body {} }',
		'.outer { .a:has(> &) .title, .b:has(> &) .title {} .a:has(> &) .body, .b:has(> &) .body {} }',
		'.card:unknown .title, .card:unknown .subtitle {} .card:unknown .body {}',
		'.card:state(active) .title, .card:state(active) .subtitle {} .card:state(active) .body {}',
		'@scope (.card) { .card .title, .card .subtitle {} .card .body {} }',
		'@namespace url("https://example.com"); .card .title, .card .subtitle {} .card .body {}',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
		...[
			'.card .title, .card .subtitle {} /* keep */ .card .body {}',
			'.card .title, .card .subtitle { color: blue; /* keep */ } .card .body {}',
			'.a .title, .b .title {} .a /* keep */ .body, .b .body {}',
			'.card .title, .card .subtitle {\ncolor: blue;\n}\n.card .body {\ncolor: green;\n}',
			'.card .title, .card .subtitle {\n  color: blue;\n}\n.card .body {\n\tcolor: green;\n}',
			'.card .title, .card .subtitle { --text: "a\\\nb"; } .card .body {}',
		].map(code => ({code, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
	],
});

nodeTest('adjacent list fixes converge without new nesting warnings', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: Object.fromEntries([
			'prefer-nesting',
			'no-nesting-with-mixed-specificity',
			'no-redundant-nested-style-rules',
			'no-declarations-after-nested-rules',
			'no-unscoped-nesting-selector',
		].map(name => [`cssicorn/${name}`, 'error'])),
	};
	for (const {code, output} of cases) {
		const expected = linter.verifyAndFix(output, config, {filename: 'test.css'});
		assert.deepEqual(expected.messages.filter(message => message.ruleId !== 'cssicorn/no-nesting-with-mixed-specificity'), [], output);
		const originalWarnings = linter.verify(code, config, {filename: 'test.css'}).filter(message => message.ruleId === 'cssicorn/no-nesting-with-mixed-specificity');
		assert.deepEqual(new Set(expected.messages.map(message => message.messageId)), new Set(originalWarnings.map(message => message.messageId)), code);
		assert.ok(expected.messages.length <= originalWarnings.length, code);
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, expected.output, code);
		assert.deepEqual(result.messages, expected.messages, code);
		assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {fixed: false, output: result.output, messages: expected.messages}, code);
	}
});

nodeTest('adjacent list discovery retains existing coverage and parser boundaries', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/prefer-nesting': 'error'}};
	const cases = [
		{
			code: '.a .title, .b .title {} .a .body {}',
			output: '.title { .a &, .b & {} } .a .body {}',
		},
		{
			code: '.a .title, #b .title {} .a .body, #b .body {}',
			output: '.title { .a &, #b & {} } .body { .a &, #b & {} }',
		},
		{
			code: '.a .title, .b .title {} .a.b .body {}',
			output: '.title { .a &, .b & {} } .a.b .body {}',
		},
		{
			code: '.card .title, .card .subtitle {} @supports (display: grid) { .card .body {} }',
			output: '.card { & .title, & .subtitle {} } @supports (display: grid) { .card .body {} }',
		},
		{
			code: '.card .title, .card .subtitle {} .unrelated {} .card .body {}',
			output: '.card { & .title, & .subtitle {} } .unrelated {} .card .body {}',
		},
	];
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		assert.deepEqual(result.messages, [], code);
	}
});
