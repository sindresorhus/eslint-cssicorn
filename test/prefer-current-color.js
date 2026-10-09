import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import css from '@eslint/css';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { border-color: red; }',
		'a { color: red; border-color: blue; }',
		'a { color: red; border-color: currentcolor; }',
		'a { color: red; color: red; }',
		'a { color: red; --border: red; }',
		'a { color: red; font-family: red; animation: red 1s; container-name: red; }',
		'a { color: red; content: "red"; background: url(red); fill: url(#red); }',
		'a { color: red; border: var(--width) solid red; }',
		'a { color: red; border-color: var(--border, red); }',
		'a { color: red; background: unknown(red); }',
		'a { color: red; unknown-property: red; }',
		'a { color: rgb(255 0 0); border-color: hsl(0 100% 50%); }',
		'a { color: rgb(255 0 0); border-color: rgb(0 0 255); }',
		'a { color: #ff000080; border-color: rgb(255 0 0 / .5); }',
		'a { color: transparent; border-color: rgb(255 0 0 / 0); }',
		'a { color: #808080; border-color: rgb(50% 50% 50%); }',
		'a { color: rgb(1.00001 0 0); border-color: rgb(1.00002 0 0); }',
		'a { color: black; border-color: rgb(none 0 0); }',
		'a { color: #f00; font-family: red; animation: red 1s; content: "red"; background-image: url(red); --paint: red; }',
		'a { color: red; background: linear-gradient(rgb(255 0 0), var(--stop)); }',
		'a { color: color(srgb 1 0 0); border-color: color(display-p3 1 0 0); }',
		'a { color: red; } b { border-color: red; }',
		'a { color: red; & b { border-color: red; } }',
		'a { color: red; @media (width > 1px) { border-color: red; } }',
		'a { @media (width > 1px) { color: red; } border-color: red; }',
		'a { color: red; color: blue; border-color: red; }',
		'a { color: red; color: blue !important; border-color: red; }',
		'a { color: red; all: unset; border-color: red; }',
		'a { color: red; all: unset !important; border-color: red; }',
		'a { color: red !important; all: unset !important; border-color: red; }',
		'a { all: initial !important; color: red; border-color: red; }',
		'a { color: red; color: var(--foreground); border-color: red; }',
		'a { color: red; all: var(--reset); border-color: red; }',
		...[
			'initial',
			'inherit',
			'unset',
			'revert',
			'revert-layer',
			'currentcolor',
			'CanvasText',
			'AccentColor',
			'var(--foreground)',
			'light-dark(red, blue)',
			'color-mix(in srgb, red, blue)',
			'rgb(from red r g b)',
			'rgb(calc(255) 0 0)',
			'rgb(none 0 0)',
			'rgb(255 0 0 / none)',
			'oklch(50% .2 none)',
		].map(color => `a { color: ${color}; border-color: ${color}; }`),
		'@keyframes example { from { color: red; border-color: red; } }',
		'@-webkit-keyframes example { to { color: red; border-color: red; } }',
		'@font-face { color: red; border-color: red; }',
		'@property --foreground { syntax: "<color>"; inherits: true; initial-value: red; }',
		'@page { color: red; border-color: red; }',
		':export { color: red; border-color: red; }',
		':import("./tokens.css") { color: red; border-color: red; }',
		{code: 'a { color: ???; border-color: red; }', languageOptions: {tolerant: true}},
		{code: 'a { color: red; border-color: ???; }', languageOptions: {tolerant: true}},
	],
	invalid: [
		'.button { color: #6750a4; border: 1px solid #6750a4; }',
		'a { border-color: red; color: red; }',
		'a { COLOR: RED; BORDER-COLOR: red; }',
		'a { color: #ABCD; border-color: #abcd; }',
		...[
			'red',
			'transparent',
			'rgb(255 0 0)',
			'rgba(255, 0, 0, .5)',
			'hsl(0 100% 50%)',
			'hwb(0 0% 0%)',
			'lab(50% 20 30)',
			'lch(50% 20 30)',
			'oklab(50% .1 .2)',
			'oklch(50% .2 30)',
			'color(display-p3 1 0 0)',
		].map(color => `a { color: ${color}; border-color: ${color}; }`),
		'a { color: RGB(255 0 0); outline: 1px solid rgb(255 0 0); }',
		'a { color: rgb(+255 0.0 0); border-color: rgba(255 0 0); }',
		'a { color: hsl(0 100% 50%); border-color: hsl(0   100%   50%); }',
		'a { color: red; border-block: 1px solid red; border-inline-color: red blue; }',
		'a { color: red; text-decoration: underline red; text-emphasis: filled red; }',
		'a { color: red; fill: red; stroke: red; }',
		'a { color: red; fill: url("red.svg") red; }',
		'a { color: red; background: red url(red); }',
		'a { color: red; background: linear-gradient(red, blue); }',
		'a { color: red; background-image: radial-gradient(red, blue), conic-gradient(blue, red); }',
		'a { color: red; text-shadow: 0 1px 2px red; box-shadow: 0 0 2px red, 0 0 3px blue; }',
		'a { color: red; filter: drop-shadow(0 0 2px red); }',
		'a { color: red; background-color: color-mix(in srgb, red 25%, blue); }',
		'a { color: red; background: linear-gradient(color-mix(in srgb, blue, red), red); }',
		'a { color: red; background-color: light-dark(red, blue); }',
		'a { color: red; border-color: rgb(from red r g b / .5); }',
		'a { color: red; border-color: red blue red; }',
		'a { color: red; color: blue; border-color: blue; }',
		'a { color: red !important; color: blue; border-color: red; }',
		'a { color: blue !important; color: red !important; border-color: red; }',
		'a { color: blue; color: red !important; border-color: red !important; }',
		'a { all: unset; color: red; border-color: red; }',
		'a { color: red !important; all: unset; border-color: red; }',
		'a { all: unset !important; color: red !important; border-color: red; }',
		'a { color: red !important; color: var(--foreground); border-color: red; }',
		'a { color: red; & b { color: blue; border-color: blue; } border-color: red; }',
		'a { @media (width > 1px) { color: red; border-color: red; } }',
		'a { @supports (display: grid) { color: red; border-color: red; } }',
		'a { @container (width > 1px) { color: red; border-color: red; } }',
		'a { @layer theme { color: red; border-color: red; } }',
		'a { @scope (.card) { color: red; border-color: red; } }',
		'a { @starting-style { color: red; border-color: red; } }',
		'@media screen { @supports (display: grid) { @container (width > 1px) { @layer theme { @scope (.card) { a { color: red; border-color: red; } } } } } }',
		'a { color: red; -webkit-text-fill-color: red; -webkit-text-stroke: 1px red; }',
		'a { color: /* foreground */ red; border: /* before */ 1px solid red /* after */ !important; }',
		'a { color: rgb(255 0 0); border-color: rgb(255 /* keep */ 0 0); }',
		'a { color: rgb(255 /* foreground */ 0 0); border-color: rgb(255 0 0); }',
		'a {\n  color: red;\n  border: 1px solid red;\n}',
		'a {\r\n\tcolor: red;\r\n\tborder: 1px solid red;\r\n}',
		String.raw`a { color: red; border-color: r\65 d; }`,
		String.raw`a { color: r\65 d; border-color: red; }`,
		String.raw`a { color: rgb(255 0 0); border-color: r\67 b(255 0 0); }`,
		String.raw`a { color: hsl(0deg 100% 50%); border-color: hsl(0d\65 g 100% 50%); }`,
		String.raw`a { color: red; border: 1px \73 olid red; }`,
		'a { color: red; background-image: image(url("icon.svg"), red); }',
		String.raw`a { color: red; background: re\64  url(red); }`,
		String.raw`a{color:#f00;border:1px soli\64 #f00}`,
		...[
			['red', '#f00'],
			['#fff', '#ffffff'],
			['#abcd', '#aabbccdd'],
			['rgb(255 0 0)', 'rgb(255, 0, 0)'],
			['rgb(255 0 0)', 'rgb(100% 0% 0%)'],
			['#f00', 'rgba(255, 0, 0, 1)'],
			['rgb(0 0 0 / 50%)', 'rgba(0, 0, 0, .5)'],
			['gray', 'grey'],
			['transparent', '#0000'],
		].flatMap(([first, second]) => [
			`a { color: ${first}; border-color: ${second}; }`,
			`a { color: ${second}; border-color: ${first}; }`,
		]),
		'a { color: rgb(300 -10 0 / 2); border-color: red; }',
		'a { color: red; background-color: color-mix(in srgb, #f00, rgb(from rgb(100% 0% 0%) r g b)); }',
		'a { color: #f00; border-color: rgb(255 /* keep */ 0 0); }',
		String.raw`a { color: #F00; border-color: r\65 d; }`,
	],
});

