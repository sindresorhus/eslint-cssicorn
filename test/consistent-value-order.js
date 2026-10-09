import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import css from '@eslint/css';
import {lexer, parse, toPlainObject} from '@eslint/css-tree';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getCanonicalLexerNode} from '../rules/utils/index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { border: 1px solid red; outline: thin auto; column-rule: medium dashed blue; }',
		'a { border: solid red; border: 0 red; border: thin dashed; border: red; border: none; }',
		'a { flex-flow: column wrap; flex-flow: row-reverse nowrap; flex-flow: wrap; }',
		'a { box-shadow: inset 1px 2px 3px 4px red, 5px 6px blue; }',
		'a { box-shadow: 0 0; text-shadow: 1px 2px 3px red, 4px 5px; }',
		'a { box-shadow: outset red 1px 2px; box-shadow: red none inset; }',
		'a { columns: 20em 3; columns: auto 3; columns: 20em auto; columns: auto auto; }',
		'a { BORDER: 1PX SOLID RED; FLEX-FLOW: COLUMN WRAP; }',
		'a { border: inherit; outline: initial; flex-flow: unset; box-shadow: none; text-shadow: revert; columns: revert-layer; }',
		'a { border: var(--border); border: red var(--width) solid; }',
		'a { box-shadow: 0 0 calc(var(--blur) + 1px) red; }',
		'a { border: red solid env(border-width); }',
		'a { border: red solid attr(data-width px); }',
		'a { border: calc(random(1px, 5px) + 1px) solid red; }',
		'a { border: red solid --width(); }',
		'a { flex-flow: var(--direction, column) wrap; }',
		'a { columns: 3 0; columns: auto 0; columns: -1 20em; columns: 1.5 20em; }',
		'a { columns: calc(3) calc(20em); columns: auto calc(20em); columns: 3 unknown(); }',
		'a { columns: calc(var(--width)) 3; columns: calc(random(1px, 2px)) 3; columns: 20em 3 / var(--height); }',
		'a { columns: 3 0 / 10em; columns: 20em 3 /; columns: 20em 3 / 10em / 2px; }',
		'a { columns: 3 4 / var(--height); columns: var(--count) 20em / 10em; }',
		'a { columns: 3 +0; columns: 3 -0; columns: 3 0.0; }',
		'a { columns: 9007199254740992 20em; }',
		'a { border: red solid unknown; flex-flow: wrap column unknown; box-shadow: red 1px; columns: 3 4; }',
		'a { border: 1px red solid blue; box-shadow: red 0 blue 0; }',
		'a { margin: 4px 3px 2px 1px; padding: 2px 1px; border-radius: 4px 3px / 2px 1px; }',
		'a { list-style: inside outside; animation: ease 1s fade; transition: ease opacity 1s; }',
		'a { --border: red solid 1px; color: red; content: "red solid 1px"; background: url("red solid 1px"); }',
		':export { border: red solid 1px; box-shadow: red 0 0; }',
		':import("theme.css") { flex-flow: wrap column; columns: 3 20em; }',
		'a { border: 1px /* keep */ solid red; }',
		{code: 'a { border: red solid (; box-shadow: red 0 0 (; }', languageOptions: {tolerant: true}},
		'a { box-shadow: 1px 2px red, blue 3px; text-shadow: 1px 2px red, blue 3px; }',
		'a { box-shadow: 1px 2px red, var(--other-shadow); text-shadow: 1px 2px red, 3px 4px rgb(1 2 var(--blue)); }',
		'a { border: 1px solid rgb(var(--channels)); outline: rgb(var(--channels)) solid var(--width); }',
		'a { border: rgb(var(--channels)) solid calc(var(--width)); border: unknown(var(--channels)) solid 1px; }',
		'a { border: rgb(var(--channels)) solid 1px unknown; border: rgb(var(--channels)) solid 1px red; }',
		'a { border: rgb(var(--channels)) hsl(var(--hue) 50% 50%) solid 1px; border: rgb(red) solid 1px; }',
		'a { border: palette-mix(in lab, var(--palette)) solid 1px; }',
		'a { --border: rgb(var(--channels)) solid 1px; color: rgb(var(--channels)); }',
		':export { border: rgb(var(--channels)) solid 1px; }',
		'a { box-shadow: 0 0 red, calc(random(1px, 2px)) 0 blue; }',
		'a { text-shadow: blue RANDOM-ITEM(auto, 1px, 2px) 0 0, 1px 2px red; }',
		'a { box-shadow: red random(1px, 2px) 0, blue 0 random(3px, 4px); }',
		'a { box-shadow: red var(--x) 0, blue 0 0 var(--blur); }',
		'a { text-decoration: underline 2px wavy red; text-decoration: overline underline 10% dotted blue; }',
		'a { text-decoration: underline from-font solid; text-decoration: none; text-emphasis: open circle red; text-emphasis: circle open red; }',
		'a { text-emphasis: "•" blue; text-emphasis: none red; text-emphasis: inherit; text-decoration: revert-layer; }',
		'a { text-decoration: red var(--line); text-emphasis: red var(--mark); --text-emphasis: red open circle; }',
		'a { text-decoration: red unknown 2px; text-emphasis: red unknown; }',
		'a { text-wrap: wrap balance; text-wrap: nowrap pretty; white-space: preserve nowrap; white-space: collapse wrap; }',
		'a { text-wrap: balance; text-wrap: auto; white-space: normal; white-space: pre; white-space: pre-wrap; white-space: pre-line; }',
		'a { text-wrap: var(--mode) balance; white-space: nowrap var(--collapse); --text-wrap: balance wrap; }',
		'a { text-wrap: balance pretty wrap; text-wrap: wrap nowrap; white-space: pre nowrap; white-space: wrap nowrap; }',
		'a { white-space: nowrap preserve discard-before; text-wrap: avoid-short-last-line wrap; }',
	],
	invalid: [
		...[
			'border',
			'border-top',
			'border-right',
			'border-bottom',
			'border-left',
			'border-block',
			'border-inline',
			'border-block-start',
			'border-block-end',
			'border-inline-start',
			'border-inline-end',
			'outline',
			'column-rule',
		].map(property => `a { ${property}: red solid 1px; }`),
		'a { border: solid red 1px; }',
		'a { border: red 1px solid; }',
		'a { border: solid 1px red; }',
		'a { border: 1px red solid; }',
		'a { border: red solid; border: solid thin; border: red 0; }',
		'a { border: currentColor dashed thick; }',
		'a { outline: auto solid 1px; }',
		'a { outline: red auto 1px; }',
		'a { column-rule: blue dotted 0.5em; }',
		'a { flex-flow: wrap column; flex-flow: wrap-reverse row-reverse; }',
		'a { box-shadow: red 1px 2px inset; }',
		'a { box-shadow: red inset 1px 2px 3px -4px; }',
		'a { box-shadow: 1px 2px red inset; }',
		'a { box-shadow: blue 5px 6px, red 1px 2px inset; }',
		'a { box-shadow: red 0 0 0 0; }',
		'a { text-shadow: red 1px 2px 3px; }',
		'a { text-shadow: blue 5px 6px, red 1px 2px; }',
		'a { box-shadow: color-mix(in srgb, red, blue) calc(1px + 2px) 0 inset; }',
		'a { border: rgb(1 2 3) solid calc(1px + 2px); }',
		'a { border: red solid min(1px, 2px); }',
		'a { columns: 3 20em; columns: 3 auto; columns: auto 20em; columns: +3 0px; }',
		'a { BORDER: RED SOLID 1PX; FLEX-FLOW: WRAP COLUMN; BOX-SHADOW: RED 0 0 INSET; COLUMNS: 3 20EM; }',
		String.raw`a { \62 order: r\65 d \73 olid 1p\78; }`,
		String.raw`a { flex-flow: w\72 ap c\6f lumn; columns: a\75 to 20e\6d; }`,
		String.raw`a { box-shadow: r\67 b(1 2 3) 0 0 in\73 et; }`,
		'a { -webkit-flex-flow: wrap column; -moz-box-shadow: red 0 0; -webkit-columns: 3 20em; }',
		'a { border: red solid 1px !important; }',
		'a { border: /* before */ red solid 1px /* after */; }',
		'a { border: red /* keep */ solid 1px; }',
		'a { box-shadow: rgb(1 /* keep */ 2 3) 0 0 inset; }',
		'a { border: rgb(1 2 3)solid 1px; }',
		'a { border: #fff/**/solid 1px; }',
		'a { border: red  solid\n  1px; }',
		'a {\r\n\tbox-shadow: red 0\r\n\t\t0 inset;\r\n}',
		'a { &:hover { border: red solid 1px; } }',
		'@media (width > 0px) { a { border: red solid 1px; } }',
		'@supports (display: grid) { a { flex-flow: wrap column; } }',
		'@container (width > 0px) { a { columns: 3 20em; } }',
		'@layer theme { a { box-shadow: red 0 0 inset; } }',
		'@scope (.theme) { a { text-shadow: red 0 0; } }',
		'@keyframes glow { to { box-shadow: red 0 0 inset; } }',
		'a { border: rgb(from red r g b / .4) solid 1px; }',
		String.raw`a { border: r\67 b(1 2 3)solid calc(1p\78); }`,
		'a { text-decoration: red wavy underline 2px; }',
		'a { text-decoration: red overline underline wavy 10%; }',
		'a { text-decoration: currentColor dotted underline from-font; }',
		'a { text-decoration: red solid underline calc(1px + 2px); }',
		'a { text-decoration: rgb(1 2 3)underline wavy auto; }',
		'a { TEXT-DECORATION: RED WAVY UNDERLINE 2PX; -webkit-text-emphasis: RED OPEN CIRCLE; }',
		String.raw`a { text-decoration: r\65 d \75 nderline 2p\78; }`,
		'a { text-decoration: red /* keep */ underline 2px; }',
		'a { text-emphasis: red open circle; }',
		String.raw`a { text-emphasis: red "\2022"; }`,
		'a { text-emphasis: red "/* mark */"; }',
		String.raw`a { text-emphasis: red c\69 rcle op\65 n; }`,
		'a { text-emphasis: red /* keep */ circle; }',
		'@media (width > 0px) { a { text-decoration: red underline 2px !important; } }',
		'a { text-wrap: pretty nowrap; text-wrap: stable wrap; text-wrap: auto nowrap; }',
		'a { white-space: wrap collapse; white-space: nowrap preserve-breaks; white-space: nowrap break-spaces; }',
		'a { TEXT-WRAP: BALANCE WRAP; WHITE-SPACE: NOWRAP PRESERVE; }',
		String.raw`a { \74 ext-wrap: b\61 lance w\72 ap; white-space: n\6f wrap pr\65 serve; }`,
		'a { text-wrap: balance /* keep */ wrap; white-space: nowrap /* keep */ preserve; }',
		'@media (width > 0px) { a { text-wrap: balance wrap !important; white-space: nowrap preserve !important; } }',
		{
			code: 'a { white-space: discard-after discard-before nowrap preserve; }',
			languageOptions: {
				customSyntax: {
					properties: {'white-space': '<\'white-space-collapse\'> || <\'text-wrap-mode\'> || <\'white-space-trim\'>'},
				},
			},
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'a { border: red solid 1px; }',
			output: 'a { border: 1px solid red; }',
			errors: [{messageId: 'consistent-value-order', column: 13, endColumn: 26}],
		},
		{
			code: 'a { box-shadow: blue 5px 6px, red 1px 2px 3px -4px inset; }',
			output: 'a { box-shadow: 5px 6px blue, inset 1px 2px 3px -4px red; }',
			errors: 2,
		},
		{
			code: 'a { outline: auto solid 1px; outline: red auto 2px; }',
			output: 'a { outline: 1px solid auto; outline: 2px auto red; }',
			errors: 2,
		},
		{
			code: 'a { border: rgb(1 2 3)solid 1px; }',
			output: 'a { border: 1px solid rgb(1 2 3); }',
			errors: 1,
		},
		{
			code: 'a { border: red  solid\r\n\t1px !important; }',
			output: 'a { border: 1px  solid\r\n\tred !important; }',
			errors: 1,
		},
		{
			code: String.raw`a { \62 order: r\65 d \73 olid 1p\78; }`,
			output: String.raw`a { \62 order: 1p\78  \73 olid r\65 d; }`,
			errors: 1,
		},
		{
			code: 'a { box-shadow: red /* keep */ 0 0, blue 1px 2px; }',
			output: 'a { box-shadow: red /* keep */ 0 0, 1px 2px blue; }',
			errors: 2,
		},
		{
			code: 'a { box-shadow: red 0 0, var(--other-shadows); }',
			output: 'a { box-shadow: 0 0 red, var(--other-shadows); }',
			errors: 1,
		},
		{
			code: 'a { text-shadow: var(--other-shadows, blue 1px 2px, green 3px 4px), red 5px 6px; }',
			output: 'a { text-shadow: var(--other-shadows, blue 1px 2px, green 3px 4px), 5px 6px red; }',
			errors: 1,
		},
		{
			code: 'a { box-shadow: blue 1px 2px, red var(--x) 0 inset, green 3px 4px inset; }',
			output: 'a { box-shadow: 1px 2px blue, red var(--x) 0 inset, inset 3px 4px green; }',
			errors: 2,
		},
		{
			code: 'a { box-shadow: red 1px 2px, blue 3px; text-shadow: blue 3px, red 1px 2px; }',
			output: 'a { box-shadow: 1px 2px red, blue 3px; text-shadow: blue 3px, 1px 2px red; }',
			errors: 2,
		},
		{
			code: 'a { box-shadow: color-mix(in srgb, red, blue) min(1px, 2px) 0 inset, rgb(1 2 var(--blue)) 3px 4px; }',
			output: 'a { box-shadow: inset min(1px, 2px) 0 color-mix(in srgb, red, blue), 3px 4px rgb(1 2 var(--blue)); }',
			errors: 2,
		},
		{
			code: 'a { box-shadow: red /* keep */ 0 0, var(--other), blue 1px 2px; }',
			output: 'a { box-shadow: red /* keep */ 0 0, var(--other), 1px 2px blue; }',
			errors: 2,
		},
		{
			code: 'a {\r\n  -moz-box-shadow: VAR(--shadow), RED 0\r\n    0 INSET !important;\r\n}',
			output: 'a {\r\n  -moz-box-shadow: VAR(--shadow), INSET 0\r\n    0 RED !important;\r\n}',
			errors: 1,
		},
		{
			code: 'a { box-shadow: env(shadow), red 0 0; text-shadow: red 0 0, attr(data-shadow type(*)); box-shadow: --shadow(), red 0 0; }',
			output: 'a { box-shadow: env(shadow), 0 0 red; text-shadow: 0 0 red, attr(data-shadow type(*)); box-shadow: --shadow(), 0 0 red; }',
			errors: 3,
		},
		{
			code: 'a { text-decoration: red wavy underline 2px; text-emphasis: red open circle; }',
			output: 'a { text-decoration: underline 2px wavy red; text-emphasis: open circle red; }',
			errors: 2,
		},
		{
			code: 'a { text-wrap: balance wrap; white-space: nowrap preserve; }',
			output: 'a { text-wrap: wrap balance; white-space: preserve nowrap; }',
			errors: 2,
		},
		{
			code: 'a { columns: 3 calc(20em); columns: calc(3) 20em; }',
			output: 'a { columns: calc(20em) 3; columns: 20em calc(3); }',
			errors: 2,
		},
		{
			code: 'a { columns: 3 min(20em, 30em) / calc(10em + 1px); }',
			output: 'a { columns: min(20em, 30em) 3 / calc(10em + 1px); }',
			errors: 1,
		},
		{
			code: 'a { columns: 3 20em / 10em; columns: 3 auto / auto; columns: auto 20em / 0; }',
			output: 'a { columns: 20em 3 / 10em; columns: auto 3 / auto; columns: 20em auto / 0; }',
			errors: 3,
		},
		{
			code: 'a {\r\n  -webkit-columns: 3 CALC(20EM) / /* height */ 10EM !important;\r\n}',
			output: 'a {\r\n  -webkit-columns: CALC(20EM) 3 / /* height */ 10EM !important;\r\n}',
			errors: 1,
		},
		{
			code: 'a { columns: 3 /* count */ calc(20em) / 10em; }',
			errors: 1,
		},
		{
			code: 'a { columns: 3 20em / var(--height, 10em); }',
			output: 'a { columns: 20em 3 / var(--height, 10em); }',
			errors: 1,
		},
		{
			code: 'a { columns: calc(3)20em/ /* height */ calc(var(--height) + 1px) !important; }',
			output: 'a { columns: 20em calc(3)/ /* height */ calc(var(--height) + 1px) !important; }',
			errors: 1,
		},
		{
			code: 'a { columns: 3 20em / random(5em, 10em); }',
			output: 'a { columns: 20em 3 / random(5em, 10em); }',
			errors: 1,
		},
		{
			code: 'a { columns: 3 20em /; columns: 3 20em / 10em / 2px; }',
			output: 'a { columns: 20em 3 /; columns: 20em 3 / 10em / 2px; }',
			errors: 2,
		},
		{
			code: 'a { box-shadow: red 0 0, blue calc(random(1px, 2px)) 0; }',
			output: 'a { box-shadow: 0 0 red, calc(random(1px, 2px)) 0 blue; }',
			errors: 2,
		},
		{
			code: 'a { text-shadow: blue RANDOM-ITEM(auto, 1px, 2px) 0 0, red 1px 2px; }',
			output: 'a { text-shadow: blue RANDOM-ITEM(auto, 1px, 2px) 0 0, 1px 2px red; }',
			errors: 1,
		},
		{
			code: 'a { border: calc(1px /* width */ + 2px) red solid; }',
			output: 'a { border: calc(1px /* width */ + 2px) solid red; }',
			errors: 1,
		},
		{
			code: 'a { text-decoration: wavy underline rgb(/* color */ 0 0 0); }',
			output: 'a { text-decoration: underline wavy rgb(/* color */ 0 0 0); }',
			errors: 1,
		},
		{
			code: 'a { text-decoration: calc(/* thickness */ 2px)rgb(0 0 0) wavy; }',
			output: 'a { text-decoration: calc(/* thickness */ 2px) wavy rgb(0 0 0); }',
			errors: 1,
		},
		{
			code: 'a { text-decoration: underline wavy calc(2px)rgb(/* color */ 0 0 0); }',
			output: 'a { text-decoration: underline calc(2px) wavy rgb(/* color */ 0 0 0); }',
			errors: 1,
		},
		{
			code: 'a { text-decoration: underline red /* keep */ wavy; }',
			errors: 1,
		},
		{
			code: 'a { text-decoration: underline /* line */ wavy calc(2px) /* color */ rgb(0 0 0); }',
			output: 'a { text-decoration: underline /* line */ calc(2px) wavy /* color */ rgb(0 0 0); }',
			errors: 1,
		},
	],
});

