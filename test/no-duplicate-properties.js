import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { color: red; background: blue; }',
		'a { --theme: red; --Theme: blue; }',
		String.raw`a { --Foo: red; --\66 oo: blue; }`,
		'a { --foó: red; --foo\u0301: blue; }',
		'a { padding: 1rem; padding-left: 2rem; }',
		'a { -webkit-user-select: none; user-select: none; }',
		'a { K: one; k: two; }',
		'a { color: red; } b { color: blue; }',
		'@keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
		outdent`
			a {
				color: red;
				.child {
					color: blue;
				}
			}
		`,
		outdent`
			a {
				color: red;
				@supports (color: oklch(50% 0.2 30)) {
					color: oklch(50% 0.2 30);
				}
			}
		`,
		// Consecutive fallbacks
		'a { position: -webkit-sticky; position: sticky; }',
		'a { display: -webkit-box; display: -ms-flexbox; display: flex; }',
		'a { height: 100vh; height: 100dvh; }',
		'a { color: rgb(0 0 0); color: oklch(50% 0.2 30); }',
		'a { width: -moz-max-content; width: max-content; }',
		'a { color: red; color: blue; }',
		'a { Color: red; cOlOr: blue; }',
		'a { color: red !important; color: blue !important; }',
		'a { color: red; color: RED; }',
		'a { color: red; /* fallback */ color: blue; }',
		'@keyframes pulse { from { opacity: 0; opacity: 1; } }',
		'@font-face { src: url(example.woff2); SRC: url(example.woff); }',
		outdent`
			a {
				background-image: url(fallback.png);
				background-image:
					linear-gradient(red, blue);
			}
		`,
	],
	invalid: [
		'a { color: red; color: red; }',
		'a { Color: red; cOlOr: red; }',
		String.raw`a { \43 olor: red; color: red; }`,
		'a { --theme: red; --theme: red; }',
		'a { --theme: red; --theme: blue; }',
		String.raw`a { --foo: red; --f\6f o: red; }`,
		String.raw`a { --foo: red; \2d\2d foo: red; }`,
		String.raw`a { --💩: red; --\1f4a9: red; }`,
		String.raw`a { a\0 b: one; a�b: one; }`,
		'a { --theme:; --theme:; }',
		'a { color: red; color:  red ; }',
		'a { color: rgb(0  0  0); color: rgb(0 0 0); }',
		'a { --theme: red; --theme:  red ; }',
		'a { color: red; background: white; color: blue; }',
		'a { color: red; color: blue; color: blue; }',
		'a { color: red; background: white; color: blue; background: black; }',
		'a { -WEBKIT-user-select: none; -webkit-USER-select: none; }',
		'a { color: red !important; color: blue; }',
		'a { color: red; color: blue !important; }',
		'a { color: red !important; color: red !important; }',
		'@keyframes pulse { from { opacity: 0; opacity: 0; } }',
		'@font-face { src: url(example.woff2); font-display: swap; SRC: url(example.woff); }',
		'@property --theme { syntax: "*"; syntax: "*"; inherits: false; }',
		'@counter-style thumbs { symbols: "👍"; symbols: "👍"; }',
		'@page { margin: 1in; margin: 1in; @top-left { content: "A"; content: "A"; } }',
		outdent`
			a {
				color: red;
				@media (width > 40rem) {
					color: blue;
					color: blue;
				}
				color: black;
			}
		`,
		'a { color: red; /* keep */ color: red; }',
		'a { -webkit-user-select: none; user-select: none; -webkit-user-select: text; user-select: text; }',
		'@font-face { src: url(a.woff2); src: url(a.woff2); }',
		'a { color: red; & b { color: blue; } color: red; }',
		'a { --theme: red; /* keep */ --theme: blue; }',
		'@keyframes pulse { from { color: red !important; color: red !important; } }',
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'a {\n  color: red;\n  COLOR: red;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					data: {
						property: 'COLOR',
						line: '2',
					},
					line: 3,
					column: 3,
					endLine: 3,
					endColumn: 8,
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n  color: red;\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\tc\\6f\nlor: red;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					line: 3,
					column: 2,
					endLine: 4,
					endColumn: 4,
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n\tcolor: red;\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\r\n\tcolor: red;\r\n\tc\\6f\r\nlor: red;\r\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					line: 3,
					column: 2,
					endLine: 4,
					endColumn: 4,
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\r\n\tcolor: red;\r\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\r\tcolor: red;\r\tc\\6f\rlor: red;\r}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					line: 3,
					column: 2,
					endLine: 4,
					endColumn: 4,
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\r\tcolor: red;\r}',
						},
					],
				},
			],
		},
		{
			code: 'a {\f\t--foo: red;\f\t--f\\6f\fo: red;\f}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					line: 3,
					column: 2,
					endLine: 4,
					endColumn: 2,
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\f\t--foo: red;\f}',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\tcolor: red;\n\tcolor: red;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					data: {
						property: 'color',
						line: '2',
					},
					line: 3,
					suggestions: 1,
				},
				{
					messageId: 'no-duplicate-properties/error',
					data: {
						property: 'color',
						line: '2',
					},
					line: 4,
					suggestions: 1,
				},
			],
		},
		{
			code: 'a { color: red; color: red }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a { color: red; }',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;  color: red;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n\tcolor: red;\n}',
						},
					],
				},
			],
		},
		{
			code: 'a { color: red; color: red; background: white; }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a { color: red; background: white; }',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\tcolor: red \t\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n\tcolor: red;\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\r\n\tcolor: red;\r\n\tcolor: red \t\r\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\r\n\tcolor: red;\r\n}',
						},
					],
				},
			],
		},
		{
			code: 'a { color: red; color: red \t; }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a { color: red; }',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\tcolor:\n\t\tred;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n\tcolor: red;\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\r\n\tcolor: red;\r\n\tcolor: red;\r\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\r\n\tcolor: red;\r\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\f\tcolor: red;\f\tcolor: red;\f}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\f\tcolor: red;\f}',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\tcolor: red;',
			languageOptions: {tolerant: true},
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n\tcolor: red;\n',
						},
					],
				},
			],
		},
		{
			code: 'a { color: red; color: red; /* keep */ }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a { color: red; /* keep */ }',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\t/* eslint-disable-next-line no-warning-comments */\n\tcolor: red;\n\tword-wrap: break-word;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: [
						{
							messageId: 'no-duplicate-properties/suggestion',
							output: 'a {\n\tcolor: red;\n\t/* eslint-disable-next-line no-warning-comments */\n\n\tword-wrap: break-word;\n}',
						},
					],
				},
			],
		},
		{
			code: 'a {\n\tcolor: red;\n\t/* eslint-disable-next-line no-warning-comments */\n\tcolor:\n\t\tred; word-wrap: break-word;\n}',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: 0,
				},
			],
		},
		{
			code: 'a { color: red; color: /* keep */ red; }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: 0,
				},
			],
		},
		{
			code: 'a { color: red; color /* keep */ : red; }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: 0,
				},
			],
		},
		{
			code: 'a { color: red; color: red /* keep */; }',
			errors: [
				{
					messageId: 'no-duplicate-properties/error',
					suggestions: 0,
				},
			],
		},
	],
});