test({
	valid: [],
	invalid: [{
		code: 'a { color: #6750a4; border: 1px solid #6750a4 !important; }',
		errors: [{
			messageId: 'prefer-current-color/error',
			suggestions: [{
				messageId: 'prefer-current-color/suggestion',
				output: 'a { color: #6750a4; border: 1px solid currentcolor !important; }',
			}],
		}],
	}, {
		code: 'a { color: rgb(255 0 0); border-color: rgb(255 /* keep */ 0 0); }',
		errors: [{messageId: 'prefer-current-color/error', suggestions: []}],
	}, {
		code: String.raw`a { color: color(srgb 1 0 0); border-color: color(s\72 gb 1 0 0); }`,
		errors: [{
			messageId: 'prefer-current-color/error',
			suggestions: [{
				messageId: 'prefer-current-color/suggestion',
				output: 'a { color: color(srgb 1 0 0); border-color: currentcolor; }',
			}],
		}],
	}, {
		code: String.raw`a { color: color(srgb 1 0 0); border-color: color(s\72 gb /* keep */ 1 0 0); }`,
		errors: [{messageId: 'prefer-current-color/error', suggestions: []}],
	}, {
		code: 'a { color: red; custom-paint: red; custom-label: red; }',
		languageOptions: {
			customSyntax: {
				properties: {
					'custom-paint': '<color>',
					'custom-label': '<custom-ident>',
				},
			},
		},
		errors: [{
			messageId: 'prefer-current-color/error',
			suggestions: [{
				messageId: 'prefer-current-color/suggestion',
				output: 'a { color: red; custom-paint: currentcolor; custom-label: red; }',
			}],
		}],
	}, {
		code: 'a { color: rgb(255 0 0); background-color: alpha(from rgb(255 0 0) / calc(alpha * .5)); }',
		errors: [{
			messageId: 'prefer-current-color/error',
			suggestions: [{
				messageId: 'prefer-current-color/suggestion',
				output: 'a { color: rgb(255 0 0); background-color: alpha(from currentcolor / calc(alpha * .5)); }',
			}],
		}],
	}],
});

