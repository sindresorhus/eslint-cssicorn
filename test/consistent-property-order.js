import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import css from '@eslint/css';
import {Linter} from 'eslint';
import {tailwind4} from 'tailwind-csstree';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);
const alphabetical = [{order: 'alphabetical'}];

test.snapshot({
	valid: [
		'a { display: flex; color: red; }',
		'a { color: red; }',
		'a { color: red; /* keep */ display: flex; }',
		'a { color: red /* keep */; display: flex; }',
		'a { color: red;\n\n display: flex; }',
		'a { color: red;\r\n\r\n display: flex; }',
		'a { color: red; --example: 1; display: flex; }',
		'a { color: red; unknown-property: 1; display: flex; }',
		'a { color: red; -webkit-appearance: none; display: flex; }',
		'a { color: red; page-break-before: always; display: flex; }',
		{code: 'a { text-orientation: sideways; glyph-orientation-vertical: 0deg; }', options: alphabetical},
		'a { color: red; &:hover {} display: flex; }',
		'a { color: red; @media screen {} display: flex; }',
		'@font-face { font-family: example; src: url(example.woff2); }',
		{code: '@font-face { font-weight: 700; font-family: example; }', options: alphabetical},
		'@property --example { initial-value: red; inherits: false; syntax: "<color>"; }',
		':export { color: red; display: flex; }',
		':import("example.css") { color: red; display: flex; }',
		{code: 'a { color: red; display: flex; }', options: alphabetical},
		{code: 'a { color: red; display: flex; }', options: [{order: ['color', 'display']}]},
		{code: 'a { color: red; width: 1px; display: flex; }', options: [{order: ['display', 'color']}]},
		{code: 'a { color: red; display: flex; }', options: [{order: ['color', 'COLOR', 'display']}]},
	],
	invalid: [
		'a { color: #fff; display: flex; }',
		'a { color: red; margin: 1px; display: flex; }',
		'a { COLOR: RED; DISPLAY: FLEX; }',
		'a { color: red !important; display: flex; }',
		'a { color: var(--color); display: var(--display); }',
		'a { color: red; display: flex }',
		'a { color: red; display: flex   }',
		'a {\n    color: red;\n    display: flex\n}',
		'a {\r\n    color: red;\r\n    display: flex\r\n}',
		'a { color : red ; display:flex; }',
		'a { color: red; display: -webkit-box; display: flex; color: oklch(50% 0.1 20); }',
		'a { margin: 1px; color: red; margin-left: 2px; display: flex; }',
		'a { color: red; display: flex; /* keep */ background: red; position: relative; }',
		'a { color: red; display: flex;\n\n background: red; position: relative; }',
		'a { color: red; display: flex; --example: 1; background: red; position: relative; }',
		'a { content: "display: none; color: red"; display: flex; }',
		'a { background: url("display:flex;color:red"); display: flex; }',
		'a { margin-left: 2px; margin: 1px; }',
		'a { background-blend-mode: multiply; background: red; }',
		'a { border-image: none; border: 1px solid; }',
		'a { white-space: nowrap; text-wrap: wrap; }',
		'a { font-size-adjust: 0.5; font: 16px serif; }',
		'a { margin-inline-start: 2px; margin-left: 1px; }',
		'a { color: red; all: initial; }',
		'a { height: 1px; width: 2px; }',
		{code: 'a { display: flex; color: red; }', options: alphabetical},
		{code: 'a { color: red; display: flex; }', options: [{order: ['DISPLAY', 'COLOR']}]},
		{code: 'a { line-height: 2; font: var(--font); }', options: [{order: ['font', 'line-height']}]},
		{code: 'a { column-wrap: wrap; columns: 2; }', options: [{order: ['columns', 'column-wrap']}]},
		{code: 'a { font-width: condensed; font-stretch: expanded; }', options: [{order: ['font-stretch', 'font-width']}]},
		{code: 'a { grid-gap: 1px; gap: 2px; }', options: alphabetical},
		{code: 'a { padding-top: 1px; padding: 2px; }', options: alphabetical},
		{code: 'a { background-position-x: left; background-position: right; }', options: alphabetical},
		{code: 'a { text-wrap-mode: wrap; white-space: nowrap; }', options: [{order: ['white-space', 'text-wrap-mode']}]},
		{code: 'a { animation-composition: add; animation: spin 1s; }', options: [{order: ['animation', 'animation-composition']}]},
		{code: 'a { font-synthesis-position: none; font-synthesis: weight; }', options: [{order: ['font-synthesis', 'font-synthesis-position']}]},
		{code: 'a { white-space-trim: discard-before; white-space: normal; }', options: [{order: ['white-space', 'white-space-trim']}]},
		'@keyframes spin { from { color: red; display: flex; } }',
		'@-webkit-keyframes spin { from { color: red; display: flex; } }',
		'a { &:hover { color: red; display: flex; } }',
		'@media screen { a { color: red; display: flex; } }',
		'@supports (display: flex) { a { color: red; display: flex; } }',
		'@container (width > 1px) { a { color: red; display: flex; } }',
		'@layer theme { a { color: red; display: flex; } }',
		'@scope (.card) { a { color: red; display: flex; } }',
		'a { @media screen { color: red; display: flex; } }',
		'a { @supports (display: flex) { color: red; display: flex; } }',
		'a { @container (width > 1px) { color: red; display: flex; } }',
		'a { @layer theme { color: red; display: flex; } }',
		'a { @scope (.card) { color: red; display: flex; } }',
	],
});

