import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import css from '@eslint/css';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const opacityProperties = ['opacity', 'fill-opacity', 'stroke-opacity', 'stop-opacity', 'flood-opacity', 'shape-image-threshold'];
const boundedFilters = ['grayscale', 'invert', 'opacity', 'sepia'];
const filterProperties = ['filter', 'backdrop-filter', '-webkit-backdrop-filter'];

test.snapshot({
	valid: [
		...opacityProperties.flatMap(property => ['0', '1', '0%', '100%', '.5', '50%', 'var(--amount)'].map(value => `a { ${property}: ${value}; }`)),
		...boundedFilters.flatMap(name => ['0', '1', '100%', '-1', '-10%', 'var(--amount)'].map(value => `a { filter: ${name}(${value}); }`)),
		'a { filter: brightness(50) contrast(50) saturate(50); }',
		'a { filter: brightness(-1) contrast(-1) saturate(-1); }',
		'a { color: rgb(0 255 100% / 100%); }',
		'a { color: rgba(0, 255, 0, 1); }',
		'a { color: hsl(0 200% 200%); background: hwb(0 200% 200%); }',
		'a { color: lab(100 200 -200); background: lch(100 200 999); }',
		'a { color: oklab(1 2 -2); background: oklch(1 2 999); }',
		'a { color: color(display-p3 2 -1 3); }',
		'a { color: color(display-p3 calc(2) calc(-1) calc(3)); }',
		'a { color: rgb(from red 300 -1 999 / 1); }',
		'a { color: rgb(from red calc(300) calc(-1) calc(999) / 1); }',
		'a { color: lch(from red 150 -1 0); }',
		'a { color: color(from red --profile 2 -1 3); }',
		'a { color: rgba(var(--channels), 50); }',
		// The newer legacy comma-separated device-cmyk() syntax is outside this rule's supported boundary.
		'a { color: device-cmyk(2, 0, 0, 0); }',
		'a { color: rgba(0, 0, 0, var(--alpha)); }',
		'a { perspective: 1px; transform: perspective(2px); }',
		'a { perspective: -1px; transform: perspective(-1px); }',
		'a { perspective: .5em; transform: perspective(.5rem); }',
		'a { perspective: calc(0); transform: perspective(calc(0)); text-decoration-thickness: calc(0); }',
		'a { border-image: url(a) 100% / 200%; mask-border-slice: 100%; }',
		'a { border-image-slice: 999; mask-border: url(a) 999 / 200%; }',
		'a { text-decoration-thickness: .1px; text-decoration: underline .1em; }',
		'a { width: -1px; font-weight: 1200; animation-duration: -1s; }',
		'a { opacity: calc(2 - 1); width: calc(-1px + 2px); }',
		'a { opacity: min(1, 2); opacity: clamp(0, 2, 1); }',
		'a { width: max(calc(-1px), 2px); }',
		'a { width: calc(abs(-1px * 1px) / -1px); height: calc(min(-1px * 1px, -2px * 1px) / 1px); }',
		'a { width: clamp(0px, calc(-1px), 2px); }',
		'a { opacity: calc(2+ 3); opacity: calc(2 +/**/3); }',
		'a { width: calc(1in - 96px); }',
		'a { width: calc(1cm - 10mm); padding: calc(30mm - 3cm); }',
		'a { opacity: calc((.1 + .2) / .3); color: rgb(0 0 0 / calc(.1 * .1 * 100)); }',
		'a { opacity: calc(.5 + 50%); width: calc(-2foo); }',
		'a { opacity: calc(sin(180deg) / 1e-18); }',
		'a { opacity: calc(infinity); opacity: calc(NaN); }',
		'a { opacity: calc(2 + var(--amount)); width: calc(1em - 2px); }',
		'a { opacity: random(1, 50); width: calc-size(auto, size - 1px); }',
		'a { column-count: calc(.5); orphans: calc(.5); widows: calc(1.5); }',
		'a { column-count: calc(1% / 10%); font-weight: calc(1% / 10%); }',
		'a { grid-template-columns: calc(-1fr); width: calc(-1s); }',
		'a { --amount: 50; --color: rgb(300 0 0 / 50); }',
		'a { content: "rgb(300 0 0 / 50)"; background: url("opacity(50)"); }',
		':export { opacity: 50; color: rgb(300 0 0 / 50); }',
		':import("./theme.css") { opacity: 50; }',
		'@property --amount { syntax: "<number>"; inherits: false; initial-value: calc(1200); }',
		'@unknown { opacity: 50; width: calc(-1px); }',
		'@supports (opacity: 50) { a { opacity: .5; } }',
		{code: 'a { opacity: ; color: rgb(; filter: grayscale(; }', languageOptions: {tolerant: true}},
	],
	invalid: [
		...opacityProperties.flatMap(property => ['-1', '2', '50', '-1%', '101%', 'calc(25 + 25)', 'min(110%, 120%)'].map(value => `a { ${property}: ${value}; }`)),
		...boundedFilters.flatMap(name => filterProperties.flatMap(property => ['50', '150%', 'calc(-1)', 'calc(25 + 25)'].map(value => `a { ${property}: ${name}(${value}); }`))),
		'a { filter: brightness(calc(-1)) contrast(calc(-1)) saturate(calc(-1)); }',
		'a { color: rgb(300 0 0); }',
		'a { color: rgb(-1 0 0); }',
		'a { color: rgb(101% 0% 0%); }',
		'a { color: rgb(0 0 0 / 50); }',
		'a { color: rgba(0, 0, 0, 50); }',
		'a { color: hsla(0, 50%, 50%, -1); }',
		'a { color: rgb(var(--channels) / 50); }',
		'a { color: rgb(from red r g b / 50); }',
		'a { color: alpha(from red / 50); }',
		'a { color: hsl(0 -1% 50%); }',
		'a { color: lab(150 0 0); }',
		'a { color: lch(-1% 0 0); }',
		'a { color: lch(50 -1 0); }',
		'a { color: oklab(2 0 0); }',
		'a { color: oklch(101% 0 0); }',
		'a { color: oklch(.5 -1 0); }',
		'a { color: device-cmyk(2 0 0 0 / 50); }',
		'a { color: color(--profile 2 0 0 / 50); }',
		'a { color: color(display-p3 2 -1 3 / 50); }',
		'a { background: linear-gradient(rgb(300 0 0), light-dark(red, rgb(0 0 0 / 50))); }',
		'a { color: color-mix(in srgb, rgb(300 0 0), blue); }',
		'a { color: rgb(calc(200 + 200) 0 0 / calc(25 + 25)); }',
		'a { color: rgb(calc(10% / 20%) 0 0 / calc(30% / 10%)); }',
		'a { perspective: .5px; }',
		'a { perspective: 0; }',
		'a { perspective: 0em; }',
		'a { perspective: calc(0px); transform: perspective(calc(0px)); text-decoration-thickness: calc(0px); }',
		'a { transform: perspective(.005in); }',
		'a { perspective: calc(-1px); }',
		'a { transform: perspective(calc(.25px + .25px)); }',
		'a { border-image-slice: 110%; }',
		'a { mask-border-slice: 110%; }',
		'a { border-image: url(a) 110% / 200%; }',
		'a { mask-border: url(a) 110% / 200%; }',
		'a { border-image-slice: calc(50% + 60%); }',
		'a { border-image-slice: calc(-1); mask-border-slice: calc(-1); }',
		'a { border-image: url(a) calc(-1) / 1; mask-border: url(a) calc(-1) / 1; }',
		'a { perspective: calc(-1em); transform: perspective(calc(-1em)); }',
		'a { text-decoration-thickness: 0; }',
		'a { text-decoration-thickness: -1px; }',
		'a { text-decoration: underline -1%; }',
		'a { text-decoration-thickness: calc(1px - 2px); }',
		'a { width: calc(-1px); }',
		'a { width: calc(calc(-1px * 1px) / 1px); }',
		'a { width: calc(-.00000001px); opacity: calc(-.00000001); }',
		'a { opacity: calc(sin(1e-15deg) / 1e-18); }',
		'a { opacity: -.000000000001; color: rgb(0 0 0 / 1.000000000001); }',
		'a { width: calc(-10%); }',
		'a { padding: calc(1px - 2px); }',
		'a { border-image: url(a) 50% / calc(-1px); }',
		'a { font-weight: calc(1200); }',
		'a { animation-duration: calc(-1s); }',
		'a { column-count: calc(.4); orphans: calc(.4); widows: calc(.4); }',
		'@font-face { font-family: test; src: url(a); font-weight: calc(1200); }',
		'@position-try --test { width: calc(-1px); }',
		'a { OPACITY: 50 !important; color: RGB(0 0 0 / 50); filter: GRAYSCALE(50); }',
		'a { WIDTH: CALC(-1px); opacity: MAX(2, 1); }',
		String.raw`a { filter: \67 rayscale(50); color: r\67 b(0 0 0 / 50); }`,
		'a { opacity: /* keep */ 50; color: rgb(0 0 0 / /* keep */ 50); }',
		'@media (width > 1px) { @supports (display: grid) { a { opacity: 50; } } }',
		'@container (width > 1px) { @layer theme { @scope (.a) { .b { opacity: 50; } } } }',
		'a { & .b { opacity: 50; } } @keyframes fade { to { filter: grayscale(50); } }',
	],
});