test({
	valid: [],
	invalid: [
		...[
			'rgb(var(--channels))',
			'rgba(1, 2, 3, var(--alpha))',
			'hsl(var(--hue) 50% 50%)',
			'hsla(0, 50%, 50%, var(--alpha))',
			'hwb(var(--hue) 0% 0%)',
			'lab(var(--lightness) 0 0)',
			'lch(50% var(--chroma) 0)',
			'oklab(var(--lightness) 0 0)',
			'oklch(50% var(--chroma) 0)',
			'color(display-p3 var(--channels))',
			'color-mix(in srgb, var(--color), blue)',
			'light-dark(var(--light), var(--dark))',
			'device-cmyk(var(--channels))',
			'contrast-color(var(--color))',
		].map(color => ({
			code: `a { border: ${color} solid 1px; }`,
			output: `a { border: 1px solid ${color}; }`,
			errors: 1,
		})),
		{
			code: 'a { border: rgb(from var(--color, red) r g calc(b + var(--blue))) solid 1px; }',
			output: 'a { border: 1px solid rgb(from var(--color, red) r g calc(b + var(--blue))); }',
			errors: 1,
		},
		{
			code: 'a { box-shadow: rgb(var(--channels, 1, 2, 3)) 0 0 inset, var(--shadow), color-mix(in srgb, var(--color, red), blue) 1px 2px; }',
			output: 'a { box-shadow: inset 0 0 rgb(var(--channels, 1, 2, 3)), var(--shadow), 1px 2px color-mix(in srgb, var(--color, red), blue); }',
			errors: 2,
		},
		{
			code: 'a { text-shadow: rgb(env(color-channels)) 0 0; column-rule: hsl(attr(data-hue deg) 50% 50%) dashed 1px; }',
			output: 'a { text-shadow: 0 0 rgb(env(color-channels)); column-rule: 1px dashed hsl(attr(data-hue deg) 50% 50%); }',
			errors: 2,
		},
		{
			code: 'a { text-emphasis: color-mix(in srgb, --theme-color(), blue) "•"; }',
			output: 'a { text-emphasis: "•" color-mix(in srgb, --theme-color(), blue); }',
			errors: 1,
		},
		{
			code: 'a { border: rgb(var(--channels, "random(0, 255)")) solid 1px; }',
			output: 'a { border: 1px solid rgb(var(--channels, "random(0, 255)")); }',
			errors: 1,
		},
		{
			code: 'a {\r\n  outline: RGB(VAR(--channels))solid\r\n    1px !important;\r\n}',
			output: 'a {\r\n  outline: 1px solid\r\n    RGB(VAR(--channels)) !important;\r\n}',
			errors: 1,
		},
		{
			code: String.raw`a { border: r\67 b(var(--channels)) solid 1px; }`,
			output: String.raw`a { border: 1px solid r\67 b(var(--channels)); }`,
			errors: 1,
		},
		{
			code: 'a { border: rgb(var(--channels) /* keep */) solid 1px; }',
			errors: 1,
		},
		{
			code: 'a { text-decoration: wavy underline rgb(var(--channels) /* keep */); }',
			output: 'a { text-decoration: underline wavy rgb(var(--channels) /* keep */); }',
			errors: 1,
		},
	],
});