test({
	valid: [],
	invalid: [{
		code: String.raw`a { font-family: Open\ Sans\ ; display: flex; }`,
		output: String.raw`a { display: flex; font-family: Open\ Sans\ ; }`,
		errors: [{messageId: 'consistent-property-order', data: {expected: 'display', actual: 'font-family'}, suggestions: []}],
	}, {
		code: 'a { color: red; display: flex }',
		output: 'a { display: flex; color: red }',
		errors: [{messageId: 'consistent-property-order', data: {expected: 'display', actual: 'color'}, suggestions: []}],
	}, {
		code: 'a { event-trigger-source: click(); event-trigger: --example none; }',
		options: alphabetical,
		errors: [{
			messageId: 'consistent-property-order',
			data: {expected: 'event-trigger', actual: 'event-trigger-source'},
			suggestions: [{
				messageId: 'consistent-property-order/suggestion',
				output: 'a { event-trigger: --example none; event-trigger-source: click(); }',
			}],
		}],
	}, {
		code: 'a { view-timeline-inset: 20%; view-timeline: --reveal block; }',
		errors: [{
			messageId: 'consistent-property-order',
			data: {expected: 'view-timeline', actual: 'view-timeline-inset'},
			suggestions: [{
				messageId: 'consistent-property-order/suggestion',
				output: 'a { view-timeline: --reveal block; view-timeline-inset: 20%; }',
			}],
		}],
	}, {
		code: 'a { margin-left: 2px; margin: 1px; }',
		errors: [{
			messageId: 'consistent-property-order',
			data: {expected: 'margin', actual: 'margin-left'},
			suggestions: [{
				messageId: 'consistent-property-order/suggestion',
				output: 'a { margin: 1px; margin-left: 2px; }',
			}],
		}],
	}],
});

const getConfig = (options = {}) => ({
	language: 'css/css',
	plugins: {css, cssicorn: plugin},
	linterOptions: {reportUnusedDisableDirectives: 'off'},
	rules: {'cssicorn/consistent-property-order': ['error', options]},
});

const getTailwindConfig = (options = {}) => ({
	...getConfig(options),
	languageOptions: {customSyntax: tailwind4},
});

nodeTest('sorts Tailwind utility runs around nested selectors', () => {
	const linter = new Linter();
	const config = getTailwindConfig();
	const code = '@utility card { color: red; display: flex; &:hover { color: blue; display: block; } color: green; display: grid; }';
	assert.equal(linter.verify(code, config).length, 3);
	const result = linter.verifyAndFix(code, config);
	assert.equal(result.output, '@utility card { display: flex; color: red; &:hover { display: block; color: blue; } display: grid; color: green; }');
	assert.equal(result.fixed, true);
	assert.deepEqual(result.messages, []);
	assert.equal(linter.verifyAndFix(result.output, config).fixed, false);
});