nodeTest('clamping diagnostics survive fixes from existing rules', () => {
	const linter = new Linter();
	const code = '@keyframes fade { to { filter: grayscale(50); color: rgb(0 0 0 / 50); } }';
	const config = {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {css, cssicorn: plugin},
		rules: {
			'cssicorn/no-clamped-values': 'error',
			'cssicorn/no-redundant-functions': 'error',
			'cssicorn/prefer-modern-syntax': 'error',
		},
	};
	const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
	assert.equal(result.output, '@keyframes fade { to { filter: grayscale(50); color: rgb(0 0 0 / 5000%); } }');
	assert.equal(result.messages.length, 2);
	assert.ok(result.messages.every(message => message.ruleId === 'cssicorn/no-clamped-values'));
	assert.equal(linter.verifyAndFix(result.output, config, {filename: 'test.css'}).fixed, false);
});

nodeTest('recommended and all enable the rule', () => {
	const name = 'cssicorn/no-clamped-values';
	assert.equal(plugin.configs.recommended.rules[name], 'error');
	assert.equal(plugin.configs.all.rules[name], 'error');
	assert.equal(plugin.configs.unopinionated.rules[name], 'off');
});

for (const preset of ['recommended', 'all']) {
	nodeTest(`${preset} autofixes preserve clamping diagnostics`, () => {
		const linter = new Linter();
		const config = plugin.configs[preset];
		const result = linter.verifyAndFix('a { opacity: 50; filter: grayscale(50); color: rgb(0 0 0 / 50); }', config, {filename: 'test.css'});
		assert.equal(result.messages.filter(message => message.ruleId === 'cssicorn/no-clamped-values').length, 3);
		assert.equal(linter.verifyAndFix(result.output, config, {filename: 'test.css'}).fixed, false);
	});
}