test({
	valid: [
		'a { border: rgb(var(--channels)) solid calc(var(--width)); }',
		'a { box-shadow: rgb(var(--channels)) calc(var(--x)) calc(var(--y)) inset; }',
		'a { columns: sin(var(--angle)) calc(var(--width)); }',
		'a { columns: calc(var(--count)) calc(var(--width)); }',
		'a { border: red solid sin(var(--angle)); border: red solid calc-size(auto, var(--width)); }',
		'a { border: red solid random(var(--min), var(--max)); }',
		'a { border: red solid calc(var(--width)) var(--extra); }',
	],
	invalid: [
		...[
			'calc(var(--width))',
			'min(1px, var(--width))',
			'max(var(--width), 1px)',
			'clamp(1px, var(--width), 5px)',
			'abs(var(--width))',
			'hypot(var(--width), 1px)',
			'mod(var(--width), 1px)',
			'rem(var(--width), 1px)',
			'round(up, var(--width), 1px)',
		].map(width => ({
			code: `a { border: red solid ${width}; }`,
			output: `a { border: ${width} solid red; }`,
			errors: 1,
		})),
		{
			code: 'a { outline: red solid calc(env(width, 1px)); column-rule: blue dashed calc(attr(data-width px)); }',
			output: 'a { outline: calc(env(width, 1px)) solid red; column-rule: calc(attr(data-width px)) dashed blue; }',
			errors: 2,
		},
		{
			code: 'a { border: red solid calc(--theme-width()); }',
			output: 'a { border: calc(--theme-width()) solid red; }',
			errors: 1,
		},
		{
			code: 'a { text-decoration: red wavy underline calc(var(--thickness)); }',
			output: 'a { text-decoration: underline calc(var(--thickness)) wavy red; }',
			errors: 1,
		},
		{
			code: 'a { box-shadow: red 0 0 calc(var(--blur) + 1px); }',
			output: 'a { box-shadow: 0 0 calc(var(--blur) + 1px) red; }',
			errors: 1,
		},
		{
			code: 'a { columns: 3 calc(var(--width)); columns: calc(var(--count)) 20em / var(--height); }',
			output: 'a { columns: calc(var(--width)) 3; columns: 20em calc(var(--count)) / var(--height); }',
			errors: 2,
		},
		{
			code: 'a { columns: sin(var(--angle)) 20em; }',
			output: 'a { columns: 20em sin(var(--angle)); }',
			errors: 1,
		},
		{
			code: 'a {\r\n  -moz-box-shadow: RED CALC(VAR(--x))\r\n    MIN(VAR(--y), 2px) INSET !important;\r\n}',
			output: 'a {\r\n  -moz-box-shadow: INSET CALC(VAR(--x))\r\n    MIN(VAR(--y), 2px) RED !important;\r\n}',
			errors: 1,
		},
		{
			code: 'a { border: red solid calc(var(--width) /* keep */); }',
			errors: 1,
		},
		{
			code: 'a { border: calc(var(--width) /* keep */) red solid; }',
			output: 'a { border: calc(var(--width) /* keep */) solid red; }',
			errors: 1,
		},
	],
});