nodeTest('functional utility fallbacks retain their order', () => {
	const linter = new Linter();
	const config = getTailwindConfig({order: ['display', 'tab-size', 'color']});
	const result = linter.verifyAndFix('@utility tab-* { tab-size: --value(integer); tab-size: --value([integer]); color: red; display: flex; }', config);
	assert.equal(result.output, '@utility tab-* { display: flex; tab-size: --value(integer); tab-size: --value([integer]); color: red; }');
	assert.equal(result.fixed, true);
	assert.deepEqual(result.messages, []);
});

nodeTest('sorts nested Tailwind variants and grouping blocks', () => {
	const linter = new Linter();
	for (const [code, output] of [
		['a { @variant hover { color: red; display: flex; } }', 'a { @variant hover { display: flex; color: red; } }'],
		['@utility card { @variant hover { @variant focus { color: red; display: flex; } } }', '@utility card { @variant hover { @variant focus { display: flex; color: red; } } }'],
		['a { @media screen { @variant hover { color: red; display: flex; } } }', 'a { @media screen { @variant hover { display: flex; color: red; } } }'],
	]) {
		const result = linter.verifyAndFix(code, getTailwindConfig());
		assert.equal(result.output, output);
		assert.equal(result.fixed, true);
		assert.deepEqual(result.messages, []);
	}

	for (const grouping of ['media screen', 'supports (display: flex)', 'container (width > 1px)', 'layer theme', 'scope (.card)', 'starting-style']) {
		const result = linter.verifyAndFix('@utility card { @' + grouping + ' { @variant hover { color: red; display: flex; } } }', getTailwindConfig());
		assert.equal(result.output, '@utility card { @' + grouping + ' { @variant hover { display: flex; color: red; } } }');
		assert.equal(result.fixed, true);
		assert.deepEqual(result.messages, []);
	}
});

nodeTest('Tailwind apply directives and compiler markers stay between declaration runs', () => {
	const linter = new Linter();
	for (const boundary of ['@apply block;', '--tw-sort: custom;']) {
		const code = '@utility card { color: red; display: flex; ' + boundary + ' color: blue; display: grid; }';
		const config = getTailwindConfig();
		assert.equal(linter.verify(code, config).length, 2);
		const result = linter.verifyAndFix(code, config);
		assert.equal(result.output, '@utility card { display: flex; color: red; ' + boundary + ' display: grid; color: blue; }');
		assert.equal(result.fixed, true);
		assert.deepEqual(result.messages, []);
	}
});

nodeTest('Tailwind context support keeps templates, comments, and suppression boundaries', () => {
	const linter = new Linter();
	for (const code of [
		'@variant hover { color: red; display: flex; }',
		'@theme { color: red; display: flex; }',
		'@custom-variant card { @variant hover { color: red; display: flex; @slot; } }',
		'@plugin "example" { color: red; display: flex; }',
		'@utility card { @unknown { color: red; display: flex; } }',
		'@utility card { color: red; /* keep */ display: flex; }',
		'a { @variant hover {\n/* eslint-disable-next-line cssicorn/lowercase */\ncolor: red;\ndisplay: flex;\n} }',
	]) {
		const result = linter.verifyAndFix(code, getTailwindConfig());
		assert.equal(result.output, code);
		assert.equal(result.fixed, false);
		assert.deepEqual(result.messages, []);
	}
});

nodeTest('Tailwind shorthand reversals remain suggestions', () => {
	const linter = new Linter();
	const config = getTailwindConfig();
	const code = '@utility card { @variant hover { margin-left: 2px; margin: 1px; } }';
	const result = linter.verifyAndFix(code, config);
	assert.equal(result.output, code);
	assert.equal(result.fixed, false);
	assert.equal(result.messages.length, 1);
	const [{fix: {range, text}}] = result.messages[0].suggestions;
	const output = code.slice(0, range[0]) + text + code.slice(range[1]);
	assert.equal(output, '@utility card { @variant hover { margin: 1px; margin-left: 2px; } }');
	assert.deepEqual(linter.verify(output, config), []);
});

