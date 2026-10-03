import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { overflow-wrap: break-word; gap: 1rem; break-before: page; overflow: auto; text-orientation: sideways; }',
		'@media screen and (color) { :is(article, section)::before { color: CanvasText; } }',
		'-webkit-box { -webkit-box-orient: vertical; }',
		'a { --word-wrap: overlay; custom-property: overlay; color: custom(activecaption); }',
		'a { appearance: custom(button); color: rgb(0 0 0); width: 1intrinsic; }',
		'a { color: rgb(from custom(activecaption) r g b); }',
		'ALTGLYPH, glyphref { color: red; }',
		'::part(acronym), :lang(acronym) { color: red; }',
		':state(acronym), :active-view-transition-type(acronym), :heading(acronym) { color: red; }',
		String.raw`acronym|div, acronym|*, svg|altglyph, foo\|bar { color: red; }`,
		'@media (tv) { a { color: red; } }',
		'@supports (overflow-wrap: break-word) { a { color: red; } }',
		'a { __proto__: constructor; constructor: name; appearance: constructor; color: __proto__; }',
		':deep(a b) {}',
		// CSS Modules interop blocks are read by JavaScript as exact strings.
		':export { grid-gap: 1px; word-wrap: break-word; overflow: overlay; }',
		':import("./theme.css") { grid-gap: 1px; }',
		{code: 'word-wrap { word-wrap: break-word; }', options: [{allow: ['word-wrap']}]},
		{
			code: '@viewport { acronym:matches(::content) { word-break: break-word; } } @media tv {}', options: [{
				allow: ['@viewport', 'acronym', ':matches', '::content', 'word-break: break-word', '@media tv'],
			}],
		},
		{code: String.raw`@v\69 ewport { ACRONYM:m\61 tches(a) { w\6f rd-break: break-word; } }`, options: [{allow: ['@viewport', 'acronym', ':matches', 'word-break: break-word']}]},
	],
	invalid: [
		'@viewport { color: red; }',
		'@nest & > a { color: red; }',
		'@media tv { a { color: red; } }',
		'@media only PROJECTION { a { color: red; } }',
		'@media aural, projection { a { color: red; } }',
		'acronym, APPLET, altGlyph, glyphRef { color: red; }',
		String.raw`@namespace svg url("x"); svg|font, *|acronym, |applet, svg|altGlyph, svg|alt\47 lyph { color: red; }`,
		':matches(article), :-webkit-any(article), :focus-ring { color: red; }',
		'::content, ::shadow { color: red; }',
		'a { word-wrap: break-word; grid-gap: 1rem; grid-row-gap: 2rem; grid-column-gap: 3rem; }',
		'a { page-break-before: always; page-break-after: always; page-break-inside: avoid; }',
		'a { overflow: overlay; overflow-x: OVERLAY; overflow-y: overlay; text-orientation: sideways-right; }',
		'a { appearance: button; image-rendering: optimizeQuality; text-justify: distribute; user-select: element; zoom: reset; }',
		'a { color: activecaption; border-color: red inactiveborder; scrollbar-color: menu transparent; }',
		'a { scrollbar-color: custom(background) menu; }',
		'a { text-decoration: blink; box-sizing: padding-box; width: intrinsic; word-break: break-word; }',
		'a { -moz-box-align: center; position-try-options: --fallback; scroll-snap-margin: 1rem; clip: rect(0); }',
		'@supports (word-wrap: break-word) { a { overflow: overlay; } }',
		'@page acronym { background-color: activecaption; }',
		'main { & acronym { overflow: overlay; } }',
		':not(acronym), :nth-child(2n of applet), :host(font) { color: red; }',
		String.raw`@v\69 ewport { ACRONYM:m\61 tches(a) { w\6f rd-wrap: break-word; } }`,
		'a { color: rgb(from activecaption r g b); color: activecaption activeborder; }',
		// The replacement property is already declared in the same block
		'p { word-wrap: break-word; overflow-wrap: break-word; }',
		'p { overflow-wrap: break-word; word-wrap: break-word; }',
		'p { page-break-inside: avoid; break-inside: avoid; }',
		'p { break-inside: avoid; page-break-inside: avoid; }',
		'p { grid-gap: 1rem; gap: 1rem; }',
		'p { gap: 1rem; grid-gap: 1rem; }',
		'p { page-break-before: always; break-before: page; }',
		'p { word-wrap: break-word; OVERFLOW-WRAP: break-word; }',
		String.raw`p { word-wrap: break-word; overfl\6f w-wrap: break-word; }`,
		'p { -webkit-box-flex: 1; flex-grow: 1; }',
		// The replacement property is only in another block
		'p { word-wrap: break-word; & span { overflow-wrap: break-word; } }',
		'p { grid-gap: 1rem; @media (width > 1px) { gap: 2rem; } }',
		'p { page-break-inside: avoid; } div { break-inside: avoid; }',
		'p { grid-column-gap: 1rem; -webkit-column-gap: 1rem; --column-gap: 1rem; }',
		'.a:export { grid-gap: 1px; }',
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'a { word-wrap /* keep */: break-word; }',
			output: 'a { overflow-wrap /* keep */: break-word; }',
			errors: [{messageId: 'no-deprecated-features/error'}],
		},
		{
			code: 'a { page-break-before: /* keep */ always; }',
			output: 'a { break-before: /* keep */ page; }',
			errors: [{messageId: 'no-deprecated-features/error'}],
		},
		{
			code: ':matches(/* keep */ a) {}',
			output: ':is(/* keep */ a) {}',
			errors: [{messageId: 'no-deprecated-features/error'}],
		},
		{
			code: '@supports selector(:matches(acronym)) {}',
			output: '@supports selector(:is(acronym)) {}',
			errors: 2,
		},
		{
			code: '@supports selector(\n\t:contains(\n\t\t:matches(acronym)\n\t)\n) {}',
			output: '@supports selector(\n\t:contains(\n\t\t:is(acronym)\n\t)\n) {}',
			errors: 3,
		},
		{
			code: String.raw`a { overflow: o\76 erlay; }`,
			output: 'a { overflow: auto; }',
			errors: [{messageId: 'no-deprecated-features/error'}],
		},
		{
			code: 'a { overflow: /* a */ overlay /* b */ overlay !important; }',
			output: 'a { overflow: /* a */ auto /* b */ auto !important; }',
			errors: 2,
		},
		{
			code: 'a { appearance: button; }',
			output: null,
			errors: [
				{
					messageId: 'no-deprecated-features/error',
					suggestions: [{messageId: 'no-deprecated-features/suggestion', output: 'a { appearance: auto; }'}],
				},
			],
		},
		{
			code: 'a { -moz-box-align: center; }',
			output: null,
			errors: [
				{
					messageId: 'no-deprecated-features/error',
					suggestions: [{messageId: 'no-deprecated-features/suggestion', output: 'a { align-items: center; }'}],
				},
			],
		},
		{
			code: 'a { word-break: break-word; }',
			output: null,
			errors: [{messageId: 'no-deprecated-features/error', suggestions: 0}],
		},
		{
			code: 'a { page-break-before: var(--break); }',
			output: null,
			errors: [{messageId: 'no-deprecated-features/error', suggestions: 0}],
		},
		{
			code: '::content {}',
			output: null,
			errors: [{messageId: 'no-deprecated-features/error', suggestions: 0}],
		},
		{
			code: '@media not /* tv */ tv { a { color: red; } }',
			errors: [{messageId: 'no-deprecated-features/error', column: 21, endColumn: 23}],
		},
		{
			code: String.raw`@import "x.css" print, pro\6a ection;`,
			errors: [{messageId: 'no-deprecated-features/error', column: 24, endColumn: 37}],
		},
		{
			code: '@container style(overflow: overlay) {}',
			output: '@container style(overflow: auto) {}',
			errors: [{messageId: 'no-deprecated-features/error'}],
		},
		{
			code: ':contains(popup), :drop(acronym) { color: red; }',
			errors: [
				{messageId: 'no-deprecated-features/error', data: {feature: 'selector', name: ':contains'}},
				{messageId: 'no-deprecated-features/error', data: {feature: 'selector', name: 'popup'}},
				{messageId: 'no-deprecated-features/error', data: {feature: 'selector', name: ':drop'}},
				{messageId: 'no-deprecated-features/error', data: {feature: 'selector', name: 'acronym'}},
			],
		},
		{
			code: ':contains(:matches(acronym)), :contains(:drop(acronym)) {}',
			output: ':contains(:is(acronym)), :contains(:drop(acronym)) {}',
			errors: 6,
		},
		{
			code: ':foo(:matches(acronym)), :--foo(:drop(popup)) {}',
			output: ':foo(:is(acronym)), :--foo(:drop(popup)) {}',
			errors: 4,
		},
		{
			code: ':contains(svg|altGlyph) { color: red; }',
			errors: [
				{
					messageId: 'no-deprecated-features/error', data: {feature: 'selector', name: ':contains'}, column: 1, endColumn: 10,
				},
				{
					messageId: 'no-deprecated-features/error', data: {feature: 'selector', name: 'altGlyph'}, column: 15, endColumn: 23,
				},
			],
		},
		{
			code: '::cue(acronym), ::cue-region(:matches(acronym)) {}',
			output: '::cue(acronym), ::cue-region(:is(acronym)) {}',
			errors: 3,
		},
		{
			code: ':deep(a acronym) {}',
			errors: [
				{
					messageId: 'no-deprecated-features/error', data: {feature: 'selector', name: 'acronym'}, column: 9, endColumn: 16,
				},
			],
		},
	],
});