nodeTest('math substitution fixes preserve unresolved component order', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/consistent-value-order': 'error'}};
	for (const [property, value, output] of [
		['box-shadow', 'red calc(var(--x)) min(var(--y), 2px) inset', 'inset calc(var(--x)) min(var(--y), 2px) red'],
		['text-shadow', 'red calc(var(--x)) calc(var(--y))', 'calc(var(--x)) calc(var(--y)) red'],
		['box-shadow', 'calc(var(--x)) calc(var(--y)) rgb(var(--channels)) inset', 'inset calc(var(--x)) calc(var(--y)) rgb(var(--channels))'],
		['text-decoration', 'wavy underline calc(var(--thickness)) rgb(var(--channels))', 'underline calc(var(--thickness)) wavy rgb(var(--channels))'],
	]) {
		const code = `a { ${property}: ${value}; }`;
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, `a { ${property}: ${output}; }`);
		assert.deepEqual(result.messages, []);
		assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {...result, fixed: false});
		assert.deepEqual(result.output.match(/var\(--[\w-]+\)/gu), code.match(/var\(--[\w-]+\)/gu));
	}

	for (const code of [
		'a { --red: random(0, 255); --width: random(1px, 2px); border: rgb(var(--red) 0 0) solid calc(var(--width)); }',
		'a { --count: random(1, 3); --width: random(1px, 2px); columns: sin(var(--count)) calc(var(--width)); }',
	]) {
		assert.deepEqual(linter.verifyAndFix(code, config, {filename: 'test.css'}), {fixed: false, output: code, messages: []});
	}
});