nodeTest('prefixed line clamp supports alphabetical and custom orders while preserving fallbacks', () => {
	const linter = new Linter();
	const code = 'a { color: red; -webkit-line-clamp: 2; -webkit-line-clamp: var(--lines); display: -webkit-box; }';
	for (const order of ['alphabetical', ['-webkit-line-clamp', 'color', 'display']]) {
		const result = linter.verifyAndFix(code, getConfig({order}));
		assert.equal(result.output, 'a { -webkit-line-clamp: 2; -webkit-line-clamp: var(--lines); color: red; display: -webkit-box; }');
		assert.equal(result.fixed, true);
		assert.deepEqual(result.messages, []);
	}

	assert.deepEqual(linter.verify(code, getConfig()), []);
	assert.equal(linter.verifyAndFix(code, getConfig()).output, code);
});

nodeTest('prefixed line clamp conflicts with its components, unprefixed shorthand, and all', () => {
	const linter = new Linter();
	for (const property of ['max-lines', 'block-ellipsis', 'continue', 'line-clamp', 'all']) {
		const config = getConfig({order: [property, '-webkit-line-clamp']});
		const code = 'a { -WEBKIT-LINE-CLAMP: var(--lines) !important; ' + property + ': initial; }';
		const result = linter.verifyAndFix(code, config);
		assert.equal(result.output, code);
		assert.equal(result.fixed, false);
		assert.equal(result.messages.length, 1);
		const [{fix: {range, text}}] = result.messages[0].suggestions;
		const output = code.slice(0, range[0]) + text + code.slice(range[1]);
		assert.equal(output, 'a { ' + property + ': initial; -WEBKIT-LINE-CLAMP: var(--lines) !important; }');
		assert.deepEqual(linter.verify(output, config), []);
	}
});

nodeTest('default ordering gives font-width the font-stretch rank and preserves alias fallbacks', () => {
	const linter = new Linter();
	const config = getConfig();
	const code = 'a { FONT-WIDTH: condensed; font-stretch: expanded; font-width: 75%; color: red; display: flex; }';
	const result = linter.verifyAndFix(code, config);
	assert.equal(result.output, 'a { display: flex; color: red; FONT-WIDTH: condensed; font-stretch: expanded; font-width: 75%; }');
	assert.equal(result.fixed, true);
	assert.deepEqual(result.messages, []);
	assert.equal(linter.verifyAndFix(result.output, config).fixed, false);
});

nodeTest('alphabetical and custom ordering retain explicit font alias ranks', () => {
	const linter = new Linter();
	const code = 'a { font-width: condensed; font-stretch: expanded; }';
	for (const options of [{order: 'alphabetical'}, {order: ['font-stretch', 'font-width']}]) {
		const result = linter.verifyAndFix(code, getConfig(options));
		assert.equal(result.output, code);
		assert.equal(result.fixed, false);
		assert.equal(result.messages.length, 1);
		const [{fix: {range, text}}] = result.messages[0].suggestions;
		assert.equal(code.slice(0, range[0]) + text + code.slice(range[1]), 'a { font-stretch: expanded; font-width: condensed; }');
	}
});

nodeTest('standardized prefixed text properties participate in default ordering', () => {
	const linter = new Linter();
	for (const property of ['-webkit-text-fill-color', '-webkit-text-stroke', '-webkit-text-stroke-width', '-WEBKIT-TEXT-STROKE-COLOR']) {
		const result = linter.verifyAndFix('a { color: red; ' + property + ': initial; display: flex; }', getConfig());
		assert.equal(result.output, 'a { display: flex; ' + property + ': initial; color: red; }');
		assert.equal(result.fixed, true);
		assert.deepEqual(result.messages, []);
	}

	const result = linter.verifyAndFix('a { color: red; -webkit-text-stroke: 1px black; -webkit-text-stroke: 2px blue; display: flex; }', getConfig());
	assert.equal(result.output, 'a { display: flex; -webkit-text-stroke: 1px black; -webkit-text-stroke: 2px blue; color: red; }');
	assert.deepEqual(result.messages, []);
});

