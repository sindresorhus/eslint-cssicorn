import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import css from '@eslint/css';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { color: red; }',
		'a { padding-top: 56.25%; }',
		...['auto', '10px', '0%', 'calc(0px)', 'var(--height)', '0deg', '0unknown'].map(height => `a { height: ${height}; padding-top: 56.25%; }`),
		...[
			'0%',
			'-50%',
			'50px',
			'"50%"',
			'url("50%")',
			'50% 0',
			'(50%)',
			'var(--ratio)',
			'env(ratio)',
			'min(50%, 75%)',
			'calc(100% * var(--ratio))',
			'calc(50% + 10px)',
			'calc(50% + 0px)',
			'calc(50% + 1)',
			'calc(50% - 50%)',
			'calc(50% - 75%)',
			'calc(50% - 25% * 3)',
			'calc(50% - 25% - 25%)',
			'calc(-50%)',
			'calc(50% * 0)',
			'calc(50% / 0)',
			'calc(50% / (1 - 1))',
			'calc(50% / (4 / 2 / 2 - 1))',
			'calc(50% / 25%)',
			'calc(50% * 25%)',
			'calc(50% * infinity)',
			'calc(50% * pi)',
			'calc(50% * 1e999)',
			'calc(50% * (1e308 * 1e308))',
			'calc(50% +)',
			'calc(50% 25%)',
			'calc()',
		].map(value => `a { height: 0; padding-top: ${value}; }`),
		'a { height: 0; padding-left: 50%; padding-right: 50%; }',
		'a { height: 0; --padding-top: 50%; }',
		...['50%', '50% 10px', '50% 0 10px', '50% 0 0 10%', '50% 0 0 0 0', '0 0 0 0', '50% 0deg'].map(value => `a { height: 0; padding: ${value}; }`),
		'a { height: 0; padding: 50% calc(0%); }',
		'a { height: 0; padding: calc(-25%) 0 50%; }',
		'a { height: 0; height: auto; padding-top: 50%; }',
		'a { height: 0; HEIGHT: 0 !important; padding-top: 50%; }',
		'a { height: 0; padding-top: 50%; padding-top: 0; }',
		'a { height: 0; padding-bottom: 50%; padding-bottom: 50%; }',
		'a { height: 0; padding: 50% 0; padding: 25% 0; }',
		'a { height: 0; padding: 50% 0; padding-top: 50%; }',
		'a { height: 0; padding-bottom: 50%; padding: 0; }',
		...[
			'aspect-ratio: auto',
			'ASPECT-RATIO: 2 / 1',
			'all: revert',
			'padding-block: 0',
			'padding-inline: 0',
			'padding-block-start: 0',
			'padding-block-end: 0',
			'padding-inline-start: 0',
			'padding-inline-end: 0',
		].map(declaration => `a { height: 0; padding-top: 50%; ${declaration}; }`),
		'a { height: 0; } a { padding-top: 50%; }',
		'a { height: 0; & .child { padding-top: 50%; } }',
		'a { height: 0; @media (width > 10px) { padding-top: 50%; } }',
		'@supports not (aspect-ratio: 1 / 1) { a { height: 0; padding-top: 50%; } }',
		'@supports (aspect-ratio: auto) { a { height: 0; padding-top: 50%; } }',
		'@supports (display: grid) and ((ASPECT-RATIO: 1) or (color: red)) { a { height: 0; padding-top: 50%; } }',
		'@supports not (aspect-ratio: 1) { @media (width > 10px) { a { height: 0; padding-top: 50%; } } }',
		'a { @supports not (aspect-ratio: 1) { height: 0; padding-top: 50%; } }',
		'@keyframes ratio { from { height: 0; padding-top: 50%; } }',
		'@-webkit-keyframes ratio { 50% { height: 0; padding-top: 50%; } }',
		'@font-face { height: 0; padding-top: 50%; }',
		'@page { height: 0; padding-top: 50%; }',
		'@property --ratio { height: 0; padding-top: 50%; }',
		':export { height: 0; padding-top: 50%; }',
		':import("./ratio.css") { height: 0; padding-top: 50%; }',
		{code: 'a { height: ; padding-top: 50%; }', languageOptions: {tolerant: true}},
		{code: 'a { height: 0; padding-top: ; }', languageOptions: {tolerant: true}},
	],
	invalid: [
		'a { height: 0; padding-bottom: 56.25%; }',
		'a { padding-top: 75%; height: 0; }',
		'a { height: 0px; padding-top: 50%; }',
		'a { height: -0.0EM; padding-top: 150%; }',
		'a { HEIGHT: +0; PADDING-TOP: 50%; }',
		String.raw`.video\:wide { height: 0; padding-top: 56.25%; }`,
		'a { height: 0; padding-top: 50% !important; }',
		'a { height: 0 !important; padding-top: 50%; }',
		'a { height: /* zero */ 0; padding-top: /* ratio */ 50% /* trailing */; }',
		'a { height: 0; padding-top: 25%; padding-bottom: 25%; }',
		'a { height: 0; padding-top: 10px; padding-bottom: 50%; }',
		...['50% 0', '50% 0 0', '0 0 50% 0', '25% 0 25%', '50% 0px 0% -0em', 'calc(9 / 16 * 100%) 0'].map(value => `a { height: 0; padding: ${value}; }`),
		...[
			'calc(9 / 16 * 100%)',
			'calc(100% / (16 / 9))',
			'calc(100% - 43.75%)',
			'calc(25% + 25% * 2)',
			'calc((100% - 25%) / 2)',
			'calc(-50% * -1)',
			'calc(0% + 50%)',
			'calc(50% * calc(3 / 2))',
			'calc(50% * 100% / 100%)',
			'calc(100% / (100% / 50%))',
			'calc(50% / 2 / 2)',
			'calc(50% - 10% - 10%)',
			'CALC(+100% * +9 / +16)',
			'calc(9 /* ratio */ / 16 * 100%)',
		].map(value => `a { height: 0; padding-top: ${value}; }`),
		'a {\r\n  height: 0;\r\n  padding-top: 50%;\r\n}',
		'a::before { height: 0; padding-top: 50%; }',
		'a { & .child { height: 0; padding-top: 50%; } }',
		'@media (width > 10px) { a { height: 0; padding-top: 50%; } }',
		'@supports (display: grid) { a { height: 0; padding-top: 50%; } }',
		'@supports (font-family: "aspect-ratio") { a { height: 0; padding-top: 50%; } }',
		'@container (width > 10px) { a { height: 0; padding-top: 50%; } }',
		'@layer cards { a { height: 0; padding-top: 50%; } }',
		'@scope (.cards) { a { height: 0; padding-top: 50%; } }',
		'a { @media (width > 10px) { height: 0; padding-top: 50%; } }',
		'a { @supports (display: grid) { height: 0; padding-top: 50%; } }',
		'a { @container (width > 10px) { height: 0; padding-top: 50%; } }',
		'a { @layer cards { height: 0; padding-top: 50%; } }',
		'a { @scope (&) { height: 0; padding-top: 50%; } }',
		'a { @starting-style { height: 0; padding-top: 50%; } }',
		'a { height: 0; padding: 0 0 calc(100% - 43.75%); }',
		'a { height: 0; padding: calc(25% + 25%) 0 calc(100% / 2); }',
		'a { height: 0; padding-top: calc((50% / 25% + 1) * 50%); }',
		'a { height: 0; padding-top: calc((25% * 25% + 75% * 75%) / 100%); }',
		'a { height: 0; padding-top: calc((50% - 25%) * 3); }',
		'a { height: 0; padding-top: calc((25% - 75%) * -1); }',
		'a { height: 0; padding-top: calc(1 / 2% * 50% * 50%); }',
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'a { height: 0; padding-bottom: 50%; @supports (aspect-ratio: 1) { height: 0; padding-bottom: 50%; } }',
			errors: [{messageId: 'prefer-aspect-ratio', column: 16}],
		},
	],
});

nodeTest('reports once per block without changing CSS or offering suggestions', () => {
	const code = 'a { height: 0; padding-bottom: 25%; padding-top: 25%; } b { height: 0; padding: 50% 0; }';
	const result = new Linter().verifyAndFix(code, {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {css, cssicorn: plugin},
		rules: {'cssicorn/prefer-aspect-ratio': 'error'},
	}, {filename: 'ratio.css'});

	assert.equal(result.fixed, false);
	assert.equal(result.output, code);
	assert.equal(result.messages.length, 2);
	assert.equal(result.messages[0].column, code.indexOf('padding-bottom') + 1);
	for (const message of result.messages) {
		assert.equal(message.messageId, 'prefer-aspect-ratio');
		assert.equal(message.fix, undefined);
		assert.equal(message.suggestions, undefined);
	}
});

nodeTest('enabled in recommended and all, but not unopinionated', () => {
	assert.equal(plugin.configs.recommended.rules['cssicorn/prefer-aspect-ratio'], 'error');
	assert.equal(plugin.configs.all.rules['cssicorn/prefer-aspect-ratio'], 'error');
	assert.equal(plugin.configs.unopinionated.rules['cssicorn/prefer-aspect-ratio'], 'off');
});