nodeTest('color substitution fixes preserve validity after channel expansion', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/consistent-value-order': 'error'}};
	const value = 'rgb(var(--channels)) solid 1px';
	const output = '1px solid rgb(var(--channels))';
	const result = linter.verifyAndFix(`a { border: ${value}; }`, config, {filename: 'test.css'});
	assert.equal(result.output, `a { border: ${output}; }`);
	assert.deepEqual(result.messages, []);
	assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {...result, fixed: false});
	for (const [replacement, expectedValidity] of [['1 2 3', true], ['1, 2, 3', true], ['1 2 3 / 50%', true], ['', false], ['red', false], ['1 2 3, blue', false]]) {
		for (const borderValue of [value, output]) {
			const expandedValue = borderValue.replace('var(--channels)', () => replacement);
			assert.equal(Boolean(lexer.matchProperty('border', expandedValue).matched), expectedValidity, expandedValue);
		}
	}
});

nodeTest('fixes preserve component boundaries after hexadecimal escapes', () => {
	const linter = new Linter();
	const config = {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {css, cssicorn: plugin},
		rules: {'cssicorn/consistent-value-order': 'error'},
	};
	for (const [value, output] of [
		[String.raw`red solid 1p\78`, String.raw`1p\78  solid red`],
		[String.raw`red solid 1p\000078`, String.raw`1p\000078  solid red`],
		[String.raw`red 1px soli\64`, String.raw`1px soli\64  red`],
		[String.raw`red soli\64  1px`, String.raw`1px soli\64  red`],
		[String.raw`red 1px \73 olid`, String.raw`1px \73 olid red`],
	]) {
		const result = linter.verifyAndFix(`a { border: ${value}; }`, config, {filename: 'test.css'});
		assert.equal(result.output, `a { border: ${output}; }`);
		const stylesheet = toPlainObject(parse(result.output));
		const [styleRule] = stylesheet.children;
		const [declaration] = styleRule.block.children;
		assert.equal(declaration.value.children.length, 3);
		assert.ok(lexer.matchProperty('border', getCanonicalLexerNode(declaration.value)).matched);
		assert.deepEqual(result.messages, []);
	}
});