nodeTest('descriptor diagnostics identify the declaration', () => {
	const linter = new Linter();
	const messages = linter.verify('@font-face { font-weight: calc(1200); }', {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {css, cssicorn: plugin},
		rules: {'cssicorn/no-clamped-values': 'error'},
	}, {filename: 'test.css'});
	assert.equal(messages.length, 1);
	assert.equal(messages[0].message, '\'font-weight\' evaluates to 1200, which the browser clamps to 1000.');
});

nodeTest('percent signs in comments do not hide calculated bounds', () => {
	const messages = new Linter().verify('a { font-weight: calc(1200 /* 50% */); column-count: calc(0 /* 50% */); }', {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {css, cssicorn: plugin},
		rules: {'cssicorn/no-clamped-values': 'error'},
	}, {filename: 'test.css'});
	assert.deepEqual(messages.map(message => message.message), [
		'\'font-weight\' evaluates to 1200, which the browser clamps to 1000.',
		'\'column-count\' evaluates to 0, which the browser clamps to 1.',
	]);
});

nodeTest('calculations use the receiving component\'s intrinsic percentage basis', () => {
	const linter = new Linter();
	const config = {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {css, cssicorn: plugin},
		rules: {'cssicorn/no-clamped-values': 'error'},
	};
	for (const [declaration, expected] of [
		['color: rgb(min(100%, 150%) 0 0)', []],
		['color: rgb(min(125%, 150%) 0 0)', ['\'rgb() red\' evaluates to 318.75, which the browser clamps to 255.']],
		['color: rgb(hypot(60%, 80%) 0 0)', []],
		['color: rgb(hypot(90%, 120%) 0 0)', ['\'rgb() red\' evaluates to 382.5, which the browser clamps to 255.']],
		['color: lab(min(100%, 150%) 0 0)', []],
		['color: lab(min(125%, 150%) 0 0)', ['\'lab() lightness\' evaluates to 125, which the browser clamps to 100.']],
		['color: oklab(min(100%, 150%) 0 0)', []],
		['color: oklab(min(125%, 150%) 0 0)', ['\'oklab() lightness\' evaluates to 1.25, which the browser clamps to 1.']],
		['color: lch(50 rem(-25%, 100%) 0)', ['\'lch() chroma\' evaluates to -37.5, which the browser clamps to 0.']],
		['color: oklch(.5 rem(-25%, 100%) 0)', ['\'oklch() chroma\' evaluates to -0.1, which the browser clamps to 0.']],
		['filter: grayscale(round(up, 90%, 20%))', []],
		['filter: grayscale(round(up, 125%, 50%))', ['\'grayscale() amount\' evaluates to 1.5, which the browser clamps to 1.']],
		['filter: brightness(hypot(90%, 120%))', []],
		['color: color(display-p3 min(125%, 150%) 0 0)', []],
	]) {
		const messages = linter.verify(`a { ${declaration}; }`, config, {filename: 'test.css'});
		assert.deepEqual(messages.map(message => message.message), expected, declaration);
	}
});

