import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import css from '@eslint/css';
import {Linter} from 'eslint';
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

nodeTest('ordering works with duplicate and shorthand rules without circular fixes', () => {
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