nodeTest('fixes converge with longhand combination and are idempotent', () => {
	const linter = new Linter();
	const config = {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {css, cssicorn: plugin},
		rules: {
			'cssicorn/consistent-value-order': 'error',
			'cssicorn/no-redundant-longhand-properties': 'error',
		},
	};
	for (const [code, output] of [
		[
			'a { flex-wrap: wrap; flex-direction: column; outline-color: red; outline-style: solid; outline-width: 1px; columns: 3 20em; }',
			'a { flex-flow: column wrap; outline: 1px solid red; columns: 20em 3; }',
		],
		[
			'a { text-decoration-color: red; text-decoration-style: wavy; text-decoration-line: underline; text-decoration-thickness: 2px; text-emphasis-color: blue; text-emphasis-style: circle; }',
			'a { text-decoration: underline 2px wavy red; text-emphasis: circle blue; }',
		],
	]) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output);
		assert.equal(result.fixed, true);
		assert.deepEqual(result.messages, []);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {...result, fixed: false});
	}
});

nodeTest('fixes preserve token boundaries and positional math lengths', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/consistent-value-order': 'error'}};
	for (const [code, output] of [
		['a { text-emphasis: rgb(1 2 3)"•"; }', 'a { text-emphasis: "•" rgb(1 2 3); }'],
		[
			'a { box-shadow: red calc(1px + 2px) min(3px, 4px) max(5px, 6px) clamp(7px, 8px, 9px) inset; }',
			'a { box-shadow: inset calc(1px + 2px) min(3px, 4px) max(5px, 6px) clamp(7px, 8px, 9px) red; }',
		],
		[
			'a { text-decoration: underline wavy calc(2px)rgb(0 0 0); }',
			'a { text-decoration: underline calc(2px) wavy rgb(0 0 0); }',
		],
		[
			'a { text-decoration: calc(2px)rgb(0 0 0) wavy; }',
			'a { text-decoration: calc(2px) wavy rgb(0 0 0); }',
		],
		[
			String.raw`a { text-decoration: underline wav\79  2px rgb(/* keep */ 0 0 0); }`,
			String.raw`a { text-decoration: underline 2px wav\79  rgb(/* keep */ 0 0 0); }`,
		],
		[
			'a { columns: calc(3) 20em / calc(10em); }',
			'a { columns: 20em calc(3) / calc(10em); }',
		],
	]) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output);
		assert.deepEqual(result.messages, []);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {...result, fixed: false});
		const [styleRule] = toPlainObject(parse(output)).children;
		const [declaration] = styleRule.block.children;
		assert.ok(lexer.matchProperty(declaration.property, getCanonicalLexerNode(declaration.value)).matched);
	}
});

