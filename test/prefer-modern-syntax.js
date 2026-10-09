import test from 'node:test';
import assert from 'node:assert/strict';
import css from '@eslint/css';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

ruleTest({
	valid: [
		'a { color: rgb(0 0 0 / 50%); }',
		'a { color: hsl(30 40% 50%); }',
		'a { color: rgb(0 0 0 / calc(.5)); color: hwb(30 40% 50% / var(--alpha)); }',
		'a { opacity: .5; color: #abcd; content: "rgba(0, 0, 0, .5)"; background: url("rgba(0, 0, 0, .5)"); }',
		'a:hover::before { color: red; }',
		'a { --brand: "rgba(0, 0, 0, .5)"; }',
		'a[data-label=":before"] { --brand: url("rgba(0, 0, 0, .5)"); content: ":after"; }',
		'a { --brand: rgba(0, 0, 0, .5) #; }',
		'a { --brand: oKlab(50% 0 0 / .5); color: oKlab(50% 0 0 / .5); }',
		'a { color: var(--fallback, rgba(0, 0, 0, .5)); }',
		// Substitutions in legacy arguments can hold any number of comma-separated components.
		'a { color: rgba(var(--bs-primary-rgb), var(--bs-bg-opacity, 1)); }',
		'a { color: hsla(var(--h), var(--s), var(--l), .5); }',
		'a { color: rgb(var(--red), 0, 0); }',
		'a { color: rgba(var(--channels), .5); }',
		'a { color: rgba(1, 2, 3, var(--alpha)); }',
		'a { color: RGBA(VAR(--channels), .5); }',
		String.raw`a { color: rgba(v\61 r(--channels), .5); }`,
		'a { color: rgba(env(--channels), .5); }',
		'a { color: rgba(ident(--channels), .5); }',
		'a { color: rgba(first-valid(--channels), .5); }',
		String.raw`a { color: rgba(\2d -channels(), .5); }`,
		'a { color: rgba(attr(data-channels), .5); }',
		'a { color: rgba(--channels(), .5); }',
		'a { --brand: rgba(var(--channels), .5); }',
		// CSS Modules interop blocks are read by JavaScript as exact strings.
		':export { shadow: rgba(0, 0, 0, 0.5); --brand: rgba(0, 0, 0, 0.5); }',
		':import("./theme.css") { shadow: rgb(0 0 0 / .5); }',
		// Modern color syntax with no legacy form.
		'a { color: rgb(0 0 0); }',
		'a { color: rgb(var(--r) var(--g) var(--b) / 50%); }',
		'a { color: hsl(var(--h) var(--s) var(--l) / 25%); }',
		'a { color: lab(50% 0 0 / calc(var(--a) * 1)); }',
		'a { color: oklch(50% 0 0 / none); }',
		'a { color: rgb(none none none / 50%); }',
		'a { color: color(srgb 1 0 0 / none); }',
		// Color-producing functions that are not in the checked set.
		'a { background: color-mix(in oklch, red 40%, blue); }',
		'a { color: light-dark(rgb(0 0 0 / 50%), rgb(255 255 255 / 50%)); }',
		// Substitutions in legacy arguments are always skipped.
		'a { color: rgba(inherit(--channels), .5); }',
		// `var()` fallbacks are only parsed inside custom properties.
		'a { color: var(--brand, oklch(50% 0 0 / .5)); }',
		'a { --brand: var(--fallback, rgb(0 0 0 / 50%)); }',
		// CSS Modules interop blocks are ignored.
		':export { color: rgb(0 0 0 / .5); --brand: hsla(30, 40%, 50%, .5); }',
		':import("./x.css") { --brand: oklch(50% 0 0 / .5); }',
		// Modern colors inside grouping rules.
		'@media (min-width: 100px) { a { color: rgb(0 0 0 / 50%); } }',
		'@supports (color: rgb(0 0 0 / 50%)) { a { color: red; } }',
		// Color-like text inside a URL is ignored.
		'a { background: url("data:image/svg+xml,rgba(0,0,0,.5)"); }',
		// Modern pseudo-elements.
		'a::after, b::first-line { color: red; }',
	],
	invalid: [
		{code: 'a { color: rgba(0, 0, 0, .5); }', output: 'a { color: rgb(0 0 0 / 50%); }', errors: 1},
		{code: 'a { color: rgb(1,2,3); }', output: 'a { color: rgb(1 2 3); }', errors: 1},
		{code: 'a { color: rgba(1%, 2%, 3%, 25%); }', output: 'a { color: rgb(1% 2% 3% / 25%); }', errors: 1},
		{code: 'a { color: rgb(1, 2, 3, .5); }', output: 'a { color: rgb(1 2 3 / 50%); }', errors: 1},
		{code: 'a { color: hsl(30, 40%, 50%); }', output: 'a { color: hsl(30 40% 50%); }', errors: 1},
		{code: 'a { color: hsl(30, 40%, 50%, .5); }', output: 'a { color: hsl(30 40% 50% / 50%); }', errors: 1},
		{code: 'a { color: hsla(30, 40%, 50%, .25); }', output: 'a { color: hsl(30 40% 50% / 25%); }', errors: 1},
		{code: 'a { color: rgba(1 2 3 / 50%); }', output: 'a { color: rgb(1 2 3 / 50%); }', errors: 1},
		{code: 'a { color: rgba(0 0 0 / .5); }', output: 'a { color: rgb(0 0 0 / 50%); }', errors: [{messageId: 'prefer-modern-syntax/color'}]},
		{code: 'a { color: hsla(30 40% 50%); }', output: 'a { color: hsl(30 40% 50%); }', errors: 1},
		{code: 'a { color: rgba(1 2 3); }', output: 'a { color: rgb(1 2 3); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / .29); }', output: 'a { color: rgb(1 2 3 / 29%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / .005); }', output: 'a { color: rgb(1 2 3 / 0.5%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / +.005); }', output: 'a { color: rgb(1 2 3 / +0.5%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / -.005); }', output: 'a { color: rgb(1 2 3 / -0.5%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / 000.0500); }', output: 'a { color: rgb(1 2 3 / 5%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / 1); }', output: 'a { color: rgb(1 2 3 / 100%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / 0); }', output: 'a { color: rgb(1 2 3 / 0%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / 0.123456789); }', output: 'a { color: rgb(1 2 3 / 12.3456789%); }', errors: 1},
		{code: 'a { color: rgb(1 2 3 / 1e-2); }', errors: 1},
		{code: 'a { color: rgba(1, 2, 3, 1e-2); }', output: 'a { color: rgb(1 2 3 / 1e-2); }', errors: 1},
		{code: 'a { color: hwb(30 40% 50% / .5); }', output: 'a { color: hwb(30 40% 50% / 50%); }', errors: 1},
		{code: 'a { color: lab(50% 0 0 / .5); }', output: 'a { color: lab(50% 0 0 / 50%); }', errors: 1},
		{code: 'a { color: lch(50% 0 0 / .5); }', output: 'a { color: lch(50% 0 0 / 50%); }', errors: 1},
		{code: 'a { color: oklab(50% 0 0 / .5); }', output: 'a { color: oklab(50% 0 0 / 50%); }', errors: 1},
		{code: 'a { color: oklch(50% 0 0 / .5); }', output: 'a { color: oklch(50% 0 0 / 50%); }', errors: 1},
		{code: 'a { color: color(srgb 1 0 0 / .5); }', output: 'a { color: color(srgb 1 0 0 / 50%); }', errors: 1},
		{code: 'a { color: rgb(var(--red) 0 0 / .5); }', output: 'a { color: rgb(var(--red) 0 0 / 50%); }', errors: 1},
		{code: 'a { color: rgb(from rgba(0, 0, 0, .5) r g b / .5); }', output: 'a { color: rgb(from rgb(0 0 0 / 50%) r g b / 50%); }', errors: 2},
		{code: 'a { --brand: rgba(0, 0, 0, .5); }', output: 'a { --brand: rgb(0 0 0 / 50%); }', errors: 1},
		{code: 'a { --brand: oklch(50% 0 0 / .5); }', output: 'a { --brand: oklch(50% 0 0 / 50%); }', errors: 1},
		{code: 'a { --brand: hwb(30 40% 50% / .5); }', output: 'a { --brand: hwb(30 40% 50% / 50%); }', errors: 1},
		{code: 'a { --brand: color(srgb 1 0 0 / .5); }', output: 'a { --brand: color(srgb 1 0 0 / 50%); }', errors: 1},
		{
			code: '/* 😀 */\r\na {\r\n  --brand: /* before */ rgba(0, 0, 0, .5) /* after */ !important;\r\n}',
			output: '/* 😀 */\r\na {\r\n  --brand: /* before */ rgb(0 0 0 / 50%) /* after */ !important;\r\n}',
			errors: 1,
		},
		{code: 'a { --emoji: "😀"; --brand: rgba(0, 0, 0, .5); }', output: 'a { --emoji: "😀"; --brand: rgb(0 0 0 / 50%); }', errors: 1},
		{code: 'a { --brand: linear-gradient(rgba(0, 0, 0, .5), hsla(30, 40%, 50%, .5)); }', output: 'a { --brand: linear-gradient(rgb(0 0 0 / 50%), hsl(30 40% 50% / 50%)); }', errors: 2},
		{code: 'a { --brand: var(--fallback, rgba(0, 0, 0, .5)); }', output: 'a { --brand: var(--fallback, rgb(0 0 0 / 50%)); }', errors: 1},
		{code: 'a { --brand: RGBA(0, 0, 0, .5); }', output: 'a { --brand: rgb(0 0 0 / 50%); }', errors: 1},
		{code: String.raw`a { --brand: rgb\61(0, 0, 0, .5); }`, output: 'a { --brand: rgb(0 0 0 / 50%); }', errors: 1},
		{code: '@supports (color: rgba(0, 0, 0, .5)) { a { color: red; } }', output: '@supports (color: rgb(0 0 0 / 50%)) { a { color: red; } }', errors: 1},
		{code: '@supports (--brand: rgba(0, 0, 0, .5)) { a { color: red; } }', output: '@supports (--brand: rgb(0 0 0 / 50%)) { a { color: red; } }', errors: 1},
		{code: '@supports selector(a:before) { a { color: red; } }', output: '@supports selector(a::before) { a { color: red; } }', errors: 1},
		{
			code: '@property --brand { syntax: "<color>"; inherits: false; initial-value: rgba(1, 2, 3, .5); }',
			output: '@property --brand { syntax: "<color>"; inherits: false; initial-value: rgb(1 2 3 / 50%); }',
			errors: 1,
		},
		{code: '@supports (color: rgb(255, 0%, 0)) { a { color: red; } }', errors: 1},
		{code: 'a { background: linear-gradient(rgba(0, 0, 0, .5), hsl(30, 40%, 50%)); }', output: 'a { background: linear-gradient(rgb(0 0 0 / 50%), hsl(30 40% 50%)); }', errors: 2},
		{code: 'a { color: rgba(var(--channels) / .5); }', output: 'a { color: rgb(var(--channels) / 50%); }', errors: 1},
		{code: 'a { color: hsla(var(--h) var(--s) var(--l)); }', output: 'a { color: hsl(var(--h) var(--s) var(--l)); }', errors: 1},
		{code: 'a { color: rgb(calc(var(--red)), 0, 0); }', errors: 1},
		{code: 'a { color: rgb(0 0 0 / .5); }', output: 'a { color: rgb(0 0 0 / 50%); }', errors: [{messageId: 'prefer-modern-syntax/alpha'}]},
		{code: 'a { color: rgb(0, 0, 0); }', output: 'a { color: rgb(0 0 0); }', errors: [{messageId: 'prefer-modern-syntax/color'}]},
		{code: '@supports (color: rgb(calc(100%), 0, 0)) { a { color: red; } }', errors: 1},
		{code: 'a { color: rgb(min(100%, 20%), 0, 0); }', errors: 1},
		{code: 'a { color: rgb(0, 0, calc(100%)); }', errors: 1},
		{code: 'a { color: rgb(calc(1 + 2), 0, 0); }', errors: 1},
		{code: 'a { color: rgb(255, 0%, 0); }', errors: 1},
		{code: 'a { color: hsl(30, 40, 50); }', errors: 1},
		{code: 'a { color: rgb(none, 0, 0); }', errors: 1},
		{code: 'a { color: rgba(0, 0, 0, calc(.5)); }', output: 'a { color: rgb(0 0 0 / calc(.5)); }', errors: 1},
		{code: String.raw`a { color: r\67 ba(0, 0, 0, .5); }`, output: 'a { color: rgb(0 0 0 / 50%); }', errors: 1},
		{code: 'a { color: rgba(0,\r\n 0,\r\n 0,\r\n .5); }', output: 'a { color: rgb(0\r\n 0\r\n 0 /\r\n 50%); }', errors: 1},
		{code: 'a { color: rgba(0 , \r\n 0 , \r\n 0 , \r\n .5); }', output: 'a { color: rgb(0\r\n 0\r\n 0 /\r\n 50%); }', errors: 1},
		{code: 'a { color: RGBA(0, 0, 0, .5); }', output: 'a { color: rgb(0 0 0 / 50%); }', errors: 1},
		{code: 'a:before { color: red; }', output: 'a::before { color: red; }', errors: 1},
		{code: 'a:BEFORE { color: red; }', output: 'a::BEFORE { color: red; }', errors: 1},
		{code: '.a:export { shadow: rgba(0, 0, 0, 0.5); }', output: '.a:export { shadow: rgb(0 0 0 / 50%); }', errors: 1},
		{code: String.raw`a:b\65 fore { color: red; }`, output: String.raw`a::b\65 fore { color: red; }`, errors: 1},
		{code: 'a:after { color: red; }', output: 'a::after { color: red; }', errors: 1},
		{code: 'a:first-line { color: red; }', output: 'a::first-line { color: red; }', errors: 1},
		{code: 'a:first-letter { color: red; }', output: 'a::first-letter { color: red; }', errors: 1},
		{code: 'a:not(:hover):before { color: red; }', output: 'a:not(:hover)::before { color: red; }', errors: 1},
		{code: 'a { color: rgb(0, /* keep */ 0, 0); }', errors: 1},
		{code: 'a { color: rgb(0 0 0 / /* keep */ .5); }', errors: 1},
		{code: 'a { --brand: rgba(0, /* keep */ 0, 0, .5); }', errors: 1},
		{code: 'a { color: rgb(0,\n 0,\n 0); }', output: 'a { color: rgb(0\n 0\n 0); }', errors: 1},
		{code: 'a { color: rgb(0\n, 0, 0); }', errors: 1},
		// `rgba()`/`hsla()` name with boundary alpha values.
		{code: 'a { color: rgba(0, 0, 0, 1); }', output: 'a { color: rgb(0 0 0 / 100%); }', errors: 1},
		{code: 'a { color: rgba(255, 255, 255, 0); }', output: 'a { color: rgb(255 255 255 / 0%); }', errors: 1},
		{code: 'a { color: rgba(0,0,0,.5); }', output: 'a { color: rgb(0 0 0 / 50%); }', errors: 1},
		// Modern comma-free alpha on `hsl()`.
		{code: 'a { color: hsl(30 40% 50% / .5); }', output: 'a { color: hsl(30 40% 50% / 50%); }', errors: [{messageId: 'prefer-modern-syntax/alpha'}]},
		{code: 'a { color: hsl(30 40% 50% / 1e-2); }', errors: 1},
		// Alpha in other color spaces and color spaces beyond srgb.
		{code: 'a { color: color(display-p3 1 0 0 / .5); }', output: 'a { color: color(display-p3 1 0 0 / 50%); }', errors: 1},
		{code: 'a { color: color(srgb 1 0 0 / 1); }', output: 'a { color: color(srgb 1 0 0 / 100%); }', errors: 1},
		{code: 'a { color: lab(calc(50%) 0 0 / .5); }', output: 'a { color: lab(calc(50%) 0 0 / 50%); }', errors: 1},
		// Function names keep their original case when the name does not change.
		{code: 'a { color: RGB(0 0 0 / .5); }', output: 'a { color: RGB(0 0 0 / 50%); }', errors: 1},
		{code: 'a { color: HSL(30 40% 50% / .5); }', output: 'a { color: HSL(30 40% 50% / 50%); }', errors: 1},
		// `rgba()`/`hsla()` are reported even when the rest is already modern.
		{code: 'a { color: rgba(1 2 3 / 100%); }', output: 'a { color: rgb(1 2 3 / 100%); }', errors: [{messageId: 'prefer-modern-syntax/color'}]},
		{code: 'a { color: hsla(30 40% 50% / 100%); }', output: 'a { color: hsl(30 40% 50% / 100%); }', errors: 1},
		{code: 'a { color: hsla(var(--h) var(--s) var(--l) / .25); }', output: 'a { color: hsl(var(--h) var(--s) var(--l) / 25%); }', errors: 1},
		// Escaped alias name.
		{code: String.raw`a { color: h\73 la(30, 40%, 50%, .25); }`, output: 'a { color: hsl(30 40% 50% / 25%); }', errors: 1},
		// Percentage alpha in legacy comma arguments keeps the seam without touching the alpha.
		{code: 'a { color: hsl(30, 40%, 50%, 100%); }', output: 'a { color: hsl(30 40% 50% / 100%); }', errors: 1},
		{code: 'a { color: rgba(0, 0, 0, 50%); }', output: 'a { color: rgb(0 0 0 / 50%); }', errors: 1},
		{code: 'a { border-color: rgb(0,0,0,0.5); }', output: 'a { border-color: rgb(0 0 0 / 50%); }', errors: 1},
		// Multiple colors in one declaration.
		{
			code: 'a { box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .1), 0 1px 2px rgba(0, 0, 0, .2); }',
			output: 'a { box-shadow: inset 0 0 0 1px rgb(0 0 0 / 10%), 0 1px 2px rgb(0 0 0 / 20%); }',
			errors: 2,
		},
		{code: 'a { --brand: rgb(0 0 0 / .5) rgb(1 1 1 / .25); }', output: 'a { --brand: rgb(0 0 0 / 50%) rgb(1 1 1 / 25%); }', errors: 2},
		{code: 'a { background: linear-gradient(rgba(0, 0, 0, .5) 0%, transparent 100%); }', output: 'a { background: linear-gradient(rgb(0 0 0 / 50%) 0%, transparent 100%); }', errors: 1},
		// Relative colors with a legacy origin.
		{code: 'a { color: hsl(from rgb(1, 2, 3) h s l / .25); }', output: 'a { color: hsl(from rgb(1 2 3) h s l / 25%); }', errors: 2},
		// `!important` on a legacy color.
		{code: 'a { opacity: .5; color: rgba(0, 0, 0, .5) !important; }', output: 'a { opacity: .5; color: rgb(0 0 0 / 50%) !important; }', errors: 1},
		// Custom property and `@supports` modern alpha.
		{code: 'a { --brand: hsl(30 40% 50% / .5); }', output: 'a { --brand: hsl(30 40% 50% / 50%); }', errors: 1},
		{code: '@supports (color: hsl(30, 40%, 50%)) { a { color: red; } }', output: '@supports (color: hsl(30 40% 50%)) { a { color: red; } }', errors: 1},
		// Comments inside the function block the autofix.
		{code: 'a { color: rgb(/* c */ 0 0 0 / .5); }', errors: 1},
		{code: 'a { color: rgba(0, 0, 0, /* alpha */ .5); }', errors: 1},
		// A function in a legacy component blocks the autofix.
		{code: 'a { color: rgb(0, 0, max(1px, 2px)); }', errors: 1},
		// Not a CSS Modules interop block because of the class prefix.
		{code: '.a:import("./x.css") { color: rgba(0, 0, 0, .5); }', output: '.a:import("./x.css") { color: rgb(0 0 0 / 50%); }', errors: 1},
		// Modern pseudo-element with a legacy color.
		{code: 'a[data-x]::after { color: rgba(0, 0, 0, .5); }', output: 'a[data-x]::after { color: rgb(0 0 0 / 50%); }', errors: 1},
		// Case-insensitive legacy pseudo-element.
		{code: 'a:FIRST-LETTER { color: red; }', output: 'a::FIRST-LETTER { color: red; }', errors: 1},
		// Legacy color inside a grouping rule.
		{code: '@media (min-width: 100px) { a { color: rgba(0, 0, 0, .5); } }', output: '@media (min-width: 100px) { a { color: rgb(0 0 0 / 50%); } }', errors: 1},
	],
});

