import assert from 'node:assert/strict';
import fs from 'node:fs';
import nodeTest from 'node:test';
import css from '@eslint/css';
import {Linter} from 'eslint';
import {getTester} from './utils/test.js';

const {test, rule} = getTester(import.meta);
const options = [{customProperties: ['--shared', '--brand']}];
const configured = code => ({code, options});

test.snapshot({
	valid: [
		'a { color: var(--brand, purple); } b { color: var(--brand, blue); }',
		{code: 'a { color: var(--brand, purple); color: var(--brand, blue); }', options: [{customProperties: []}]},
		...[
			'a { color: var(--other, red); color: var(--other, blue); }',
			'a { color: var(--brand, purple); } b { color: var(--brand, purple); }',
			'a { color: var(--brand, red); color: var(--Brand, blue); }',
			'a { color: var(--brand, red); margin: var(--shared, 1px); }',
			'a { color: var(--brand); color: var(--brand, blue); }',
			'a { --a: var(--shared,); --b: var(--shared, /* empty */); }',
			'a { margin: var(--shared, 1px 2px); padding: var(--shared, 1px /* keep */ 2px); }',
			'a { font-family: var(--shared, Arial, sans-serif); font-family: var(--shared, Arial , sans-serif); }',
			'a { width: var(--shared, calc(100% - 2px)); height: var(--shared, calc( 100% - 2px )); }',
			'a { color: var(--brand, rgb(1 2 3)); color: var(--brand, rgb( 1 2 3 )); }',
			'a { color: var(--brand, red); background-color: var(--brand, #f00); border-color: var(--brand, rgb(255 0 0)); }',
			'a { COLOR: VAR(--brand, RED); background-color: var(--brand, #ff0000); }',
			'a { margin: var(--shared, 01PX); padding: var(--shared, +1.0px); }',
			'a { opacity: var(--shared, 1.0); opacity: var(--shared, +1.00); }',
			'a { width: var(--shared, 01%); width: var(--shared, +1.0%); }',
			'a { content: var(--shared, "hello"); content: var(--shared, \'hello\'); }',
			'a { color: var(--brand, var(--other, red)); color: var(--brand, blue); }',
			'a { width: var(--shared, calc(env(safe-area-inset-top) + 1px)); height: var(--shared, 2px); }',
			'a { width: var(--shared, attr(data-width px)); height: var(--shared, 2px); }',
			'a { width: var(--shared, random(1px, 2px)); height: var(--shared, 2px); }',
			'a { width: var(--shared, --custom()); height: var(--shared, 2px); }',
			'a { width: var(--shared, first-valid(1px, 2px)); height: var(--shared, 2px); }',
			'a { content: "var(--brand, red)"; background: url("var(--brand, blue)"); color: var(--brand, green); }',
			'a { --a: var(--shared, [a]); --b: var(--shared, [a]); }',
			String.raw`a { color: var(--br\61 nd, red); color: var(--brand, red); }`,
			String.raw`a { animation-name: var(--shared, f\6f o); animation-name: var(--shared, foo); }`,
			String.raw`a { content: var(--shared, "h\65 llo"); content: var(--shared, "hello"); }`,
		].map(code => configured(code)),
	],
	invalid: [
		...[
			'.button { color: var(--brand, purple); } .link { color: var(--brand, blue); }',
			'a { color: var(--brand, red); color: var(--brand, blue); color: var(--brand, blue); }',
			'a { --a: var(--brand, red); --b: var(--brand, blue); }',
			'a { margin: var(--shared, 1px 2px); padding: var(--shared, 1px 3px); }',
			'a { font-family: var(--shared, Arial, sans-serif); font-family: var(--shared, Arial, serif); }',
			'a { width: var(--shared, calc(100% - 2px)); height: var(--shared, calc(100% - 3px)); }',
			'a { color: var(--brand, rgb(1 2 3)); color: var(--brand, rgb(1 2 4)); }',
			'a { --a: var(--shared,); --b: var(--shared, red); }',
			'a { --a: var(--shared, red); --b: var(--shared,); }',
			'a { color: var(--brand); color: var(--brand, red); color: var(--brand, blue); }',
			'a { color: var(--other, var(--brand, red)); color: var(--brand, blue); }',
			'a { color: var(--brand, var(--brand, red)); color: var(--brand, blue); }',
			'a { margin: var(--shared, 1px) var(--shared, 2px); }',
			'a { animation-name: var(--shared, RED); animation-name: var(--shared, red); }',
			'a { --a: var(--brand, red); --b: var(--brand, #f00); }',
			'a { border: 1px solid var(--brand, red); color: var(--brand, #f00); }',
			'a { unknown: var(--brand, red); color: var(--brand, #f00); }',
			'a { opacity: var(--shared, 1); opacity: var(--shared, 1.0); }',
			'a { width: var(--shared, 0px); width: var(--shared, -0px); }',
			'a { opacity: var(--shared, 0); opacity: var(--shared, -0); }',
			'a { width: var(--shared, 1px); width: var(--shared, 1em); }',
			'a { width: var(--shared, calc(1px + 2px)); width: var(--shared, 3px); }',
			'a { --a: var(--shared, foo/**/bar); --b: var(--shared, foobar); }',
			'a { content: var(--shared, "var(--x)"); content: var(--shared, "var(--y)"); }',
			'a { background: var(--shared, url("a.png")); background: var(--shared, url("b.png")); }',
			'a { background: var(--shared, url(a.png)); background: var(--shared, URL(a.png)); }',
			'a { color: var(--brand, red) !important; } @media screen { b { color: var(--brand, blue); } }',
			'@supports (display: grid) { a { color: var(--brand, red); } } @container (width > 1px) { b { color: var(--brand, blue); } }',
			'@layer theme { a { color: var(--brand, red); & b { color: var(--brand, blue); } } }',
			'@scope (.card) { a { color: var(--brand, red); } b { color: var(--brand, blue); } }',
			'@property --brand { syntax: "<color>"; inherits: true; initial-value: red; } a { --brand: red; color: var(--brand, red); color: var(--brand, blue); }',
			'a {\r\n    color: var(--brand, red);\r\n    color: var(--brand, /* keep */ blue);\r\n}',
			String.raw`a { color: v\61 r(--brand, red); color: var(--br\61 nd, blue); }`,
		].map(code => configured(code)),
	],
});

