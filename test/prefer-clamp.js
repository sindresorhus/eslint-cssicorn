import assert from 'node:assert/strict';
import {test as nodeTest} from 'node:test';
import {Linter} from 'eslint';
import css from '@eslint/css';
import {getTester} from './utils/test.js';

const {rule, test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { width: clamp(10px, 5vw, 100px); height: min(5vw, 100px); }',
		'a { width: max(10px, max(5vw, 100px)); }',
		'a { width: min(10px, min(5vw, 100px)); }',
		'a { width: max(10px, min(5vw, 100px) + 1px); }',
		'a { width: max(min(1px, 2px), min(3px, 4px)); }',
		'a { width: min(max(1px, 2px), max(3px, 4px)); }',
		'a { width: max(10px, min(5vw, 100px, 200px)); }',
		'a { width: max(10px, min(5vw, 100px), 200px); }',
		'a { width: max(min(5vw, 100px)); }',
		'a { width: max(10px, min(5vw)); }',
		'a { width: max(10px, min()); }',
		'a { width: max(10px, min(, 100px)); }',
		'a { width: max(10px, min(5vw,)); }',
		'a { width: max(, min(5vw, 100px)); }',
		'a { width: max(/* empty */, min(5vw, 100px)); }',
		'a { --size: max(10px, min(/* empty */, 100px)); }',
		'a { width: min(50px, max(100px, 5vw)); }',
		'a { width: min(10px, max(5vw, 100px)); }',
		'a { width: min(100px, max(1rem, 5vw)); }',
		'a { width: min(100px, max(0, 5vw)); }',
		'a { width: min(100px, max(calc(10px), 5vw)); }',
		'a { width: min(calc(100px), max(10px, 5vw)); }',
		'a { width: min(100%, max(10%, 5vw)); }',
		'a { background-position: min(100%, max(10%, 5px)); }',
		'a { opacity: min(1e999, max(0, .5)); }',
		'a { opacity: min(1, max(-1e999, calc(.5))); }',
		'a { opacity: min(calc(-1 * 0), max(0, .5)); }',
		'a { width: max(none, min(5vw, 100px)); }',
		'a { width: max(10px, min(5vw, none)); }',
		String.raw`a { width: max(10px, min(5vw, n\6f ne)); }`,
		'a { width: max(var(--minimum), min(5vw, 100px)); }',
		'a { width: max(10px, min(var(--value, 5vw, 10vw), 100px)); }',
		'a { width: max(10px, min(5vw, env(safe-area-inset-top))); }',
		'a { width: max(10px, min(attr(data-width px), 100px)); }',
		'a { width: max(10px, min(calc(var(--width)), 100px)); }',
		'a { width: max(10px, min(--value(), 100px)); }',
		'a { width: max(10px, min(random(1px, 100px), 100px)); }',
		String.raw`a { width: max(10px, min(R\41 NDOM(1px, 100px), 100px)); }`,
		'a { --width: max(var(--minimum), min(5vw, 100px)); }',
		'a { --width: "max(10px, min(5vw, 100px))"; --image: url("max(10px, min(5vw, 100px))"); }',
		'a { content: "max(10px, min(5vw, 100px))"; background: url("max(10px, min(5vw, 100px))"); }',
		':export { width: max(10px, min(5vw, 100px)); --size: max(10px, min(5vw, 100px)); }',
		':import("./theme.css") { size: max(10px, min(5vw, 100px)); }',
		'@supports (width: max(10px, min(5vw, 100px))) { a { width: 1px; } }',
		'@supports (--size: max(10px, min(5vw, 100px))) { a { width: 1px; } }',
		'@media (width: max(10px, min(5vw, 100px))) { a { width: 1px; } }',
	],
	invalid: [
		'a { width: max(min(5vw, 100px), 10px); }',
		'a { width: max(10px, min(100px, 5vw)); }',
		'a { width: max(100px, min(5vw, 10px)); }',
		'a { width: max(10% + 1px, min(5vw * 2, 100px - 1px)); }',
		'a { width: calc(1px + max(10px, min(5vw, 100px))); }',
		'a { transform: translateX(max(10px, min(5vw, 100px))); }',
		'a { WIDTH: MAX(10px, MIN(5vw, 100px)) !important; }',
		String.raw`a { width: m\61 x(10p\78, m\69 n(5vw, 100p\78)); }`,
		'a { width: max(10px, min(calc(5vw + 1px), 100px)); }',
		'a { width: max(10px, min(max(2px, min(3vw, 20px)), 100px)); }',
		'a { width: max(10px, min(5vw, 100px)); height: max(1rem, min(5vh, 10rem)); }',
		'a { --size: max(10px, min(5vw, 100px)) !important; }',
		'a { --size: min(100px, max(10px, 5vw)); }',
		'a { --size: calc(1px + max(10px, min(5vw, 100px))); }',
		'a { --size: max(/* low */ 10px, min(/* value */ 5vw, 100px /* high */)); }',
		'a { width: min(100px, max(10px, 5vw)); }',
		'a { width: min(max(10px, 5vw), 100px); }',
		'a { width: min(100px, max(5vw, 10px)); }',
		'a { width: min(max(5vw, 10px), 100px); }',
		'a { width: min(10px, max(10px, 5vw)); }',
		'a { left: min(-10px, max(-100px, 5vw)); }',
		'a { opacity: min(1, max(0, .5)); }',
		'a { opacity: min(0, max(-0, .5)); }',
		'a { transition-duration: min(100ms, max(10ms, 5ms)); }',
		'a { width: min(10rem, max(1rem, 5vw)); }',
		String.raw`a { width: MIN(100P\58, MAX(10px, 5vw)); }`,
		'a { opacity: min(1e0, max(+1e-1, .5)); }',
		'a { width: max(min(5vw /* value */, 100px), 10px); }',
		'a { width: min(100px, max(10px /* low */, 5vw)); }',
		'a { --size: min(100px, max(/* low */ 10px, 5vw)); }',
		'@media (width > 100px) { a { width: max(10px, min(5vw, 100px)); } }',
		'@supports (display: grid) { a { width: max(10px, min(5vw, 100px)); } }',
		'@container (width > 100px) { a { width: max(10px, min(5vw, 100px)); } }',
		'@layer components { a { width: max(10px, min(5vw, 100px)); } }',
		'@scope (.card) { a { width: max(10px, min(5vw, 100px)); } }',
		'a { & .child { width: max(10px, min(5vw, 100px)); } }',
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'a { width: max(10px, min(5vw, 100px)); }',
			output: 'a { width: clamp(10px, 5vw, 100px); }',
			errors: [{
				messageId: 'prefer-clamp', line: 1, column: 12, endLine: 1, endColumn: 38,
			}],
		},
		{
			code: 'a {\n  --size: max(10px, min(5vw, 100px));\n}',
			output: 'a {\n  --size: clamp(10px, 5vw, 100px);\n}',
			errors: [{
				messageId: 'prefer-clamp', line: 2, column: 11, endLine: 2, endColumn: 37,
			}],
		},
		{
			code: 'a { width: max(/* low */ 10px /* minimum */, /* bound */ min(/* value */ 5vw /* preferred */, /* upper */ 100px /* maximum */) /* end */); }',
			output: 'a { width: clamp(/* low */ 10px /* minimum */, /* bound */ /* value */ 5vw /* preferred */, /* upper */ 100px /* maximum */ /* end */); }',
			errors: 1,
		},
		{
			code: 'a {\r\n  width: max(\r\n    10px,\r\n    min(5vw, 100px)\r\n  );\r\n}',
			output: 'a {\r\n  width: clamp(\r\n    10px,\r\n    5vw, 100px\r\n  );\r\n}',
			errors: 1,
		},
		{
			code: 'a {\r\n  width: max(min(5vw, 100px),\r\n    10px);\r\n}',
			output: 'a {\r\n  width: clamp(\r\n    10px, 5vw, 100px);\r\n}',
			errors: 1,
		},
		{
			code: 'a { width: min(100px, max(10px, 20px)); }',
			output: 'a { width: clamp(10px, 20px, 100px); }',
			errors: 1,
		},
		{
			code: 'a { width: min(10px, max(20px, 5px)); }',
			output: 'a { width: clamp(5px, 20px, 10px); }',
			errors: 1,
		},
		{
			code: 'a { opacity: min(-0, max(0, .5)); }',
			output: 'a { opacity: clamp(0, .5, -0); }',
			errors: 1,
		},
		{
			code: 'a { width: min(-0px, max(+0px, 5vw)); }',
			output: 'a { width: clamp(+0px, 5vw, -0px); }',
			errors: 1,
		},
		{
			code: String.raw`a { width: max(10px,min(5v\77 /* preferred */,100p\78 /* upper */)); }`,
			output: String.raw`a { width: clamp(10px,5v\77 /* preferred */,100p\78 /* upper */); }`,
			errors: 1,
		},
		{
			code: 'a {\r\n  --size: ' + String.raw`ma\78 (10px,mi\6e (5vw,100px));` + '\r\n}',
			output: 'a {\r\n  --size: clamp(10px,5vw,100px);\r\n}',
			errors: 1,
		},
		{
			code: 'a {\r\n  --first: ' + String.raw`m\61 x(m\69 n(5v\77 ,100p\78 ),10p\78 );` + '\r\n  --second: min(10px,max(20px,5px));\r\n}',
			output: 'a {\r\n  --first: ' + String.raw`clamp(10p\78 , 5v\77 , 100p\78 );` + '\r\n  --second: clamp(5px, 20px, 10px);\r\n}',
			errors: [
				{
					messageId: 'prefer-clamp', line: 2, column: 12, endLine: 2, endColumn: 51,
				},
				{
					messageId: 'prefer-clamp', line: 3, column: 13, endLine: 3, endColumn: 36,
				},
			],
		},
	],
});

nodeTest('overlapping fixes converge and remain stable', () => {
	const linter = new Linter();
	const config = {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {css, cssicorn: {rules: {'prefer-clamp': rule}}},
		rules: {'cssicorn/prefer-clamp': 'error'},
	};
	for (const property of ['width', '--size']) {
		const code = `a { ${property}: max(10px, min(max(2px, min(3vw, 20px)), 100px)); }`;
		const result = linter.verifyAndFix(code, config, {filename: 'example.css'});
		assert.equal(result.output, `a { ${property}: clamp(10px, clamp(2px, 3vw, 20px), 100px); }`);
		assert.deepEqual(result.messages, []);
		assert.equal(linter.verifyAndFix(result.output, config, {filename: 'example.css'}).fixed, false);
	}
});