nodeTest('newly supported properties retain cascade-conflict suggestions', () => {
	const linter = new Linter();
	for (const [code, output] of [
		['a { font-width: condensed; font: 16px serif; }', 'a { font: 16px serif; font-width: condensed; }'],
		['a { -webkit-text-stroke-width: 2px; -webkit-text-stroke: var(--stroke); }', 'a { -webkit-text-stroke: var(--stroke); -webkit-text-stroke-width: 2px; }'],
		['a { -webkit-text-stroke-color: red; -webkit-text-stroke: 1px blue; }', 'a { -webkit-text-stroke: 1px blue; -webkit-text-stroke-color: red; }'],
		['a { -webkit-text-fill-color: red; all: initial; }', 'a { all: initial; -webkit-text-fill-color: red; }'],
		['@position-try --fallback { margin-left: 2px; margin: 1px; }', '@position-try --fallback { margin: 1px; margin-left: 2px; }'],
		['@position-try --fallback { margin-inline-start: 2px; margin-left: 1px; }', '@position-try --fallback { margin-left: 1px; margin-inline-start: 2px; }'],
		['@page { margin-left: 2cm; margin: 1cm; }', '@page { margin: 1cm; margin-left: 2cm; }'],
	]) {
		const result = linter.verifyAndFix(code, getConfig());
		assert.equal(result.output, code);
		assert.equal(result.fixed, false);
		assert.equal(result.messages.length, 1);
		assert.equal(result.messages[0].suggestions.length, 1);
		const [{fix: {range, text}}] = result.messages[0].suggestions;
		const suggestedOutput = code.slice(0, range[0]) + text + code.slice(range[1]);
		assert.equal(suggestedOutput, output);
		assert.deepEqual(linter.verify(suggestedOutput, getConfig()), []);
	}
});

nodeTest('position-try fixes preserve casing, CRLF, and an omitted final semicolon', () => {
	const linter = new Linter();
	const result = linter.verifyAndFix('@POSITION-TRY --fallback {\r\n  margin: 1px;\r\n  top: 2px\r\n}', getConfig());
	assert.equal(result.output, '@POSITION-TRY --fallback {\r\n  top: 2px;\r\n  margin: 1px\r\n}');
	assert.equal(result.fixed, true);
	assert.deepEqual(result.messages, []);
});

nodeTest('sorts page runs before, inside, and after a margin box', () => {
	const linter = new Linter();
	const code = '@page { padding: 1cm; margin: 2cm; @top-left { color: red; content: "Header"; } color: blue; background: white; }';
	const config = getConfig();
	assert.equal(linter.verify(code, config).length, 3);
	const result = linter.verifyAndFix(code, config);
	assert.equal(result.output, '@page { margin: 2cm; padding: 1cm; @top-left { content: "Header"; color: red; } background: white; color: blue; }');
	assert.equal(result.fixed, true);
	assert.deepEqual(result.messages, []);
	assert.equal(linter.verifyAndFix(result.output, config).fixed, false);
});

nodeTest('all sixteen page margin boxes support ordinary property ordering', () => {
	const linter = new Linter();
	for (const name of [
		'top-left-corner',
		'top-left',
		'top-center',
		'top-right',
		'top-right-corner',
		'bottom-left-corner',
		'bottom-left',
		'bottom-center',
		'bottom-right',
		'bottom-right-corner',
		'left-top',
		'left-middle',
		'left-bottom',
		'right-top',
		'right-middle',
		'right-bottom',
	]) {
		const result = linter.verifyAndFix('@PAGE { @' + name.toUpperCase() + ' { color: red; content: "Header"; } }', getConfig());
		assert.equal(result.output, '@PAGE { @' + name.toUpperCase() + ' { content: "Header"; color: red; } }');
		assert.equal(result.fixed, true);
		assert.deepEqual(result.messages, []);
	}
});

nodeTest('new declaration contexts keep comments, directives, and unsupported descriptors fixed', () => {
	const linter = new Linter();
	for (const code of [
		'@position-try --fallback { margin: 1px; /* keep */ top: 2px; }',
		'@page { @top-left { color: red; /* keep */ content: "Header"; } }',
		'@position-try --fallback {\nmargin: 1px; /* eslint-disable-line cssicorn/lowercase */\ntop: 2px;\n}',
		'@page { @top-left {\n/* eslint-disable-next-line cssicorn/lowercase */\nCOLOR: RED;\ncontent: "Header";\n} }',
	]) {
		const result = linter.verifyAndFix(code, getConfig());
		assert.equal(result.output, code);
		assert.equal(result.fixed, false);
		assert.deepEqual(result.messages, []);
	}
});

