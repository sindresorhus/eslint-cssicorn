import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { color: red; }',
		'a { color: red !important; }',
		'a { content: "!imprtant"; }',
		'a { background-image: url(!imprtant); }',
		'a { color: fn("!imprtant"); }',
		'a { /* !imprtant */ color: red; }',
		'a { --priority: red !imprtant; }',
		'a { --priority: red ! /* comment */ IMPRTANT; }',
		String.raw`a { -\2d priority: red !imprtant; }`,
		String.raw`a { \2d\2d priority: red !imprtant; }`,
		// The canonical form is allowed even with comments around it.
		'a { color: red /* before */ !important; }',
		'a { color: red !important /* after */; }',
		// Custom properties are opaque, so any `!identifier` is allowed.
		'a { --priority: red !IMPORTANT; }',
		'a { --priority: !imprtant; }',
		String.raw`a { --\2d priority: red !imprtant; }`,
		'a { --priority: red !important; }',
		'@media (width > 0px) { a { color: red !important; } }',
		'a { &:hover { color: red !important; } }',
		'@property --brand { syntax: "*"; inherits: false; initial-value: red !important; }',
	],
	invalid: [
		'a { color: red !IMPORTANT; }',
		'a { color: red !ImPoRtAnT; }',
		String.raw`a { color: red !\69mportant; }`,
		String.raw`a { color: red !\49 MPORTANT; }`,
		'a { color: red ! important; }',
		'a { color: red !/**/important; }',
		'a { color: red ! /* comment */ important; }',
		'a { color: red !imprtant; }',
		'a { color: red !other; }',
		'a { color: red !IMPRTANT; }',
		String.raw`a { color: red !\69mprtant; }`,
		String.raw`a { color: red !\69 MPRTANT; }`,
		'a { color: red ! imprtant; }',
		'a { color: red !/**/imprtant; }',
		'a { color: red ! /* comment */ imprtant; }',
		'a { color: red !imprtant /* trailing comment */; }',
		'a { color: red ! /* !imprtant */ imprtant /* imprtant ! */; }',
		'a { imprtant: imprtant !imprtant; }',
		'a { color: red !imprtant }',
		outdent`
			a {
				color: red
					! /* comment */
					imprtant;
			}
		`,
		'@font-face { font-family: Example !imprtant; }',
		'@media (width > 0px) { a { color: red !imprtant; } }',
		'a { &:hover { color: red !imprtant; } }',
		'@keyframes fade { to { opacity: 1 !imprtant; } }',
		'a { COLOR: RED !IMPORTANT; }',
		'@supports (display: grid) { a { color: red !ImPoRtAnT; } }',
		'@layer theme { a { color: red !IMPORTANT; } }',
		'a { &:hover { color: red !IMPORTANT; } }',
		'@keyframes fade { 50% { opacity: 1 !IMPORTANT; } }',
		'@property --brand { syntax: "*"; inherits: false; initial-value: red !IMPORTANT; }',
		// A comment before the `!` is outside the annotation, so a suggestion is offered.
		'a { color: red /* before */ !imprtant; }',
		'a { color: red !IMPORTANT /* trailing */; }',
		String.raw`a { color: red !importan\74; }`,
		String.raw`a { color: red ! \69mportant; }`,
	],
});