test.snapshot({
	valid: [
		'a { border-image: url(a) 100% fill / 200% / 2; mask-border: url(a) 100% fill / 200% / 2; }',
	],
	invalid: [
		'a { border-image: url(a) 110% fill / 200% / 2; mask-border: url(a) 110% fill / 200% / 2; }',
		'a { color: rgb(from rgb(300 0 0 / 50) r g b / .5); }',
	],
});

test.snapshot({
	valid: [
		'a { filter: blur(-1px); backdrop-filter: blur(-1em); }',
		'a { filter: blur(calc(-1)) blur(calc(-1%)) blur(calc(-1deg)) blur(calc(-1fr)); }',
		'a { filter: blur(calc(-1px / 1px)); }',
		'a { filter: blur(0) blur(calc(0px)) blur(calc(-1 * 0px)); }',
		'a { filter: blur(calc(-1px + 2px)) blur(abs(-1px)); }',
		'a { filter: blur(calc(1cm - 10mm)); }',
		'a { filter: blur(calc(var(--radius) - 1px)) blur(calc(1px - 2em)); }',
		'a { filter: var(--effects, blur(calc(-1px))); content: "blur(calc(-1px))"; }',
		'a { --effects: blur(calc(-1px)); }',
		'a { width: calc-size(auto, calc(-1px)); }',
		'a { opacity: progress(calc(50), 0, 100); }',
		'a { opacity: calc(progress(calc(50), 0, 100) * 2); }',
	],
	invalid: [
		...filterProperties.map(property => `a { ${property}: blur(calc(-1px)); }`),
		'a { filter: blur(min(-1px, -2px)); }',
		'a { filter: blur(calc(-1em)); }',
		'a { filter: blur(calc(-1px * 1px / 1px)); }',
		'a { FILTER: BLUR(CALC(-1PX)) !important; }',
		'a { filter: blur(calc(/* radius */ -1px)); }',
		'a { filter: blur(calc(-1px)) grayscale(50); }',
		'@media (width > 1px) { a { &:hover { filter: blur(calc(-1px)); } } }',
	],
});

for (const [directive, code] of [
	['eslint-disable-next-line', 'a {\n/* eslint-disable-next-line cssicorn/no-clamped-values -- Preserve the interpolation endpoint. */\nfilter: grayscale(2);\nopacity: 2;\n}'],
	['eslint-disable-line', 'a {\nfilter: grayscale(2); /* eslint-disable-line cssicorn/no-clamped-values -- Preserve the interpolation endpoint. */\nopacity: 2;\n}'],
]) {
	nodeTest(`${directive} suppresses only the intentional endpoint`, () => {
		const messages = new Linter().verify(code, {
			files: ['**/*.css'],
			language: 'css/css',
			plugins: {css, cssicorn: plugin},
			rules: {'cssicorn/no-clamped-values': 'error'},
		}, {filename: 'test.css'});
		assert.deepEqual(messages.map(message => message.message), ['\'opacity\' evaluates to 2, which the browser clamps to 1. Did you mean a percentage?']);
	});
}