nodeTest('literal shadow fixes preserve validity after variable expansion', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/consistent-value-order': 'error'}};
	for (const property of ['box-shadow', 'text-shadow']) {
		const value = 'red 1px 2px, var(--shadows), blue 3px 4px';
		const fixedValue = '1px 2px red, var(--shadows), 3px 4px blue';
		const result = linter.verifyAndFix(`a { ${property}: ${value}; }`, config, {filename: 'test.css'});
		assert.equal(result.output, `a { ${property}: ${fixedValue}; }`);
		assert.deepEqual(result.messages, []);
		assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {...result, fixed: false});
		for (const [replacement, expectedValidity] of [
			['green 5px 6px', true],
			['green 5px 6px, purple 7px 8px', true],
			['green 5px', false],
			['', false],
		]) {
			for (const shadowValue of [value, fixedValue]) {
				const expandedValue = shadowValue.replace('var(--shadows)', () => replacement);
				assert.equal(Boolean(lexer.matchProperty(property, expandedValue).matched), expectedValidity, expandedValue);
			}
		}
	}
});

test({
	valid: [
		'a { border: rgb(random(0, 255) 0 0) solid calc(random(1px, 2px)); }',
		'a { border: rgb(var(--channels)) solid calc(random(1px, 2px)); }',
		'a { border: rgb(random(0, 255) 0 0) solid calc(var(--width)); }',
		'a { border: rgb(env(channels, random(0, 255))) solid calc(var(--width, random(1px, 2px))); }',
		'a { border: rgb(random(0, 255) 0 0) solid 1px var(--extra); }',
	],
	invalid: [
		...[
			'calc(random(1px, 5px) + 1px)',
			'calc(var(--width, random(1px, 2px)))',
			'min(1px, env(width, random-item(auto, 2px, 3px)))',
		].map(width => ({
			code: `a { border: red solid ${width}; }`,
			output: `a { border: ${width} solid red; }`,
			errors: 1,
		})),
		...[
			'rgb(random(0, 255) 0 0)',
			'rgb(var(--channels, random(0, 255)))',
			'rgb(env(channels, RANDOM-ITEM(auto, 1, 2)))',
			String.raw`rgb(var(--channels, r\61 ndom(0, 255)))`,
			'rgb(random(0, 255) var(--green) 0)',
			'color-mix(in srgb, random-item(auto, red, blue), var(--color))',
			'rgb(from var(--color) r g random(0, 255))',
		].map(color => ({
			code: `a { border: ${color} solid 1px; }`,
			output: `a { border: 1px solid ${color}; }`,
			errors: 1,
		})),
		{
			code: 'a { columns: 3 calc(random(1px, 2px)) / random(5em, 10em); }',
			output: 'a { columns: calc(random(1px, 2px)) 3 / random(5em, 10em); }',
			errors: 1,
		},
		{
			code: 'a {\r\n  -webkit-box-shadow: red CALC(RANDOM(1px, 2px)) 0 INSET !important;\r\n}',
			output: 'a {\r\n  -webkit-box-shadow: INSET CALC(RANDOM(1px, 2px)) 0 red !important;\r\n}',
			errors: 1,
		},
		{
			code: 'a { border: red solid calc(random(1px, 2px) /* keep */); }',
			errors: 1,
		},
		{
			code: 'a { border: calc(random(1px, 2px) /* keep */) red solid; }',
			output: 'a { border: calc(random(1px, 2px) /* keep */) solid red; }',
			errors: 1,
		},
		{
			code: 'a { text-decoration: wavy calc(random(1px, 2px)) underline rgb(random(0, 255) 0 0); }',
			output: 'a { text-decoration: underline calc(random(1px, 2px)) wavy rgb(random(0, 255) 0 0); }',
			errors: 1,
		},
	],
});