nodeTest('unsupported page descriptors remain boundaries in every ordering mode', () => {
	const linter = new Linter();
	const code = '@page { color: red; page-orientation: upright; background: white; }';
	for (const order of ['concentric-css', 'alphabetical', ['background', 'page-orientation', 'color']]) {
		const result = linter.verifyAndFix(code, getConfig({order}));
		assert.equal(result.output, code);
		assert.equal(result.fixed, false);
		assert.deepEqual(result.messages, []);
	}
});

nodeTest('page-margin and position-try context admission stays narrow', () => {
	const linter = new Linter();
	for (const code of [
		'@top-left { content: "Header"; color: red; }',
		'@page { @media print { @top-left { content: "Header"; color: red; } } }',
		'@position-try --fallback { @unknown { top: 2px; margin: 1px; } }',
		'@font-face { font-weight: 700; font-family: example; }',
	]) {
		const result = linter.verifyAndFix(code, getConfig({order: 'alphabetical'}));
		assert.equal(result.output, code);
		assert.equal(result.fixed, false);
		assert.deepEqual(result.messages, []);
	}
});

nodeTest('supported properties missing from the default catalog remain boundaries', () => {
	const linter = new Linter();
	const code = 'a { color: red; interpolate-size: allow-keywords; display: flex; }';
	const result = linter.verifyAndFix(code, getConfig());
	assert.equal(result.output, code);
	assert.equal(result.fixed, false);
	assert.deepEqual(result.messages, []);

	const alphabeticalResult = linter.verifyAndFix(code, getConfig({order: 'alphabetical'}));
	assert.equal(alphabeticalResult.output, 'a { color: red; display: flex; interpolate-size: allow-keywords; }');
	assert.equal(alphabeticalResult.fixed, true);
	assert.deepEqual(alphabeticalResult.messages, []);
});

nodeTest('sorts independent declaration runs before, inside, and after a nested rule', () => {
	const linter = new Linter();
	const config = getConfig();
	const code = 'a { color: red; display: flex; &:hover { color: blue; display: block; } color: green; display: grid; }';
	const messages = linter.verify(code, config);
	assert.equal(messages.length, 3);

	const result = linter.verifyAndFix(code, config);
	assert.equal(result.output, 'a { display: flex; color: red; &:hover { display: block; color: blue; } display: grid; color: green; }');
	assert.equal(result.fixed, true);
	assert.deepEqual(result.messages, []);
	assert.equal(linter.verifyAndFix(result.output, config).fixed, false);
});

nodeTest('autofixes preserve fallbacks and are idempotent', () => {
	const linter = new Linter();
	const config = getConfig();
	const code = 'a { color: red; display: -webkit-box; display: flex; color: oklch(50% 0.1 20); }';
	const result = linter.verifyAndFix(code, config);
	assert.equal(result.output, 'a { display: -webkit-box; display: flex; color: red; color: oklch(50% 0.1 20); }');
	assert.deepEqual(result.messages, []);
	assert.equal(result.fixed, true);
	assert.equal(linter.verifyAndFix(result.output, config).fixed, false);
});

nodeTest('unsafe reordering remains unchanged until its suggestion is applied', () => {
	const linter = new Linter();
	const config = getConfig();
	const code = 'a { white-space: nowrap; text-wrap: wrap; }';
	const result = linter.verifyAndFix(code, config);
	assert.equal(result.output, code);
	assert.equal(result.fixed, false);
	assert.equal(result.messages.length, 1);
	const [suggestion] = result.messages[0].suggestions;
	const {range, text} = suggestion.fix;
	const output = code.slice(0, range[0]) + text + code.slice(range[1]);
	assert.equal(output, 'a { text-wrap: wrap; white-space: nowrap; }');
	assert.deepEqual(linter.verify(output, config), []);
});

