import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { --a: var(--base, var(--b)); --b: var(--a); }',
		'a { --base: 1px; --a: var(--base, calc(var(--other, var(--b)) + 1px)); --b: var(--a); }',
		'a { --a: if(style(--enabled: yes): 1px; else: var(--b)); --b: var(--a); }',
		'a { --spacing: var(--other, var(--spacing)); }',
		'a { --other: 1px; --spacing: var(--other, var(--spacing)); }',
		'a { --spacing: var(--other, calc(var(--base, var(--spacing)) + 1px)); }',
		'a { --spacing: if(style(--enabled: yes): 1px; else: var(--spacing)); }',
		'a { --spacing:; }',
		'a { --spacing: /* var(--spacing) */; }',
		'a { --spacing: 1px; }',
		'a { --spacing: var(--base-spacing); }',
		'a { --spacing: var(--SPACING); }',
		'a { --café: var(--cafe\u0301); }',
		'a { --spacing: var(--spacing-extra); }',
		'a { --spacing: var(--other, --spacing); }',
		'a { --spacing: --spacing; }',
		'a { --spacing: "var(--spacing)"; }',
		'a { --spacing: 1px /* var(--spacing) */; }',
		'a { --spacing: url("var(--spacing)"); }',
		String.raw`a { --spacing: url(var\(--spacing\)); }`,
		String.raw`a { --spacing: u\72l("var(--spacing)"); }`,
		'a { --spacing: foo(--spacing); }',
		'a { --spacing: var /**/ (--spacing); }',
		'a { --spacing: var(--spacing extra); }',
		'a { --spacing: var(--spacing + 1px); }',
		'a { --spacing: var(--spa/**/cing); }',
		'a { --spacing: var(--other, "var(--spacing)" url("var(--spacing)")); }',
		'a { spacing: var(--spacing); }',
		'a { --alias: --spacing; --spacing: var(var(--alias)); }',
		':root { --spacing: 1px; } a { --component-spacing: var(--spacing); }',
		'@supports (--spacing: var(--spacing)) {}',
		'@container style(--spacing: var(--spacing)) {}',
		'@import "x.css" supports(--spacing: var(--spacing));',
		'@property --spacing { syntax: "*"; inherits: false; initial-value: 1px; }',
		String.raw`a { --spacing: var(--sp\61 cing-extra); }`,
		'a { --a: var(--b); --b: var(--c); --c: 1px; }',
		'a { --a: var(--b); --b: var(--external); }',
		'a { --a: var(--b); --B: var(--a); }',
		'a { --café: var(--b); --b: var(--cafe\u0301); }',
		'a { --a: var(--b); } b { --b: var(--a); }',
		'a { --a: var(--b); & b { --b: var(--a); } }',
		'a { --a: var(--b); @media (width > 1px) { --b: var(--a); } }',
		'a { --a: var(--b); --b: var(--a); --b: 1px; }',
		'a { --a: 1px !important; --a: var(--b); --b: var(--a); }',
		'a { --a: var(--b); --a: 1px !important; --b: var(--a); }',
		'a { --a: var(--b) !important; --a: 1px !important; --b: var(--a); }',
		String.raw`a { --a: var(--b); --b: var(--a); --\62: 1px; }`,
		'a { --a: "var(--b)" /* var(--b) */ url("var(--b)"); --b: var(--a); }',
		'a { --a: var(--base, --b); --b: var(--a); }',
		'a { --a: var(--b extra); --b: var(--a); }',
		'a { --a: var(--b) var(--c); --b: var(--c); --c: 1px; }',
	],
	invalid: [
		'a { --one: var(--two); --two: var(--one); }',
		'a { --b: var(--a); --a: var(--b); }',
		'a { --a: var(--b); --b: var(--c); --c: var(--a); }',
		'a { --a: var(--b) var(--c); --b: var(--a); --c: var(--b); }',
		'a { --a: var(--b); --b: var(--a); --c: var(--d); --d: var(--c); }',
		'a { --a: var(--b) !important; --a: 1px; --b: var(--a); }',
		'a { --a: 1px; --a: var(--b) !important; --b: var(--a); }',
		'a { --a: 1px !important; --a: var(--b) !important; --b: var(--a); }',
		'a { --a: var(--b) !IMPORTANT; --a: 1px; --b: var(--a); }',
		String.raw`a { --a: var(--b) !\69mportant; --a: 1px; --b: var(--a); }`,
		String.raw`a { --\61: V\41R(--\62); --b: var(--a); }`,
		'a { --間隔: var(--色); --色: var(--間隔); }',
		'a { --a: var(/* before */ --b /* after */); --b: var(--a); }',
		'a { --a: var(--b) var(--b); --b: var(--a); }',
		'a { & > b { --a: var(--b); --b: var(--a); } }',
		'@media (width > 1px) { a { --a: var(--b); --b: var(--a); } }',
		'@supports (color: red) { a { --a: var(--b); --b: var(--a); } }',
		'@container (width > 1px) { a { --a: var(--b); --b: var(--a); } }',
		'@layer base { a { --a: var(--b); --b: var(--a); } }',
		'@scope (.component) { a { --a: var(--b); --b: var(--a); } }',
		'@keyframes grow { to { --a: var(--b); --b: var(--a); } }',
		'a { --spacing: var(--spacing); }',
		'a { --spacing: calc(var(--spacing) + 1px); }',
		'a { --spacing: var(--spacing, 1px); }',
		'a { --spacing: var(--spacing,); }',
		'a { --spacing: var(--spacing) var(--spacing, var(--spacing)); }',
		'a { --spacing: var(--spacing); --color: var(--color); }',
		'a { --spacing: VAR(--spacing); }',
		'a { --spacing: var(/* before */ --spacing /* after */, 1px); }',
		'a { --spacing: var(--spacing) !important; }',
		'a { & > b { --spacing: var(--spacing); } }',
		'@media (width > 1px) { a { --spacing: var(--spacing); } }',
		'@keyframes grow { to { --spacing: var(--spacing); } }',
		'@supports (--spacing: var(--spacing)) { a { --spacing: var(--spacing); } }',
		'@container style(--spacing: var(--spacing)) { a { --spacing: var(--spacing); } }',
		'a { --spacing: {value: [var(--spacing)]}; }',
		String.raw`a { --spacing: v\61r(--spacing); }`,
		String.raw`a { --sp\61 cing: var(--spacing); }`,
		String.raw`a { --spacing: var(--sp\61 cing); }`,
		String.raw`a { \2d\2d spacing: var(--spacing); }`,
		'a { --間隔: var(--間隔); }',
		'a {\n\t--spacing: calc(\n\t\tvar(--spacing) + 1px\n\t);\n}',
	],
});