nodeTest('suggestions compose with lowercase without autofixing the relationship', () => {
	const linter = new Linter();
	const configuration = {
		files: ['**'],
		language: 'css/css',
		plugins: {css, cssicorn: plugin},
		rules: {
			'cssicorn/lowercase': 'error',
			'cssicorn/prefer-current-color': 'error',
		},
	};
	const code = 'a { COLOR: RED; BORDER-COLOR: RED; }';
	const result = linter.verifyAndFix(code, configuration, {filename: 'test.css'});
	assert.equal(result.fixed, true);
	assert.equal(result.output, 'a { color: red; border-color: red; }');
	assert.equal(result.messages.length, 1);
	const [suggestion] = result.messages[0].suggestions;
	const suggestedCode = result.output.slice(0, suggestion.fix.range[0]) + suggestion.fix.text + result.output.slice(suggestion.fix.range[1]);
	assert.equal(suggestedCode, 'a { color: red; border-color: currentcolor; }');
	assert.deepEqual(linter.verify(suggestedCode, configuration, {filename: 'test.css'}), []);
});

nodeTest('multiple suggestions preserve escaped and nested functional color ranges', () => {
	const linter = new Linter();
	const configuration = {
		...plugin.configs.recommended,
		rules: {'cssicorn/prefer-current-color': 'error'},
	};
	const code = String.raw`a { color: rgb(255 0 0); background-color: color-mix(in srgb, r\67 b(255 0 0), rgb(from rgb(255 0 0) r g b)); }`;
	const result = linter.verifyAndFix(code, configuration, {filename: 'test.css'});
	assert.equal(result.fixed, false);
	assert.equal(result.output, code);
	assert.equal(result.messages.length, 2);

	let suggestedCode = code;
	for (const message of result.messages.toReversed()) {
		assert.equal(message.suggestions.length, 1);
		const [{fix}] = message.suggestions;
		suggestedCode = suggestedCode.slice(0, fix.range[0]) + fix.text + suggestedCode.slice(fix.range[1]);
	}

	assert.equal(suggestedCode, 'a { color: rgb(255 0 0); background-color: color-mix(in srgb, currentcolor, rgb(from currentcolor r g b)); }');
	assert.deepEqual(linter.verify(suggestedCode, configuration, {filename: 'test.css'}), []);
});

