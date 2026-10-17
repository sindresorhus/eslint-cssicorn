import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	{
		code: 'h1, .h1 { font-size: calc(1.375rem + 1.5vw); } @media (width > 1200px) { h1, .h1 { font-size: 2.5rem; } }',
		output: 'h1, .h1 { font-size: calc(1.375rem + 1.5vw); @media (width > 1200px) { font-size: 2.5rem; } }',
	},
	{
		code: '.accordion-button { &::after { content: ""; transition: transform 200ms; } @media (prefers-reduced-motion: reduce) { &::after { transition: none; } } }',
		output: '.accordion-button { &::after { content: ""; transition: transform 200ms; @media (prefers-reduced-motion: reduce) { transition: none; } } }',
	},
	...['supports (display: grid)', 'container (width > 200px)', 'starting-style', 'layer theme'].map(atRule => ({
		code: `.card::before { content: "test"; color: red; } @${atRule} { .card::before { color: blue !important; } }`,
		output: `.card::before { content: "test"; color: red; @${atRule} { color: blue !important; } }`,
	})),
	{
		code: '.card, #other { color: red; } @supports (display: grid) { .card, #other { color: blue; } } @media (color) { .card, #other { color: green; } }',
		output: '.card, #other { color: red; @supports (display: grid) { color: blue; } @media (color) { color: green; } }',
	},
	{
		code: '.card, #other::before { color: red; } @media (color) { .card, #other::before { color: blue; } }',
		output: '.card, #other::before { color: red; @media (color) { color: blue; } }',
	},
	{
		code: '.card::before { color: red; } @media (color) { @supports (display: grid) { .card::before { color: blue; } } }',
		output: '.card::before { color: red; @media (color) { @supports (display: grid) { color: blue; } } }',
	},
	{
		code: String.raw`.c\61 rd::BEFORE { color: red; } @MEDIA (color) { .c\61 rd::BEFORE { color: blue; } }`,
		output: String.raw`.c\61 rd::BEFORE { color: red; @MEDIA (color) { color: blue; } }`,
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: `h1, .h1 {${lineBreak}  font-size: 2rem;${lineBreak}}${lineBreak}@media (color) {${lineBreak}  h1, .h1 {${lineBreak}    font-size: 3rem;${lineBreak}  }${lineBreak}}`,
		output: `h1, .h1 {${lineBreak}  font-size: 2rem;${lineBreak}  @media (color) {${lineBreak}    font-size: 3rem;${lineBreak}  }${lineBreak}}`,
	})),
];

test({
	valid: [
		'.card > .title { color: blue; } @media (width > 600px) { .card { color: red; } }',
		'.card.active {} /* keep */ @media (color) { .card { color: red; } }',
		'.a .title {} @media (color) { .a, .b {} }',
		'.a .title, .b .body {} @media (color) { .a, .b {} }',
		'.a.b.active {} @media (color) { .a, .b {} }',
		'.outer { .a .title, #b .title {} @media (color) { .a, #b {} } }',
		'.card.active {} @media (color) { .card {} .unrelated {} }',
		'.card.active {} @media (color) { @font-face { font-family: test; src: url(test.woff2); } .card {} }',
		'.outer { .theme .card.active {} @media (color) { .card {} } }',
		'@supports (display: grid) { .card.active {} } @media (color) { .card {} }',
		'@scope (.outer) { .card.active {} @media (color) { .card {} } }',
		'@namespace url("https://example.com"); .card.active {} @media (color) { .card {} }',
		'.card:unknown.active {} @media (color) { .card:unknown {} }',
		'.card.active {} .card {}',
		'@media (color) { .card.active {} } .card {}',
		'.card::before {} @media (color) { .other::after {} }',
		'.card::before {} @media (color) { .card::before { & .title {} } }',
		'.card, #other {} @media (color) { .card, #other { & .title {} } }',
		'.card, #other {} @media (color) { .card, #other { @layer theme { color: red; } } }',
		'@scope (.outer) { .card::before {} @media (color) { .card::before {} } }',
		'@namespace url("https://example.com"); .card::before {} @media (color) { .card::before {} }',
		'.card:unknown::before {} @media (color) { .card:unknown::before {} }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
		...[
			'.card::before { color: red; /* keep */ } @media (color) { .card::before { color: blue; } }',
			'.card::before { color: red } @media (color) { .card::before { color: blue; } }',
			'.card::before {\n  color: red;\n}\n@media (color) {\n  .card::before {\n  color: blue;\n  }\n}',
			'.card::before {\n\tcolor: red;\n}\n@media (color) {\n\t.card::before {\n\t\t--paint: red\n\t\t\tblue;\n\t}\n}',
			'.card::before { color: red; } @media (color) { .card::before { content: "a\\\nb"; } }',
		].map(code => ({code, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
	],
});

nodeTest('conditional parent fixes preserve source order and converge without new nesting warnings', () => {
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
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