test({
	valid: [
		'a { --a: if(supports(--b: var(--b)): 1px; else: 2px); --b: var(--a); }',
		'a { --base:; --a: var(--base, var(--b)); --b: var(--a); }',
		'a { --base: calc(initial); --spacing: var(--base, var(--spacing)); }',
		'a { --base: /* empty */; --spacing: var(--base, var(--spacing)); }',
		'a { --a: var(--base, var(--b)); --b: var(--a); --base: 1px; }',
		'a { --base: var(--value); --a: var(--base, var(--b)); --b: var(--a); --value: 1px; }',
		'a { --invalid: initial; --base: var(--invalid,); --a: var(--base, var(--a)); }',
		'a { --base: env(safe-area-inset-top, var(--base)); --a: var(--base, var(--a)); }',
		'a { --base: attr(data-spacing type(<length>), var(--base)); --a: var(--base, var(--a)); }',
		'a { --base: first-valid(1px, var(--base)); --a: var(--base, var(--a)); }',
		'a { --base: --theme(var(--base)); --a: var(--base, var(--a)); }',
		String.raw`a { --base: I\46(style(--enabled: yes): var(--base); else: 1px); --a: var(--base, var(--a)); }`,
		'a { --base: initial; --base: 1px !important; --a: var(--base, var(--b)); --b: var(--a); }',
		'a { --base: initial; --spacing: var(--base, var(--value, var(--spacing))); --value: 1px; }',
		'a { --base: var(--external); --a: var(--base, var(--b)); --b: var(--a); }',
		'a { --base: inherit; --a: var(--base, var(--b)); --b: var(--a); }',
		'a { --base: unset; --a: var(--base, var(--b)); --b: var(--a); }',
		'a { --base: revert-layer; --a: var(--base, var(--b)); --b: var(--a); }',
		'a { --base: if(style(--enabled: yes): initial; else: 1px); --a: var(--base, var(--b)); --b: var(--a); }',
		'a { --base: 1px; --spacing: var(--base, var(--spacing)); --spacing: 2px; }',
		'@keyframes grow { from { --a: var(--b); } to { --b: var(--a); } }',
		{
			name: 'large acyclic custom-property chain',
			code: ':root {' + Array.from({length: 5000}, (_, index) => `--property-${index}: var(--property-${index + 1});`).join('') + '--property-5000: 1px; }',
		},
	],
	invalid: [
		{
			code: 'a { --b: var(--b) var(--d); --c: var(--b); --d: var(--c, 1px) 1px 1px; }',
			errors: [{messageId: 'no-self-referencing-custom-properties', data: {property: '--b'}}],
		},
		{
			code: 'a { --d: var(--c, 1px) 1px 1px; --c: var(--b); --b: var(--b) var(--d); }',
			errors: [{messageId: 'no-self-referencing-custom-properties', data: {property: '--b'}}],
		},
		{
			code: 'a { --a: var(--a, var(--b)); --b: var(--a, 1px); --c: var(--b, var(--c)); }',
			errors: [{messageId: 'no-self-referencing-custom-properties', data: {property: '--a'}}],
		},
		{
			code: 'a { --d: var(--c, var(--d)); --c: var(--b, 1px); --b: var(--a); --a: var(--b) var(--c); }',
			errors: [
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}},
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}},
			],
		},
		{
			code: 'a { --invalid: initial; --empty:; --base: var(--invalid, initial) var(--empty); --a: var(--base, var(--a)); }',
			errors: [{messageId: 'no-self-referencing-custom-properties', data: {property: '--a'}}],
		},
		{
			code: 'a { --a: var(--external) var(--b); --b: var(--a); }',
			errors: [
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}},
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}},
			],
		},
		{
			code: 'a { --a: if(style(--enabled: yes): 1px; else: 2px) var(--b); --b: var(--a); }',
			errors: [
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}},
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}},
			],
		},
		{
			code: 'a { --invalid: initial; --base: var(--invalid, initial); --a: var(--base, var(--a)); }',
			errors: [{messageId: 'no-self-referencing-custom-properties', data: {property: '--a'}}],
		},
		{
			code: 'a { --a: var(--b) var(--c); --b: var(--a); --c: var(--b, 1px); --d: var(--c, var(--d)); }',
			errors: [
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}},
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}},
			],
		},
		{
			code: 'a { --base: initial; --a: var(--base, var(--b)); --b: var(--a); }',
			errors: [
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}},
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}},
			],
		},
		{
			code: String.raw`a { --base: \49NITIAL; --spacing: var(--base, var(--spacing)); }`,
			errors: [{messageId: 'no-self-referencing-custom-properties', data: {property: '--spacing'}}],
		},
		{
			code: 'a { --base: initial !important; --base: 1px; --a: var(--base, var(--b)); --b: var(--a); }',
			errors: [
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}},
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}},
			],
		},
		{
			code: 'a { --base: initial; --other: initial; --spacing: var(--base, calc(var(--other, var(--spacing)) + 1px)); }',
			errors: [{messageId: 'no-self-referencing-custom-properties', data: {property: '--spacing'}}],
		},
		{
			code: 'a { --a: var(--b, 1px); --b: var(--a, 2px); --incoming: var(--a, var(--incoming)); }',
			errors: [
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}},
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}},
				{messageId: 'no-self-referencing-custom-properties', data: {property: '--incoming'}},
			],
		},
		{
			code: 'a { --a: var(--b, 1px); --b: var(--a, 2px); --incoming: var(--a, 3px); --consumer: var(--incoming, var(--consumer)); }',
			errors: [
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}},
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}},
			],
		},
		{
			code: 'a { --a: var(--b); all: initial; --b: var(--a); }',
			errors: [
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}},
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}},
			],
		},
		{
			code: 'a { @media (width > 1px) { --a: var(--b); --b: var(--a); } }',
			errors: [
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}},
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}},
			],
		},
		{
			code: '@keyframes grow { to { --a: var(--b) !important; --b: var(--a); } }',
			errors: [
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}},
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}},
			],
		},
		{
			code: 'a { --a: {value: [var(--b)]}; --b: var(--a); }',
			errors: [
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}},
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}},
			],
		},
		{
			code: 'a {\n\t/* eslint-disable-next-line */\n\t--a: var(--b);\n\t--b: var(--a);\n}',
			errors: [{
				messageId: 'no-self-referencing-custom-properties/cycle',
				data: {property: '--b'},
				line: 4,
			}],
		},
		{
			name: 'large cyclic custom-property chain',
			code: ':root {' + Array.from({length: 5000}, (_, index) => `--property-${index}: var(--property-${(index + 1) % 5000});`).join('') + '}',
			errors: Array.from({length: 5000}, (_, index) => ({
				messageId: 'no-self-referencing-custom-properties/cycle',
				data: {property: `--property-${index}`},
			})),
		},
		{
			code: 'a { --a: var(--b); --b: var(--a); --c: var(--a) var(--d); --d: var(--c); --incoming: var(--c); }',
			errors: [
				{
					messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}, column: 14, endColumn: 17,
				},
				{
					messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}, column: 29, endColumn: 32,
				},
				{
					messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--c'}, column: 53, endColumn: 56,
				},
				{
					messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--d'}, column: 68, endColumn: 71,
				},
			],
		},
		{
			code: 'a { --a: var(--b) !important; --a: var(--a); --b: var(--a); }',
			errors: [
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}},
				{messageId: 'no-self-referencing-custom-properties', data: {property: '--a'}},
				{messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}},
			],
		},
		{
			code: 'a { --a: var(--b); --b: var(--a); --a: var(--a); }',
			errors: [{messageId: 'no-self-referencing-custom-properties', data: {property: '--a'}}],
		},
		{
			code: 'a { --a: var(--external) var(--b); --b: var(--a); --external: 1px; }',
			errors: [
				{
					messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}, column: 30, endColumn: 33,
				},
				{
					messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}, column: 45, endColumn: 48,
				},
			],
		},
		{
			code: 'a { --incoming: var(--a); --a: var(--b); --b: var(--a); }',
			errors: [
				{
					messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}, column: 36, endColumn: 39,
				},
				{
					messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}, column: 51, endColumn: 54,
				},
			],
		},
		{
			code: 'a { --a: var(--b) var(--a); --b: var(--a); }',
			errors: [
				{
					messageId: 'no-self-referencing-custom-properties', data: {property: '--a'}, column: 23, endColumn: 26,
				},
				{
					messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}, column: 38, endColumn: 41,
				},
			],
		},
		{
			code: 'a { --a: var(--a); --a: 1px; --b: var(--a); }',
			errors: [{messageId: 'no-self-referencing-custom-properties', data: {property: '--a'}}],
		},
		{
			code: 'a { --incoming: var(--a); --a: var(--a); }',
			errors: [{messageId: 'no-self-referencing-custom-properties', data: {property: '--a'}}],
		},
		{
			code: 'a {\r\n  --a: var(\r\n    /* keep */ --b\r\n  );\r\n  --b: var(--a);\r\n}',
			errors: [
				{
					messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--a'}, line: 3, column: 16, endLine: 3, endColumn: 19,
				},
				{
					messageId: 'no-self-referencing-custom-properties/cycle', data: {property: '--b'}, line: 5, column: 12, endLine: 5, endColumn: 15,
				},
			],
		},
		{
			code: 'a { --spacing: var(var(--spacing)); }',
			errors: [{
				messageId: 'no-self-referencing-custom-properties',
				data: {property: '--spacing'},
				line: 1,
				column: 24,
				endLine: 1,
				endColumn: 33,
			}],
		},
		{
			code: String.raw`a { --space-size: var(--space\-size); }`,
			errors: [{
				messageId: 'no-self-referencing-custom-properties',
				data: {property: '--space-size'},
				line: 1,
				column: 23,
				endLine: 1,
				endColumn: 36,
			}],
		},
		{
			code: 'a { --spacing: "var(--spacing)" /* var(--spacing) */ url("var(--spacing)") var(--spacing); }',
			errors: [{
				messageId: 'no-self-referencing-custom-properties',
				line: 1,
				column: 80,
				endLine: 1,
				endColumn: 89,
			}],
		},
		{
			code: String.raw`a { --spacing: V\000041R(--sp\000061cing); }`,
			errors: [{
				messageId: 'no-self-referencing-custom-properties',
				data: {property: '--spacing'},
				line: 1,
				column: 26,
				endLine: 1,
				endColumn: 41,
			}],
		},
		{
			code: 'a { --spacing: var(--other) var(--spacing) var(--spacing); }',
			errors: [{
				messageId: 'no-self-referencing-custom-properties',
				data: {property: '--spacing'},
				line: 1,
				column: 33,
				endLine: 1,
				endColumn: 42,
			}],
		},
		{
			code: 'a {\r\n  --spacing: var(\r\n    /* keep */ --spacing\r\n  );\r\n}',
			errors: [{
				messageId: 'no-self-referencing-custom-properties',
				line: 3,
				column: 16,
				endLine: 3,
				endColumn: 25,
			}],
		},
	],
});