nodeTest('unchanged interacting pairs do not prevent an autofix', () => {
	const linter = new Linter();
	const result = linter.verifyAndFix('a { color: red; display: flex; margin: 1px; margin-left: 2px; }', getConfig());
	assert.equal(result.output, 'a { display: flex; margin: 1px; margin-left: 2px; color: red; }');
	assert.equal(result.fixed, true);
	assert.deepEqual(result.messages, []);
});

nodeTest('one reversed interacting pair makes the complete reorder a suggestion', () => {
	const linter = new Linter();
	const config = getConfig();
	const code = 'a { color: red; margin-left: 2px; display: flex; margin: 1px; }';
	const result = linter.verifyAndFix(code, config);
	assert.equal(result.output, code);
	assert.equal(result.fixed, false);
	assert.equal(result.messages.length, 1);
	assert.equal(result.messages[0].suggestions.length, 1);
	const [{fix: {range, text}}] = result.messages[0].suggestions;
	const output = code.slice(0, range[0]) + text + code.slice(range[1]);
	assert.equal(output, 'a { display: flex; margin: 1px; margin-left: 2px; color: red; }');
	assert.deepEqual(linter.verify(output, config), []);
});

nodeTest('long whitespace inside a declaration is preserved', () => {
	const linter = new Linter();
	const whitespace = ' '.repeat(50_000);
	const result = linter.verifyAndFix('a { color:' + whitespace + 'red; display: flex }', getConfig());
	assert.equal(result.output, 'a { display: flex; color:' + whitespace + 'red }');
	assert.equal(result.fixed, true);
	assert.deepEqual(result.messages, []);
});

nodeTest('sorts declarations inside nested starting styles', () => {
	const linter = new Linter();
	const result = linter.verifyAndFix('a { @starting-style { color: red; display: flex; } }', getConfig());
	assert.equal(result.output, 'a { @starting-style { display: flex; color: red; } }');
	assert.equal(result.fixed, true);
	assert.deepEqual(result.messages, []);
});

nodeTest('preserves CRLF inside moved multiline values', () => {
	const linter = new Linter();
	const result = linter.verifyAndFix('a {\r\n  background: linear-gradient(\r\n    red,\r\n    blue\r\n  );\r\n  display: flex;\r\n}', getConfig());
	assert.equal(result.output, 'a {\r\n  display: flex;\r\n  background: linear-gradient(\r\n    red,\r\n    blue\r\n  );\r\n}');
	assert.equal(result.fixed, true);
	assert.deepEqual(result.messages, []);
});

nodeTest('suggestions preserve CRLF, multiline values, and an omitted final semicolon', () => {
	const linter = new Linter();
	const config = getConfig();
	const code = 'a {\r\n  margin-left: 2px;\r\n  margin: var(\r\n    --space,\r\n    1px\r\n  )\r\n}';
	const result = linter.verifyAndFix(code, config);
	assert.equal(result.output, code);
	assert.equal(result.fixed, false);
	assert.equal(result.messages.length, 1);
	assert.equal(result.messages[0].suggestions.length, 1);
	const [{fix: {range, text}}] = result.messages[0].suggestions;
	const output = code.slice(0, range[0]) + text + code.slice(range[1]);
	assert.equal(output, 'a {\r\n  margin: var(\r\n    --space,\r\n    1px\r\n  );\r\n  margin-left: 2px\r\n}');
	assert.deepEqual(linter.verify(output, config), []);
});

nodeTest('line directives do not change their target', () => {
	const linter = new Linter();
	for (const code of [
		'a {\n/* eslint-disable-next-line cssicorn/lowercase */\nCOLOR: RED;\ndisplay: flex;\n}',
		'a {\ncolor: red; /* eslint-disable-line cssicorn/lowercase */\ndisplay: flex;\n}',
		'/* eslint-disable-next-line cssicorn/lowercase */\na { color: red; display: flex; }',
	]) {
		assert.deepEqual(linter.verify(code, getConfig()), []);
		assert.equal(linter.verifyAndFix(code, getConfig()).output, code);
	}
});

