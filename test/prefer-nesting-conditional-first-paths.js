import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	...['media (color)', 'supports (display: grid)', 'container (width > 200px)', 'starting-style', 'layer theme', 'layer'].map(atRule => ({
		code: `@${atRule} { .card::before { content: "test"; color: red; } } @media (width > 600px) { .card::before { color: blue; } }`,
		output: `.card::before { @${atRule} { content: "test"; color: red; } @media (width > 600px) { color: blue; } }`,
	})),
	{
		code: '@media (color) { h1, .h1 { font-size: 2rem; } } @layer theme { h1, .h1 { font-size: 3rem; } }',
		output: 'h1, .h1 { @media (color) { font-size: 2rem; } @layer theme { font-size: 3rem; } }',
	},
	{
		code: '@media (color) { .card, #other::before { color: red; } } @supports (display: grid) { .card, #other::before { color: blue !important; } }',
		output: '.card, #other::before { @media (color) { color: red; } @supports (display: grid) { color: blue !important; } }',
	},
	{
		code: '.outer, #outer { @media (color) { &::before { color: red; } } @layer theme { &::before { color: blue; } } }',
		output: '.outer, #outer { &::before { @media (color) { color: red; } @layer theme { color: blue; } } }',
	},
	{
		code: '.outer, #outer { @media (color) { &.card, :where(&).other { color: red; } } @layer theme { &.card, :where(&).other { color: blue; } } }',
		output: '.outer, #outer { &.card, :where(&).other { @media (color) { color: red; } @layer theme { color: blue; } } }',
	},
	{
		code: String.raw`@m\65 dia (color) { .c\61 rd::BEFORE { color: red; } } @LAYER theme { .c\61 rd::BEFORE { color: blue; } }`,
		output: String.raw`.c\61 rd::BEFORE { @m\65 dia (color) { color: red; } @LAYER theme { color: blue; } }`,
	},
	{
		code: '@media (color) { @supports (display: grid) { .card::before { color: red; } } } @layer theme { @media (width > 0px) { .card::before { color: blue; } } }',
		output: '.card::before { @media (color) { @supports (display: grid) { color: red; } } @layer theme { @media (width > 0px) { color: blue; } } }',
	},
	{
		code: '@media (color) { .card::before { color: red } } @layer theme { .card::before { color: blue } }',
		output: '.card::before { @media (color) { color: red } @layer theme { color: blue } }',
	},
	{
		code: '@media (color) { .card.active { color: red; } .theme .card { color: blue; } } .card .title { color: green; }',
		output: '.card { @media (color) { &.active { color: red; } .theme & { color: blue; } } & .title { color: green; } }',
	},
	{
		code: '@layer { .theme .card { color: red !important; } .card.active { color: blue !important; } } @layer { .card { color: green !important; } }',
		output: '.card { @layer { .theme & { color: red !important; } &.active { color: blue !important; } } @layer { color: green !important; } }',
	},
	{
		code: '@layer second, first; @layer first { .card.active { color: red; } .theme .card { color: blue; } } @layer second { .card { color: green; } }',
		output: '@layer second, first; .card { @layer first { &.active { color: red; } .theme & { color: blue; } } @layer second { color: green; } }',
	},
	{
		code: '@media (color) { .card.active { color: red; & .body { color: purple; } } @layer theme { .theme .card { color: blue; } } } .card .title { color: green; }',
		output: '.card { @media (color) { &.active { color: red; & .body { color: purple; } } @layer theme { .theme & { color: blue; } } } & .title { color: green; } }',
	},
	{
		code: '@media (color) { @layer theme { .card.active { color: red; } .theme .card { color: blue; } } } .card .title { color: green; }',
		output: '.card { @media (color) { @layer theme { &.active { color: red; } .theme & { color: blue; } } } & .title { color: green; } }',
	},
	{
		code: '@media (color) { .a.active, .b.active { color: red; } .theme .a, .theme .b { color: blue; } } @layer theme { .a, .b { color: green; } }',
		output: '.a, .b { @media (color) { &.active { color: red; } .theme & { color: blue; } } @layer theme { color: green; } }',
	},
	{
		code: '.outer, #outer { @media (color) { &.card.active { color: red; } .theme &.card { color: blue; } } @layer theme { &.card { color: green; } } }',
		output: '.outer, #outer { &.card { @media (color) { &.active { color: red; } .theme & { color: blue; } } @layer theme { color: green; } } }',
	},
	{
		code: '@media (color) { .card.active { color: red } .theme .card { color: blue } } .card .title { color: green }',
		output: '.card { @media (color) { &.active { color: red } .theme & { color: blue } } & .title { color: green } }',
	},
	...['\n', '\r\n'].flatMap(lineBreak => ['\t', '  '].flatMap(indentation => [
		{
			code: [
				'@media (color) {',
				`${indentation}.card::before {`,
				`${indentation}${indentation}color: red;`,
				`${indentation}}`,
				'}',
				'@layer theme {',
				`${indentation}.card::before {`,
				`${indentation}${indentation}color: blue;`,
				`${indentation}}`,
				'}',
			].join(lineBreak),
			output: [
				'.card::before {',
				`${indentation}@media (color) {`,
				`${indentation}${indentation}color: red;`,
				`${indentation}}`,
				`${indentation}@layer theme {`,
				`${indentation}${indentation}color: blue;`,
				`${indentation}}`,
				'}',
			].join(lineBreak),
		},
		{
			code: [
				'@media (color) {',
				`${indentation}.card.active {`,
				`${indentation}${indentation}color: red;`,
				`${indentation}}`,
				`${indentation}.theme .card {`,
				`${indentation}${indentation}color: blue;`,
				`${indentation}}`,
				'}',
				'.card .title {',
				`${indentation}color: green;`,
				'}',
			].join(lineBreak),
			output: [
				'.card {',
				`${indentation}@media (color) {`,
				`${indentation}${indentation}&.active {`,
				`${indentation}${indentation}${indentation}color: red;`,
				`${indentation}${indentation}}`,
				`${indentation}${indentation}.theme & {`,
				`${indentation}${indentation}${indentation}color: blue;`,
				`${indentation}${indentation}}`,
				`${indentation}}`,
				`${indentation}& .title {`,
				`${indentation}${indentation}color: green;`,
				`${indentation}}`,
				'}',
			].join(lineBreak),
		},
	])),
];

