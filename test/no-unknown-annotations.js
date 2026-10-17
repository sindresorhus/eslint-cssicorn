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
		// The canonical form is allowed even with comments around it.
		'a { color: red /* before */ !important; }',
		'a { color: red !important /* after */; }',
		'a { --priority: red !important; }',
		// A `!` inside a function or brackets is part of the custom property value, not an annotation.
		'a { --priority: fn(!imprtant) [!imprtant]; }',
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
		// Custom property values cannot contain a top-level `!`, so browsers drop the declaration.
		'a { --priority: red !imprtant; }',
		'a { --priority: !imprtant; }',
		'a { --priority: red ! /* comment */ IMPRTANT; }',
		String.raw`a { -\2d priority: red !imprtant; }`,
		String.raw`a { --\2d priority: red !imprtant; }`,
		'a { --priority: red !IMPORTANT; }',
		// Line breaks between `!` and `important`
		'a {\n\tcolor: red !\n\t\timportant;\n}',
		'a {\r\n  color: red !\r\n    IMPORTANT;\r\n}',
		'a { color: red ! IMPORTANT }',
		String.raw`a { color: red !\IMPORTANT; }`,
		'a { color: red !ie; }',
		'a { color: red !importantt; }',
	],
});