nodeTest('rejects invalid ordering options', () => {
	const linter = new Linter();
	for (const options of [
		{order: []},
		{order: ['color', 'color']},
		{order: 'smacss'},
		{order: [1]},
		{order: true},
		{unknown: true},
	]) {
		assert.throws(() => linter.verify('a {}', getConfig(options)), /Key "rules"/v);
	}
});

nodeTest('custom orders cannot enable unsupported properties', () => {
	const linter = new Linter();
	for (const property of ['--example', 'unknown-property', '-webkit-appearance', 'page-break-before', 'glyph-orientation-vertical']) {
		const code = 'a { color: red; ' + property + ': initial; display: flex; }';
		const config = getConfig({order: ['display', property, 'color']});
		assert.deepEqual(linter.verify(code, config), []);
		assert.equal(linter.verifyAndFix(code, config).output, code);
	}
});

nodeTest('shorthands with incomplete interaction metadata remain boundaries', () => {
	const linter = new Linter();
	for (const [property, rowValue, shorthandValue] of [
		['rule-inset-cap', '1px', '2px'],
		['rule-inset-junction', '1px', '2px'],
		['rule-visibility-items', 'around', 'between'],
	]) {
		const rowProperty = 'row-' + property;
		for (const [code, options] of [
			['a { ' + rowProperty + ': ' + rowValue + '; ' + property + ': ' + shorthandValue + '; }', {order: [property, rowProperty]}],
			['a { ' + property + ': ' + shorthandValue + '; ' + rowProperty + ': ' + rowValue + '; }', {order: 'alphabetical'}],
			['a { color: red; ' + property + ': ' + shorthandValue + '; display: flex; }', {order: ['display', property, 'color']}],
		]) {
			const result = linter.verifyAndFix(code, getConfig(options));
			assert.equal(result.output, code);
			assert.equal(result.fixed, false);
			assert.deepEqual(result.messages, []);
		}
	}
});

nodeTest('ordering converges with shorthand fixes and duplicate suggestions', () => {
	const linter = new Linter();
	const config = getConfig();
	config.rules['cssicorn/no-duplicate-properties'] = 'error';
	config.rules['cssicorn/no-redundant-longhand-properties'] = 'error';
	const code = 'a { color: red; color: red; margin-top: 1px; margin-right: 1px; margin-bottom: 1px; margin-left: 1px; display: flex; }';
	const messages = linter.verify(code, config);
	for (const rule of ['consistent-property-order', 'no-duplicate-properties', 'no-redundant-longhand-properties']) {
		assert.equal(messages.some(message => message.ruleId === 'cssicorn/' + rule), true, rule);
	}

	const result = linter.verifyAndFix(code, config);
	assert.equal(result.output, 'a { display: flex; margin: 1px; color: red; color: red; }');
	assert.equal(result.fixed, true);
	assert.equal(result.messages.length, 1);
	assert.equal(result.messages[0].ruleId, 'cssicorn/no-duplicate-properties');
	assert.equal(result.messages[0].suggestions.length, 1);
	assert.equal(linter.verifyAndFix(result.output, config).fixed, false);

	const [{fix: {range, text}}] = result.messages[0].suggestions;
	const output = result.output.slice(0, range[0]) + text + result.output.slice(range[1]);
	assert.equal(output, 'a { display: flex; margin: 1px; color: red; }');
	assert.deepEqual(linter.verify(output, config), []);
});

nodeTest('ordering preserves fallbacks when duplicate and shorthand rules are enabled', () => {
	const linter = new Linter();
	const config = getConfig();
	config.rules['cssicorn/no-duplicate-properties'] = 'error';
	config.rules['cssicorn/no-redundant-longhand-properties'] = 'error';
	const result = linter.verifyAndFix('a { color: red; display: -webkit-box; display: flex; margin: 1px; margin-left: 2px; }', config);
	assert.equal(result.output, 'a { display: -webkit-box; display: flex; margin: 1px; margin-left: 2px; color: red; }');
	assert.deepEqual(result.messages, []);
	assert.equal(linter.verifyAndFix(result.output, config).fixed, false);
});

test.snapshot({
	testerOptions: {languageOptions: {tolerant: true}},
	valid: ['a { color: ???; display: flex; }', 'a { color: red; ???; display: flex; }'],
	invalid: [],
});