test({
	valid: [
		'@media (color) { .card, #other { color: red; } } @media (width > 0px) { .card.active, #other:focus { color: blue; } }',
		'@media (color) { .card::before { color: red; } } @layer theme { .card::before { & .title { color: blue; } } }',
		'@media (color) { .card, #other { color: red; } } @layer theme { .card, #other { & .title { color: blue; } } }',
		'@media (color) { .card, #other { color: red; } } @layer theme { #other, .card { color: blue; } }',
		'@media (color) { .card.active { color: red; } .other { color: blue; } } .card .title { color: green; }',
		'@media (color) { .card.active { color: red; } @font-face { font-family: test; src: url(test.woff2); } } .card .title { color: green; }',
		'@media (color) { .card:unknown.active { color: red; } .theme .card { color: blue; } } .card .title { color: green; }',
		'@media (color) { .unrelated { color: red; } .card.active { color: blue; } } .card .title { color: green; }',
		'@media (color) { .card.active { color: red; } .theme .card { color: blue; } } @supports (display: grid) { .card .title { color: green; } }',
		'@container (width > 200px) { .card.active { color: red; } .theme .card { color: blue; } } .card .title { color: green; }',
		'@starting-style { .card.active { color: red; } .theme .card { color: blue; } } .card .title { color: green; }',
		'.outer { @media (color) { .theme .card.active { color: red; } .card:hover { color: blue; } } .card .title { color: green; } }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
		...[
			'@media (color) { .card::before { color: red; } } /* keep */ @layer theme { .card::before { color: blue; } }',
			'@media (color) { .card::before { color: red; /* keep */ } } @layer theme { .card::before { color: blue; } }',
			'@media (color) { .card::before { content: "a\\\nb"; } } @layer theme { .card::before { color: blue; } }',
			'@media (color) {\n\t.card::before {\n\t\t--paint: red\n\t\t\tblue;\n\t}\n}\n@layer theme {\n\t.card::before {\n\t\tcolor: blue;\n\t}\n}',
			'@media (color) {\n\t.card::before {\ncolor: red;\n\t}\n}\n@layer theme {\n\t.card::before {\n\t\tcolor: blue;\n\t}\n}',
			'@media (color) { .card.active { color: red; } .theme .card { color: blue; /* keep */ } } .card .title { color: green; }',
		].map(code => ({code, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
	],
});

nodeTest('first-path conditional fixes preserve order and converge with nesting rules', () => {
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
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		const originalMessages = linter.verify(code, config, {filename: 'test.css'});
		const originalWarnings = new Set(originalMessages.map(message => message.ruleId));
		assert.deepEqual(result.messages.filter(message => message.fatal || !originalWarnings.has(message.ruleId)), [], code);
		for (const ruleId of originalWarnings) {
			assert.ok(result.messages.filter(message => message.ruleId === ruleId).length <= originalMessages.filter(message => message.ruleId === ruleId).length, code);
		}

		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: result.messages}, code);
	}
});