test('fixes are stable', () => {
	const linter = new Linter();
	const config = {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {
			css,
			cssicorn: plugin,
		},
		rules: {
			'cssicorn/prefer-modern-syntax': 'error',
		},
	};
	for (const [code, expected] of [
		['a:before { --brand: rgba(0, 0, 0, .5); }', 'a::before { --brand: rgb(0 0 0 / 50%); }'],
		['a:after { --brand: rgb(from rgba(1, 2, 3, .25) r g b / .5); }', 'a::after { --brand: rgb(from rgb(1 2 3 / 25%) r g b / 50%); }'],
	]) {
		const first = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(first.fixed, true);
		assert.equal(first.output, expected);
		assert.deepEqual(first.messages, []);
		const second = linter.verifyAndFix(first.output, config, {filename: 'test.css'});
		assert.equal(second.fixed, false);
		assert.equal(second.output, expected);
		assert.deepEqual(second.messages, []);
	}
});

test('fixes converge with other CSS rules', () => {
	const linter = new Linter();
	const config = {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {
			css,
			cssicorn: plugin,
		},
		rules: {
			'cssicorn/prefer-modern-syntax': 'error',
			'cssicorn/lowercase': 'error',
		},
	};
	const first = linter.verifyAndFix('a:BEFORE { --brand: RGBA(.0,0.00,0,.50); color: RGB(.0,0.00,0,.50); }', config, {filename: 'test.css'});
	const expected = 'a::before { --brand: rgb(.0 0.00 0 / 50%); color: rgb(.0 0.00 0 / 50%); }';
	assert.equal(first.fixed, true);
	assert.equal(first.output, expected);
	assert.deepEqual(first.messages, []);
	const second = linter.verifyAndFix(first.output, config, {filename: 'test.css'});
	assert.equal(second.fixed, false);
	assert.equal(second.output, expected);
	assert.deepEqual(second.messages, []);
});