nodeTest('suggestions keep adjacent CSS tokens separate', () => {
	const linter = new Linter();
	const configuration = {
		...plugin.configs.recommended,
		rules: {
			'cssicorn/prefer-current-color': 'error',
			'css/no-invalid-properties': 'error',
		},
	};
	const cases = [
		['a{color:#f00;border:1px solid#f00}', 'a{color:#f00;border:1px solid currentcolor}'],
		['a{color:#f00;box-shadow:0 0#f00}', 'a{color:#f00;box-shadow:0 0 currentcolor}'],
		['a{color:#f00;border:solid 1px#f00}', 'a{color:#f00;border:solid 1px currentcolor}'],
		['a{color:rgb(255 0 0);border:rgb(255 0 0)solid 1px}', 'a{color:rgb(255 0 0);border:currentcolor solid 1px}'],
		['a{color:rgb(255 0 0);box-shadow:rgb(255 0 0)0 0}', 'a{color:rgb(255 0 0);box-shadow:currentcolor 0 0}'],
		['a{color:rgb(255 0 0);border-color:rgb(255 0 0)rgb(255 0 0)}', 'a{color:rgb(255 0 0);border-color:currentcolor currentcolor}'],
		['a{color:#f00;border-color:#f00#f00}', 'a{color:#f00;border-color:currentcolor currentcolor}'],
		['a{color:#f00;border:1px solid/* keep */#f00}', 'a{color:#f00;border:1px solid/* keep */currentcolor}'],
		['a{color:rgb(255 0 0);border:rgb(255 0 0)/* keep */solid 1px}', 'a{color:rgb(255 0 0);border:currentcolor/* keep */solid 1px}'],
	];
	for (const [code, expected] of cases) {
		const messages = linter.verify(code, configuration, {filename: 'test.css'});
		assert.ok(messages.length > 0);
		assert.equal(messages.some(message => message.ruleId === 'css/no-invalid-properties'), false, code);
		let suggestedCode = code;
		for (const message of messages.toReversed()) {
			const [{fix}] = message.suggestions;
			const individualSuggestion = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
			assert.equal(linter.verify(individualSuggestion, configuration, {filename: 'test.css'}).some(message => message.ruleId === 'css/no-invalid-properties'), false, individualSuggestion);
			suggestedCode = suggestedCode.slice(0, fix.range[0]) + fix.text + suggestedCode.slice(fix.range[1]);
		}

		assert.equal(suggestedCode, expected);
		assert.deepEqual(linter.verify(suggestedCode, configuration, {filename: 'test.css'}), []);
	}
});