nodeTest('shadow fixes preserve random-function order', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/consistent-value-order': 'error'}};
	for (const property of ['box-shadow', 'text-shadow']) {
		for (const [value, output] of [
			[
				'blue random(1px, 2px) random(3px, 4px), red 0 0, green random(5px, 6px) 0',
				'blue random(1px, 2px) random(3px, 4px), 0 0 red, green random(5px, 6px) 0',
			],
			[
				'var(--other, red random(1px, 2px) 0), blue 3px 4px, random-item(auto, green 5px 6px, purple 7px 8px)',
				'var(--other, red random(1px, 2px) 0), 3px 4px blue, random-item(auto, green 5px 6px, purple 7px 8px)',
			],
			[
				'red calc(random(1px, 2px)) calc(random(3px, 4px)), blue calc(var(--x, random(5px, 6px))) calc(random(7px, 8px))',
				'calc(random(1px, 2px)) calc(random(3px, 4px)) red, calc(var(--x, random(5px, 6px))) calc(random(7px, 8px)) blue',
			],
			[
				'rgb(random(0, 255) 0 0) 0 0, red 1px 2px',
				'0 0 rgb(random(0, 255) 0 0), 1px 2px red',
			],
		]) {
			const result = linter.verifyAndFix(`a { ${property}: ${value}; }`, config, {filename: 'test.css'});
			assert.equal(result.output, `a { ${property}: ${output}; }`);
			assert.deepEqual(result.output.match(/(?:random|random-item|var)\([^()]*\)/gu), value.match(/(?:random|random-item|var)\([^()]*\)/gu));
			assert.deepEqual(result.messages, []);
			assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {...result, fixed: false});
		}
	}
});

nodeTest('columns prefix fixes preserve validity after height substitution', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/consistent-value-order': 'error'}};
	const value = '3 20em / var(--height)';
	const output = '20em 3 / var(--height)';
	const result = linter.verifyAndFix(`a { columns: ${value}; }`, config, {filename: 'test.css'});
	assert.equal(result.output, `a { columns: ${output}; }`);
	assert.deepEqual(result.messages, []);
	assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {...result, fixed: false});
	for (const [replacement, expectedValidity] of [['10em', true], ['calc(10em)', true], ['', false], ['red', false], ['10em / 20em', false]]) {
		for (const columnValue of [value, output]) {
			const expandedValue = columnValue.replace('var(--height)', () => replacement);
			assert.equal(Boolean(lexer.matchProperty('columns', expandedValue).matched), expectedValidity, expandedValue);
		}
	}
});

nodeTest('presets enable value ordering only for recommended and all', () => {
	const linter = new Linter();
	for (const [preset, expectedCount] of [['recommended', 1], ['all', 1], ['unopinionated', 0]]) {
		const messages = linter.verify('a { border: red solid 1px; }', plugin.configs[preset], {filename: 'test.css'});
		const orderingMessages = messages.filter(message => message.ruleId === 'cssicorn/consistent-value-order');
		assert.equal(orderingMessages.length, expectedCount, preset);
	}
});

nodeTest('ordering converges with other preset fixes', () => {
	const linter = new Linter();
	for (const [code, output] of [
		[
			'.example { columns: 3 0px; box-shadow: #000000 0px 1px 2px inset; }',
			'.example { columns: 0px 3; box-shadow: inset 0 1px 2px #000; }',
		],
		[
			'.example { columns: 3 calc(20em) / calc(10em); text-decoration: wavy underline rgb(/* color */ 0 0 0); }',
			'.example { columns: 20em 3 / 10em; text-decoration: underline wavy rgb(/* color */ 0 0 0); }',
		],
	]) {
		for (const preset of ['recommended', 'all']) {
			const result = linter.verifyAndFix(code, plugin.configs[preset], {filename: 'test.css'});
			assert.equal(result.output, output, preset);
			assert.equal(result.fixed, true);
			assert.deepEqual(result.messages, []);
			assert.deepEqual(linter.verifyAndFix(output, plugin.configs[preset], {filename: 'test.css'}), {...result, fixed: false});
		}
	}
});
