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
		output: `.outer, #missing { ${parent} { .title { color: blue; } } }`,
	})),
	{
		code: '.outer { .card:HAS(> &) {} .card:HAS(> &).active { color: blue; } }',
		output: '.outer { .card:HAS(> &) { &.active { color: blue; } } }',
	},
	{
		code: String.raw`.outer { .c\61 rd:not(&) {} .c\61 rd:not(&) > .t\69 tle { color: blue; } }`,
		output: String.raw`.outer { .c\61 rd:not(&) { > .t\69 tle { color: blue; } } }`,
	},
	{
		code: '.outer { .card:not(&) :is(.title, .body) { color: blue; } }',
		output: '.outer { .card:not(&) { .title, .body { color: blue; } } }',
		messageId: 'prefer-nesting',
	},
	{
		code: '.outer { .card:not(&) {} .card:not(&).active { color: blue !important; & .body { color: green; } } }',
		output: '.outer { .card:not(&) { &.active { color: blue !important; & .body { color: green; } } } }',
	},
	{
		code: '@media (color) { .outer { .card:has(> &) {} @layer theme { .card:has(> &) .title { color: blue; } } } }',
		output: '@media (color) { .outer { .card:has(> &) { @layer theme { .title { color: blue; } } } } }',
	},
	{
		code: '.outer { .card:has(> &) {} @media (color) { .card:has(> &) { color: blue; } } }',
		output: '.outer { .card:has(> &) { @media (color) { color: blue; } } }',
	},
	{
		code: '.outer, #missing { &&.card:where(&, .foo) {} &&.card:where(&, .foo).active { color: blue; } }',
		output: '.outer, #missing { &&.card:where(&, .foo) { &.active { color: blue; } } }',
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
			`${indentation.repeat(2)}.title {`,
			`${indentation.repeat(3)}color: blue;`,
			`${indentation.repeat(2)}}`,
			`${indentation}}`,
			'}',
		].join(lineBreak),
	}))),
];

test({
	valid: [
		'.outer { .page &.card {} .theme .page &.card {} }',
		'.outer { .card:has(> &:not(.disabled)) .title, .card:has(> &:not(.disabled)).active { color: blue; } }',
		'.outer { .card:is(&, :where(.foo))::before { content: "test"; } .card:is(&, :where(.foo))::after { content: "test"; } }',
		'.outer { .card:has(> &):is(.a, #missing) { color: blue; } }',
		'.outer { :is(&.a, .b).active { color: blue; } }',
		'.outer { :where(&.a, .b)::before { content: "test"; } }',
		'.outer { .card:where(&, .foo):where(.a, .b)::before { content: "test"; } }',
		'.outer { &.card {} .theme &.card .title { color: blue; } }',
		'.outer { div&.card {} body div&.card:hover { color: blue; } }',
		'.outer { &.a, &.b {} .theme &.b .title, .theme &.a .title { color: blue; } }',
		'.outer { .a:not(&), .b:not(&) {} .a:not(&) .title, .b:not(&) .title {} }',
		'.outer { .card:has(> &) {} .card:has(> &) & .title {} }',
		'.outer { .card:not(&.b) {} .card:not(&.b):has(> &) { color: blue; } }',
		'.outer { .card:is(&, .foo) .title, .card:is(&, .foo) & .body {} }',
		'.outer { .card:has(> &) {} .card:has(> &):is(.active, &.active) {} }',
		'.outer { .card:is(.active, :unknown(&)) {} .card:is(.active, :unknown(&)) .title {} }',
		'.outer { .card:unknown(&) {} .card:unknown(&) .title {} }',
		'.outer, #missing { .a:is(&, :where(.foo)), .b:where(&) {} .a:is(&, :where(.foo)) .title, .b:where(&) .title { color: blue; } } .outer.b .title { color: red; }',
		'.outer { .card {} .theme .card .title {} }',
		'.outer { &.card {} .theme & &.card .title {} }',
		'.outer { &.card {} .theme &.card & .title {} }',
		'.outer { &.card {} .theme &.card:has(> &) {} }',
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
		].map(code => ({code, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
	],
});

nodeTest('retained functional references reparse and converge with nesting rules', () => {
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
		assert.equal(result.output, output, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