test({
	valid: [],
	invalid: [{
		code: 'a { color: var(--brand, purple); }\nb { color: var(--brand, blue); }',
		options,
		errors: [{
			messageId: 'consistent-custom-property-fallbacks', data: {property: '--brand', line: 1, column: 12}, line: 2, column: 12, endLine: 2, endColumn: 30,
		}],
	}],
});

const linter = new Linter();
const config = {
	files: ['**'],
	language: 'css/css',
	plugins: {css, test: {rules: {fallbacks: rule}}},
	rules: {'test/fallbacks': ['error', ...options]},
};

nodeTest('fallback references are isolated between files', () => {
	assert.deepEqual(linter.verify('a { color: var(--brand, red); }', config, {filename: 'a.css'}), []);
	assert.deepEqual(linter.verify('b { color: var(--brand, blue); }', config, {filename: 'b.css'}), []);
});

for (const customProperties of [['color'], ['--'], ['--brand', '--brand'], [1]]) {
	nodeTest(`reject invalid customProperties: ${JSON.stringify(customProperties)}`, () => {
		assert.throws(() => linter.verify('a {}', {...config, rules: {'test/fallbacks': ['error', {customProperties}]}}, {filename: 'a.css'}), /invalid|must|should/v);
	});
}

for (const value of ['var(--brand, [red)', 'var(--brand, "red\n)', 'var(--brand, url(bad url))']) {
	nodeTest(`malformed tolerant value does not crash: ${JSON.stringify(value)}`, () => {
		const messages = linter.verify(`a { --a: ${value}; }`, {...config, languageOptions: {tolerant: true}}, {filename: 'a.css'});
		assert.equal(messages.some(message => message.ruleId === 'test/fallbacks'), false);
	});
}

nodeTest('documentation examples match their annotations', () => {
	const documentation = fs.readFileSync(new URL('../docs/rules/consistent-custom-property-fallbacks.md', import.meta.url), 'utf8');
	const blocks = documentation.matchAll(/```css\n(?<code>[\s\S]*?)```/gv).toArray();
	assert.ok(blocks.length > 0);
	for (const block of blocks) {
		for (const example of block.groups.code.matchAll(/\/\* (?<annotation>❌|✅) \*\/(?<code>[\s\S]*?)(?=\/\* (?:❌|✅) \*\/|$)/gv)) {
			const messages = linter.verify(example.groups.code, config, {filename: 'example.css'});
			assert.equal(messages.length, example.groups.annotation === '❌' ? 1 : 0);
		}
	}
});
