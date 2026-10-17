import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import css from '@eslint/css';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'.page .card {} .other .page .card .title {}',
		'.page:scope .card {} .page:scope .card .title {}',
		'@scope (.page) { .page .card {} .page .card .title {} }',
		'.card {} @container (width > 0px) { .card { & .title {} } }',
		'.card {} @container (width > 0px) { .card { @media (color) { color: blue; } } }',
		'.card {} @container (width > 0px) { .card {} .other {} }',
		'.card {} @container (width > 0px) { .card, .other {} }',
		'.card {} @container (width > 0px) { .card .title {} }',
		'@scope (.page) { .card {} @container (width > 0px) { .card {} } }',
		':is(.foo > .bar, .baz) {}',
		'a :is(.foo > .bar) {}',
		'.outer { .target :is(.foo > &, .baz) {} }',
		// The parser rejects a nested rule that starts with an empty type namespace.
		'.foo { color: red; } |a.foo { color: blue; }',
		'.x { color: red; } |a .x { color: blue; }',
		'.x { color: red; } |a > .x { color: blue; }',

		'.x { color: red; } *|a .x { color: blue; }',
		'a :is(.foo > .bar, #baz) { color: red; }',
		'.outer, #outer { :is(.foo ~ .bar, .baz) a { color: red; } }',
	],
	invalid: [
		{
			code: '.card { color: red; } .card span::before, .card.active { content: ""; }',
			output: '.card { color: red; & span::before, &.active { content: ""; } }',
			errors: 1,
		},
		{
			code: '.card { color: red; } .card span::before, .card .title { content: ""; }',
			output: '.card { color: red; & span::before, .title { content: ""; } }',
			errors: 1,
		},
		{
			code: '.outer { > .card {} > .card .title {} }',
			output: '.outer { > .card { .title {} } }',
			errors: 1,
		},
		{
			code: '.x { color: red; } .x |a { color: blue; }',
			output: '.x { color: red; & |a { color: blue; } }',
			errors: 1,
		},
		...['.page .card', '.page > .card', '.page + .card', '.page ~ .card'].map(parent => ({
			code: `${parent} { color: red; } ${parent} .title, ${parent}:hover { color: blue; }`,
			output: `${parent} { color: red; .title, &:hover { color: blue; } }`,
			errors: 1,
		})),
		{
			code: '.page .card {} .page .card .title {}',
			output: '.page .card { .title {} }',
			errors: 1,
		},
		{
			code: '.page  .card {} .page .card .title {}',
			output: '.page  .card { .title {} }',
			errors: 1,
		},
		{
			code: '.outer, #outer { .page > .card { color: red; } .page > .card .title { color: blue; } }',
			output: '.outer, #outer { .page > .card { color: red; .title { color: blue; } } }',
			errors: 1,
		},
		{
			code: String.raw`.p\61 ge > .card { color: red; } .p\61 ge > .card::before { content: ""; }`,
			output: String.raw`.p\61 ge > .card { color: red; &::before { content: ""; } }`,
			errors: 1,
		},
		...['first-child', 'last-child', 'only-child', 'first-of-type', 'last-of-type', 'only-of-type', 'empty', 'root', 'target'].map(pseudoClass => ({
			code: `.card:${pseudoClass} { color: red; } .card:${pseudoClass} + .hint { color: blue; }`,
			output: `.card:${pseudoClass} { color: red; + .hint { color: blue; } }`,
			errors: 1,
		})),
		{
			code: String.raw`.card:\46 IRST-CHILD { color: red; } .card:\46 IRST-CHILD .title { color: blue; }`,
			output: String.raw`.card:\46 IRST-CHILD { color: red; .title { color: blue; } }`,
			errors: 1,
		},
		...['container (width > 0px)', 'container layout (width > 0px)', 'container style(--theme: dark)', 'CONTAINER (width < 0px)'].map(atRule => ({
			code: `.card { color: red; } @${atRule} { .card { color: blue !important; } }`,
			output: `.card { color: red; @${atRule} { color: blue !important; } }`,
			errors: 1,
		})),
		{
			code: '.card {} @container (width > 0px) { .card {} }',
			output: '.card { @container (width > 0px) {} }',
			errors: 1,
		},
		{
			code: String.raw`.page > .card:LAST-CHILD { color: red; } @c\6f ntainer (color) { .page > .card:LAST-CHILD { --value: blue; } }`,
			output: String.raw`.page > .card:LAST-CHILD { color: red; @c\6f ntainer (color) { --value: blue; } }`,
			errors: 1,
		},
		{
			code: '@media (width > 0px) { .page .card { color: red; } @container (width > 0px) { .page .card { color: blue; } } }',
			output: '@media (width > 0px) { .page .card { color: red; @container (width > 0px) { color: blue; } } }',
			errors: 1,
		},
		{
			code: '.card {\r\n  color: red;\r\n}\r\n@container (width > 0px) {\r\n  .card {\r\n    color: blue;\r\n  }\r\n}',
			output: '.card {\r\n  color: red;\r\n  @container (width > 0px) {\r\n    color: blue;\r\n  }\r\n}',
			errors: 1,
		},
		{
			code: '.card { color: red; } @container (width > 0px) { .card { color: blue; /* keep */ } }',
			errors: 1,
		},
		{
			code: '.page .card { color: red; } /* keep */ .page .card .title { color: blue; }',
			errors: 1,
		},
		{
			code: ':is(.foo + .bar, .baz).active { color: red; & .title { color: blue; } }',
			output: '.foo + .bar, .baz { &.active { color: red; & .title { color: blue; } } }',
			errors: 1,
		},
	],
});

test({
	valid: [
		'.card {} .card {}',
		'.card {} .cardinal {}',
		'.card {} .card-other {}',
		'.card {} .other {} .card .title {}',
		'.card .title {} .card {}',
		'.card, .other {} .card .title {}',
		'.card::before {} .card::before.active {}',
		'.card {} .card .title:unknown {}',
		'.outer { .card {} & .card .title {} }',
		'.outer { .card {} .card:has(&) {} }',
		'.outer { .card {} --value: red; .card .title {} }',
		'@scope (.outer) { .card {} .card .title {} }',
		'@namespace url("http://www.w3.org/1999/xhtml"); .card {} .card .title {}',
		String.raw`.c\61 rd {} .card .title {}`,
	],
	invalid: [
		{
			code: '.message { color: red; } .message a:not(.button) { color: blue; }',
			output: '.message { color: red; a:not(.button) { color: blue; } }',
			errors: 1,
		},
		{
			code: 'BUTTON { COLOR: RED; } BUTTON:hover { COLOR: BLUE; }',
			output: 'BUTTON { COLOR: RED; &:hover { COLOR: BLUE; } }',
			errors: 1,
		},
		{
			code: ':is(.foo, .bar) a:not(.button) { color: blue; }',
			output: '.foo, .bar { a:not(.button) { color: blue; } }',
			errors: 1,
		},
		{
			code: '.card { color: red; } .card .title { color: blue; }',
			output: '.card { color: red; .title { color: blue; } }',
			errors: [{messageId: 'prefer-nesting/related-rules'}],
		},
		...['>', '+', '~'].map(combinator => ({
			code: `a { color: red; } a ${combinator} b { color: blue; }`,
			output: `a { color: red; ${combinator} b { color: blue; } }`,
			errors: 1,
		})),
		...['.active', ':hover', '::before'].map(suffix => ({
			code: `.card { color: red; } .card${suffix} { color: blue; }`,
			output: `.card { color: red; &${suffix} { color: blue; } }`,
			errors: 1,
		})),
		{
			code: '[data-x].card { color: red; } [data-x].card .title { color: blue !important; }',
			output: '[data-x].card { color: red; .title { color: blue !important; } }',
			errors: 1,
		},
		{
			code: String.raw`.f\6f o { color: red; } .f\6f o .b\61 r { color: blue; }`,
			output: String.raw`.f\6f o { color: red; .b\61 r { color: blue; } }`,
			errors: 1,
		},
		{
			code: '.card { color: red; } .card .title { color: blue; & > b { color: green; } }',
			output: '.card { color: red; .title { color: blue; & > b { color: green; } } }',
			errors: 1,
		},
		{
			code: '.card { & > a { color: red; } } .card .title { color: blue; }',
			output: '.card { & > a { color: red; } .title { color: blue; } }',
			errors: 1,
		},
		{
			code: '.card {} .card .title { color: blue; } .card .body { color: green; }',
			output: '.card { .title { color: blue; } .body { color: green; } }',
			errors: 1,
		},
		{
			code: '.outer, #outer { .card { color: red; } .card .title { color: blue; } }',
			output: '.outer, #outer { .card { color: red; .title { color: blue; } } }',
			errors: 1,
		},
		...['media (width > 0px)', 'supports (display: grid)', 'container (width > 0px)', 'layer theme'].map(atRule => ({
			code: `@${atRule} { .card { color: red; } .card .title { color: blue; } }`,
			output: `@${atRule} { .card { color: red; .title { color: blue; } } }`,
			errors: 1,
		})),
		{
			code: '.card {\n\tcolor: red;\n}\n\n.card .title {\n\tcolor: blue;\n}',
			output: '.card {\n\tcolor: red;\n\t.title {\n\t\tcolor: blue;\n\t}\n}',
			errors: 1,
		},
		{
			code: '.card {\r\n  color: red;\r\n}\r\n.card .title {\r\n  color: blue;\r\n}',
			output: '.card {\r\n  color: red;\r\n  .title {\r\n    color: blue;\r\n  }\r\n}',
			errors: 1,
		},
		...[
			'.card { color: red } .card .title { color: blue; }',
			String.raw`.card { --value: red\; } .card .title { color: blue; }`,
			'.card { color: red; /* keep */ } .card .title { color: blue; }',
			'.card { color: red; } /* keep */ .card .title { color: blue; }',
			'.card { color: red; } .card .title { color: blue; /* keep */ }',
			'.card {\n  color: red;\n}\n.card .title {\n    color: blue;\n}',
			'.card {\n\tcolor: red;\n}\n.card .title {\n\t--value: a\n\t\tb;\n}',
		].map(code => ({code, errors: 1})),
	],
});

test({
	valid: [
		'.card {} .card .title, .other .body {}',
		'.card {} .card .title, .card:unknown {}',
		'.outer { .card {} .card .title, & .card .body {} }',
		'.card:scope {} .card:scope .title {}',
		'.card:unknown {} .card:unknown .title {}',
		'.card {} @media (width > 0px) { .other {} }',
		'.card {} @media (width > 0px) { .card {} .other {} }',
		'.card {} @media (width > 0px) { .card, .other {} }',
		'.card {} @supports (display: grid) {}',
		'.card {} .other {} @media (width > 0px) { .card {} }',
		'@media (width > 0px) { .card {} } .card {}',
		'@scope (.outer) { .card {} @media (width > 0px) { .card {} } }',
	],
	invalid: [
		{
			code: '.card { color: red; } .card .title, .card .body { color: blue; }',
			output: '.card { color: red; .title, .body { color: blue; } }',
			errors: [{messageId: 'prefer-nesting/related-rules'}],
		},
		{
			code: '.card {} .card .title, .card > #body, .card:hover { color: blue; }',
			output: '.card { .title, > #body, &:hover { color: blue; } }',
			errors: 1,
		},
		{
			code: '.card {\n\tcolor: red;\n}\n.card .title,\n.card .body {\n\tcolor: blue;\n}',
			output: '.card {\n\tcolor: red;\n\t.title,\n\t.body {\n\t\tcolor: blue;\n\t}\n}',
			errors: 1,
		},
		...[
			'hover',
			'active',
			'focus',
			'focus-visible',
			'focus-within',
			'checked',
			'disabled',
			'enabled',
			'valid',
			'invalid',
			'required',
			'optional',
			'read-only',
			'read-write',
			'indeterminate',
			'placeholder-shown',
		].map(pseudoClass => ({
			code: `.card:${pseudoClass} { color: red; } .card:${pseudoClass} .title { color: blue; }`,
			output: `.card:${pseudoClass} { color: red; .title { color: blue; } }`,
			errors: 1,
		})),
		{
			code: String.raw`.card:\48 OVER { color: red; } .card:\48 OVER .title { color: blue; }`,
			output: String.raw`.card:\48 OVER { color: red; .title { color: blue; } }`,
			errors: 1,
		},
		{
			code: '.card:hover:focus {} .card:hover:focus .title, .card:hover:focus .body { color: blue; }',
			output: '.card:hover:focus { .title, .body { color: blue; } }',
			errors: 1,
		},
		...['media (width > 0px)', 'supports (display: grid)', 'supports selector(&)', 'MEDIA (width < 0px)'].map(atRule => ({
			code: `.card { color: red; } @${atRule} { .card { color: blue; } }`,
			output: `.card { color: red; @${atRule} { color: blue; } }`,
			errors: 1,
		})),
		{
			code: String.raw`.card { color: red; } @m\65 dia (color) { .card { color: blue; } }`,
			output: String.raw`.card { color: red; @m\65 dia (color) { color: blue; } }`,
			errors: 1,
		},
		{
			code: '.card:hover { color: red; } @media (width > 0px) { .card:hover { color: blue; & > a { color: green; } } }',
			output: '.card:hover { color: red; @media (width > 0px) { color: blue; & > a { color: green; } } }',
			errors: 1,
		},
		{
			code: '.card { color: red; } @media (width > 0px) { .card { color: blue; } } .card .title { color: green; } @supports (display: grid) { .card { display: grid; } }',
			output: '.card { color: red; @media (width > 0px) { color: blue; } .title { color: green; } @supports (display: grid) { display: grid; } }',
			errors: 1,
		},
		{
			code: '.outer, #outer { .card { color: red; } @media (width > 0px) { .card { color: blue !important; } } }',
			output: '.outer, #outer { .card { color: red; @media (width > 0px) { color: blue !important; } } }',
			errors: 1,
		},
		{
			code: '.card {\n\tcolor: red;\n}\n@media (width > 0px) {\n\t.card {\n\t\tcolor: blue;\n\t}\n}',
			output: '.card {\n\tcolor: red;\n\t@media (width > 0px) {\n\t\tcolor: blue;\n\t}\n}',
			errors: 1,
		},
		{
			code: '.card {\n\tcolor: red;\n}\n@media (color) {\n\t.card {\n\t\tcolor: blue;\n\t\t& .title {\n\t\t\tcolor: green;\n\t\t}\n\t}\n}',
			output: '.card {\n\tcolor: red;\n\t@media (color) {\n\t\tcolor: blue;\n\t\t& .title {\n\t\t\tcolor: green;\n\t\t}\n\t}\n}',
			errors: 1,
		},
		{
			code: '.card {\r\n  color: red;\r\n}\r\n@supports (display: grid) {\r\n  .card {\r\n    display: grid;\r\n  }\r\n}',
			output: '.card {\r\n  color: red;\r\n  @supports (display: grid) {\r\n    display: grid;\r\n  }\r\n}',
			errors: 1,
		},
		...[
			'.card { color: red; } @media /* keep */ (width > 0px) { .card { color: blue; } }',
			'.card { color: red; } @media (width > 0px) { /* keep */ .card { color: blue; } }',
			'.card { color: red; } @media (width > 0px) { .card { color: blue; /* keep */ } }',
			'.card { color: red } @media (width > 0px) { .card { color: blue; } }',
			'.card {\n\tcolor: red;\n}\n@media (width > 0px) {\n    .card {\n        color: blue;\n    }\n}',
			'.card {\n\tcolor: red;\n}\n@media (width > 0px) {\n\t.card {\n\t\t--value: a\n\t\t\tb;\n\t}\n}',
		].map(code => ({code, errors: 1})),
	],
});

test({
	valid: [
		'[data-kind="CARD" i] {} [data-kind="CARD" s] .title {}',
		'[data-kind="CARD" i] {} [data-kind="card" i] .title {}',
		'[data-kind="CARD" x] {} [data-kind="CARD" x] .title {}',
		'[ns|kind="CARD" i] {} [ns|kind="CARD" i] .title {}',
		'@namespace url("http://www.w3.org/1999/xhtml"); [data-kind="CARD" i] {} [data-kind="CARD" i] .title {}',
	],
	invalid: [
		...['i', 's', 'I', 'S'].map(flag => ({
			code: `[data-kind="CARD" ${flag}] { color: red; } [data-kind="CARD" ${flag}] .title { color: blue; }`,
			output: `[data-kind="CARD" ${flag}] { color: red; .title { color: blue; } }`,
			errors: 1,
		})),
		{
			code: String.raw`[data-kind="CARD" \69] { color: red; } [data-kind="CARD" \69] .title { color: blue; }`,
			output: String.raw`[data-kind="CARD" \69] { color: red; .title { color: blue; } }`,
			errors: 1,
		},
		{
			code: String.raw`form:\49 NVALID { color: red; } form:\49 NVALID .message { color: blue; }`,
			output: String.raw`form:\49 NVALID { color: red; .message { color: blue; } }`,
			errors: 1,
		},
		{
			code: 'input:REQUIRED { color: red; } input:REQUIRED + .hint { color: blue; }',
			output: 'input:REQUIRED { color: red; + .hint { color: blue; } }',
			errors: 1,
		},
		{
			code: '[data-kind="CARD" i]:invalid { color: red; } [data-kind="CARD" i]:invalid .title, [data-kind="CARD" i]:invalid::before { color: blue; }',
			output: '[data-kind="CARD" i]:invalid { color: red; .title, &::before { color: blue; } }',
			errors: 1,
		},
		{
			code: '[data-kind="CARD" s] { color: red; } @media (width > 0px) { [data-kind="CARD" s] { color: blue; } }',
			output: '[data-kind="CARD" s] { color: red; @media (width > 0px) { color: blue; } }',
			errors: 1,
		},
		{
			code: 'form:invalid { color: red; } @supports (display: grid) { form:invalid { color: blue; } }',
			output: 'form:invalid { color: red; @supports (display: grid) { color: blue; } }',
			errors: 1,
		},
		{
			code: '.outer { [data-kind="CARD" i] { color: red; } [data-kind="CARD" i] .title { color: blue; } }',
			output: '.outer { [data-kind="CARD" i] { color: red; .title { color: blue; } } }',
			errors: 1,
		},
		{
			code: '[data-kind="CARD" i] {\r\n  color: red;\r\n}\r\n[data-kind="CARD" i] .title {\r\n  color: blue;\r\n}',
			output: '[data-kind="CARD" i] {\r\n  color: red;\r\n  .title {\r\n    color: blue;\r\n  }\r\n}',
			errors: 1,
		},
		{
			code: '[data-kind="CARD" i] { color: red; } [data-kind="CARD" i] .title { color: blue; /* keep */ }',
			errors: 1,
		},
		{
			code: ':is([data-kind="CARD" i], .card) .title { color: blue; }',
			output: '[data-kind="CARD" i], .card { .title { color: blue; } }',
			errors: 1,
		},
	],
});

test.snapshot({
	valid: [
		'a { color: red; }',
		':is(.foo, .bar) {}',
		'a :is(.foo) {}',
		':is(.foo) a {}',
		'a :is(.foo, .bar), b {}',
		':is(.foo, .bar) a, b {}',
		'a :not(.foo, .bar) {}',
		'a :has(.foo, .bar) {}',
		'a :matches(.foo, .bar) {}',
		String.raw`a :\69 s(.foo, .bar) {}`,
		'a > :is(.foo) {}',
		'a > :is(.foo, .bar), b {}',
		'a::before :is(.foo, .bar) {}',
		'.parent { &:is(:focus, :hover) {} }',
		'.parent { & :is(.foo, .bar) {} }',
		'.parent { :is(.foo, .bar):not(&) {} }',
		'.parent { :is(.foo, .bar) > & {} }',
		'.parent { :is(:is(:unknown(&), .foo), .bar) a {} }',
		'@namespace url("http://www.w3.org/1999/xhtml"); a :is(.foo, .bar) {}',
		String.raw`@NAMESP\41 CE svg url("http://www.w3.org/2000/svg"); :is(.foo, .bar) a {}`,
		'a { --selector: a :is(.foo, .bar); content: "a :is(.foo, .bar)"; background: url("is(.foo,.bar)"); }',
		'@scope (.parent) { a :is(.foo, .bar) { color: red; } }',
		'@scope (.scope) { :is(body, html) :scope a { color: red; } }',
		'@scope (.scope) { @media (width > 0px) { .parent { :is(.foo, .bar) a { color: red; } } } }',
		// The parser rejects some nested selectors, like `html :root:not(.dark, .light) & {}`
		'.card { color: red; } html :root:not(.dark, .light) .card { color: blue; }',

		'a :is(.foo:has(> b), .bar:has(> c)) { color: red; }',
		'a > :is(.foo .bar, .baz) {}',
		'a :is(.foo .bar, .baz .qux) {}',
		'.x :IS(SPAN:not(.a, .b), .c) { color: red; }',
		'.card { color: red; } body .theme .card { color: blue; }',
		'@media (x) { .a { color: red; } } .a .b { color: blue; }',
		'.x .item, .y .item { color: red; }',
		'.card { > .a .item, > .b .item { color: red; } }',
	],
	invalid: [
		'a :is(.foo, .bar) {}',
		':is(.foo, .bar) a[data-x] {}',
		':is(.foo, .bar)::before {}',
		':is(a, button).active {}',
		':is(.foo, #bar) a {}',
		':is(.foo, #bar).active {}',
		'a :IS(.foo, .bar) { COLOR: RED !important; }',
		String.raw`a :is(.f\6f o, .bar) { color: red; }`,
		String.raw`:IS(.f\6f o, .bar) .t\61 rget { color: red; }`,
		'a :is([data-x], [data-y]) { color: red; }',
		'a :is([data-x="&"], [data-y="&"]) { color: red; }',
		'a :is(:hover, :focus) { color: red; }',
		'a :is(.foo:not(.disabled), .bar:not(.hidden)) { color: red; }',
		'a :is(:nth-child(2n), :nth-last-child(2n)) { color: red; }',
		':is(.foo, .bar):hover > a { color: red; }',
		':is(.foo, .bar) a > b + c { color: red; }',
		'a > b :is(.foo, .bar) { color: red; }',
		'a :is(:where(#foo), *) { color: red; }',
		':is(.foo, .bar) :is(.baz, .qux) {}',
		'a :is(.foo, .bar) :is(.baz, .qux) {}',
		'.parent { :is(.foo, .bar) a { color: red; } }',
		'.parent { a :is(.foo, .bar) { color: red; } }',
		'a :is(.foo, .bar) { --value: var(--color); color: var(--value); & > b { color: blue; } }',
		...['media (width > 0px)', 'supports (display: grid)', 'container (width > 0px)', 'layer theme'].map(atRule => `@${atRule} { a :is(.foo, .bar) { color: red; } }`),
		'a :is(.foo, .bar) { color: red; /* keep */ }',
		'a /* keep */ :is(.foo, .bar) { color: red; }',
		':is(.foo, /* keep */ .bar) a { color: red; }',
		'a :is(.foo, .bar) /* keep */ { color: red; }',
		'a :is(.foo, .bar) {\n\tcolor: red;\n\tbackground: blue;\n}',
		':is(.foo, .bar).active {\n  color: red;\n}',
		'@media (width > 0px) {\r\n  a :is(.foo, .bar) {\r\n    color: red;\r\n  }\r\n}',
		':is(.foo, .bar) a {\n\tcolor: red;\n\n\t& > b {\n\t\tcolor: blue;\n\t}\n}',
		'a :is(.foo, .bar) {\ncolor: red;\n}',
		'a :is(.foo, .bar) {\n}',
		'a :is(.foo, .bar) {\n\tcontent: "a\\\n\tb";\n}',
		'a :is(.foo, .bar) {\n\t--value: a\n\t\tb;\n}',
		':is(.foo .bar, .baz) a {}',
		':is(.foo > .bar, .baz).active {}',
		':is(.foo .bar, .baz) > a {}',
		// A nested selector list gets an explicit `&` only when the parser would read it as a declaration
		'div :is(span, button) { color: red; }',
		'.x :is(span:is(.a, .b), button.c) { color: red; }',
		'.x :IS(SPAN:IS(.A, .B), BUTTON.C) { COLOR: RED; }',
		':is(.a, .b) span::before { color: red; }',
		'.parent { :is(span:is(.a, .b), button.c) .child { color: red; } }',
		'.parent { :is(span:not(.a, .b), button.c) .child { color: red; } }',
		'.parent { :is(span, .b) > .child { color: red; } }',
		'.parent { :is(span&, button&) .child { color: red; } }',
		'.parent { &:is(span, button) .child { color: red; } }',
		'.parent { > :is(span, button) .child { color: red; } }',
		'@media (width > 0px) { .parent { :is(span, .b) .child { color: red; } } }',
		':is(span:is(.a, .b), button.c) .child { color: red; }',
		'div :is(span, button) {\n  color: red;\n}',
		'.parent {\r\n\t:is(span, button) .child {\r\n\t\tcolor: red;\r\n\t}\r\n}',
		// The parser reads `+div` as a declaration hack, so it gets an explicit `&`
		':is(.a, .b)+div { color: red; }',
		':is(.a, .b)>div { color: red; }',
		':is(.a, .b)~DIV { color: red; }',
		':is(.a, .b)+.c { color: red; }',
		'.x :is(.a, .b)+div { color: red; }',
		'.parent { &:is(.a, .b)+div { color: red; } }',
		'.parent { :is(&.a, &.b)+div { color: red; } }',
		'.a { color: red; } @MEDIA (y) { .a .b { color: green; } }',
		'.a { color: red; } @media (y) { .a { color: blue; } } .a .b { color: green; }',
		'.a { color: red; } @layer x { .a .b { color: blue; } }',
		'.a {\r\n  color: red;\r\n}\r\n@media (x) {\r\n  .a .b {\r\n    color: blue;\r\n  }\r\n}',
		':is(.a,.b)+a{color:red}',
		':is(.a, .b)+-x-a { color: red; }',
		':is(.a, .b)+*|a { color: red; }',
		'.p { :is(html:not(.a) &, p &) .d { color: red; } }',
		// The parser rejects some nested selector lists, like `html:not(.a, .b) &, p & {}`, so these are reported without a fix
		'.p { :is(html:not(.a, .b) &, p &) .d { color: red; } }',
		'.p { :is(div:is(.a, .b) &, p &) > span { color: red; } }',
		'.p { :is(div:not(.a, .b) & .x, p & .y) .d { color: red; } }',
	],
});

test({
	valid: [
		'a > :is(.foo, .bar) { color: red; }',
		'a + :is(.foo, .bar) { color: red; }',
		'a ~ :is(.foo, .bar) { color: red; }',
		':is(.foo, :blank) ~ a { color: red; }',
		'a :is(.foo, #bar) { color: red; }',
		'a :is(.foo, button) { color: red; }',
		'a :is(.foo, .bar.active) { color: red; }',
		'a :is(.foo, :where(#bar)) { color: red; }',
		':is(.foo, #123) a { color: red; }',
		'a :is(#123, #foo) { color: red; }',
		':is(.foo, #-1).active { color: red; }',
		'a :is(.foo, [x="a" s]) { color: red; }',
		'a :is(foo|b, c) { color: red; }',
	],
	invalid: [
		...['>', '+', '~'].map(combinator => ({
			code: `:is(.foo, .bar) ${combinator} a { color: red; }`,
			output: `.foo, .bar { ${combinator} a { color: red; } }`,
			errors: [{messageId: 'prefer-nesting'}],
		})),
		{
			code: ':is(.foo, #bar) + a { color: red; }',
			output: '.foo, #bar { + a { color: red; } }',
			errors: 1,
		},
		{
			code: String.raw`:IS(.f\6f o, .bar)>a[data-x] { color: red; }`,
			output: String.raw`.f\6f o, .bar { >a[data-x] { color: red; } }`,
			errors: 1,
		},
		{
			code: ':is(.foo, .bar) > a {\r\n  color: red;\r\n}',
			output: '.foo, .bar {\r\n  > a {\r\n    color: red;\r\n  }\r\n}',
			errors: 1,
		},
		{
			code: ':is(.foo, .bar) /* keep */ > a { color: red; }',
			errors: 1,
		},
		{
			code: 'a :is(.foo, .bar) { color: red; }',
			output: 'a { .foo, .bar { color: red; } }',
			errors: [{messageId: 'prefer-nesting'}],
		},
		{
			code: String.raw`a :is(.foo, .bar\61) { color: red; }`,
			output: String.raw`a { .foo, .bar\61 { color: red; } }`,
			errors: [{messageId: 'prefer-nesting'}],
		},
		{
			code: ':is(.foo, #bar)::before { content: ""; }',
			output: '.foo, #bar { &::before { content: ""; } }',
			errors: 1,
		},
		{
			code: String.raw`:is(.foo, #\31 23) a { color: red; }`,
			output: String.raw`.foo, #\31 23 { a { color: red; } }`,
			errors: 1,
		},
		{
			code: 'a :is(.foo, .bar) {\n  color: red;\n}',
			output: 'a {\n  .foo, .bar {\n    color: red;\n  }\n}',
			errors: 1,
		},
		{
			code: 'a :is(.foo, .bar) {\n\tcolor: red;\n}',
			output: 'a {\n\t.foo, .bar {\n\t\tcolor: red;\n\t}\n}',
			errors: 1,
		},
		{
			code: '@media (width > 0px) {\r\n  a :is(.foo, .bar) {\r\n    color: red;\r\n  }\r\n}',
			output: '@media (width > 0px) {\r\n  a {\r\n    .foo, .bar {\r\n      color: red;\r\n    }\r\n  }\r\n}',
			errors: 1,
		},
		{
			code: 'a :is(.foo, .bar) { color: red; /* keep */ }',
			errors: 1,
		},
		{
			code: 'a :is(.foo, .bar) {\n\tanimation-name: \\61\nbc;\n}',
			errors: 1,
		},
	],
});

nodeTest('nesting fixes settle across overlapping and repeated candidates', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.recommended,
		rules: {'cssicorn/prefer-nesting': 'error'},
	};
	const cases = [
		{
			code: ':is(.foo, .bar) > a :is(.baz, #qux) { color: red; }',
			output: '.foo, .bar { > a :is(.baz, #qux) { color: red; } }',
		},
		{
			code: 'a :is(.foo, .bar) { color: red; :is(.baz, .qux).active { color: blue; } background: white; }',
			output: 'a { .foo, .bar { color: red; .baz, .qux { &.active { color: blue; } } background: white; } }',
		},
		{
			code: 'a :is(.foo, .bar) :is(.baz, .qux) { color: red; } b :is(.x, .y) { color: blue; }',
			output: 'a { .foo, .bar { .baz, .qux { color: red; } } } b { .x, .y { color: blue; } }',
		},
		{
			code: 'a :is(.foo, .bar).active { color: red; }',
			output: 'a { .foo, .bar { &.active { color: red; } } }',
		},
		{
			code: 'a :is(.foo, .bar) b :where(.baz, #qux).active { color: red; }',
			output: 'a { .foo, .bar { b :where(.baz, #qux).active { color: red; } } }',
		},
		{
			code: ':where(.foo, #bar) a :is(.baz, .qux).active { color: red; }',
			output: ':where(.foo, #bar) a { .baz, .qux { &.active { color: red; } } }',
		},
	];

	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.fixed, true);
		assert.equal(result.output, output);
		assert.deepEqual(result.messages, []);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {
			fixed: false,
			messages: [],
			output,
		});
	}
});

nodeTest('related rule fixes settle with selector groups and long adjacent runs', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.recommended,
		rules: {'cssicorn/prefer-nesting': 'error', 'cssicorn/no-useless-is': 'error'},
	};
	assert.equal(linter.verify('.a .x {} .a .y {} .b {} .b .z {}', config, {filename: 'test.css'}).length, 1);
	const cases = [
		{
			code: '.card { color: red; } .card .title { color: blue; } .card .title > a { color: green; }',
			output: '.card { color: red; .title { color: blue; > a { color: green; } } }',
		},
		{
			code: '.card { color: red; } .card :is(.foo, :is(.bar)) { color: blue; }',
			output: '.card { color: red; :is(.foo, .bar) { color: blue; } }',
		},
		{
			code: `.card {} ${Array.from({length: 20}, (_, index) => `.card .child-${index} { color: red; }`).join(' ')}`,
			output: `.card { ${Array.from({length: 20}, (_, index) => `.child-${index} { color: red; }`).join(' ')} }`,
		},
		{
			code: '.a .x {} .a .y {} .b {} .b .z {}',
			output: '.a .x {} .a .y {} .b { .z {} }',
		},
		{
			code: '.card:is(.foo, #bar) {} .card:is(.foo, #bar) .title {}',
			output: '.card:is(.foo, #bar) { .title {} }',
		},
		{
			code: '.card {} @media (color) { .card .title, .card .body {} .card.active {} }',
			output: '.card { @media (color) { .title, .body {} &.active {} } }',
		},
		{
			code: '.card { background: white; } @layer { .card { color: blue; } } @layer { .card { color: red; } }',
			output: '.card { background: white; @layer { color: blue; } @layer { color: red; } }',
		},
	];
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.fixed, true);
		assert.equal(result.output, output);
		assert.deepEqual(result.messages, []);
		assert.equal(linter.verifyAndFix(output, config, {filename: 'test.css'}).fixed, false);
	}

	// Moving `@layer b` before `@layer a { .other }` would change the layer order, so unrelated rules stop merging.
	const interruptedLayers = '.card { background: white; } @layer a { .other { color: green; } } @layer b { .card { color: blue; } } @layer a { .card { color: red; } }';
	assert.deepEqual(linter.verifyAndFix(interruptedLayers, config, {filename: 'test.css'}), {fixed: false, output: interruptedLayers, messages: []});
});

nodeTest('nesting fixes work with the other nesting rules', () => {
	const linter = new Linter();
	const config = {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {css, cssicorn: plugin},
		rules: {
			'cssicorn/prefer-nesting': 'error',
			'cssicorn/no-redundant-nested-style-rules': 'error',
			'cssicorn/no-declarations-after-nested-rules': 'error',
			'cssicorn/no-unscoped-nesting-selector': 'error',
			'cssicorn/no-nesting-with-mixed-specificity': 'error',
		},
	};
	const relatedRules = linter.verifyAndFix('.card { color: red; } .card .title { color: blue; }', config, {filename: 'test.css'});
	assert.equal(relatedRules.output, '.card { color: red; .title { color: blue; } }');
	assert.deepEqual(relatedRules.messages, []);
	assert.equal(linter.verifyAndFix(relatedRules.output, config, {filename: 'test.css'}).fixed, false);

	for (const code of [
		'.page .card { color: red; } .page .card .title { color: blue; }',
		'.card:first-child { color: red; } .card:first-child + .hint { color: blue; }',
		'.card { color: red; } @container (width > 0px) { .card { color: blue; } }',
		'.card:not(.disabled) { color: red; } .card:not(.disabled) .title { color: blue; }',
		'.card { color: red; } @layer theme { .card { color: blue; } }',
		'.card:lang(en) { color: red; } .card:lang(en) .title { color: blue; }',
		'.card:open { color: red; } .card:open .title { color: blue; }',
		'.card { color: red; } .card .title, .card > #body { color: blue; }',
		'.card:hover { color: red; } .card:hover .title { color: blue; }',
		'[data-kind="CARD" i] { color: red; } [data-kind="CARD" i] .title { color: blue; }',
		'form:invalid { color: red; } @media (width > 0px) { form:invalid { color: blue; } }',
		'.card { color: red; } @media (width > 0px) { .card { color: blue; } }',
		'.card { color: red; } @supports (display: grid) { .card { color: blue; } }',
		'.card { color: red; } @media (color) { .card .title { color: blue; } }',
		'.card { color: red; } @layer theme { .card:hover { color: blue; } }',
		'.card { opacity: 1; } @starting-style { .card { opacity: 0; } }',
		'.card { color: red; } @media (color) { .card .title, .card .body { color: blue; } .card.active { color: green; } }',
		'.card { color: red; } @layer theme { .card .title, .card .body { color: blue !important; } .card.active { color: green; } }',
	]) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.fixed, true);
		assert.deepEqual(result.messages, []);
		assert.equal(linter.verifyAndFix(result.output, config, {filename: 'test.css'}).fixed, false);
	}

	for (const code of ['a :is(.foo > .bar, #baz) { color: red; }', '.card:is(.foo, #bar) { color: red; }']) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.fixed, false);
		assert.equal(result.output, code);
		assert.deepEqual(result.messages.map(message => message.messageId), ['mixed-specificity-arguments']);
		assert.equal(linter.verifyAndFix(result.output, config, {filename: 'test.css'}).fixed, false);
	}

	const equalSpecificity = linter.verifyAndFix(':is(a, button).active { color: red; }', config, {filename: 'test.css'});
	assert.equal(equalSpecificity.output, 'a, button { &.active { color: red; } }');
	assert.deepEqual(equalSpecificity.messages, []);
	assert.equal(linter.verifyAndFix(equalSpecificity.output, config, {filename: 'test.css'}).fixed, false);

	const trailingMixedSpecificity = linter.verifyAndFix('a :is(.foo, #bar) { color: red; }', config, {filename: 'test.css'});
	assert.equal(trailingMixedSpecificity.fixed, false);
	assert.equal(trailingMixedSpecificity.output, 'a :is(.foo, #bar) { color: red; }');
	assert.deepEqual(trailingMixedSpecificity.messages.map(message => message.messageId), ['mixed-specificity-arguments']);
	assert.equal(linter.verifyAndFix(trailingMixedSpecificity.output, config, {filename: 'test.css'}).fixed, false);

	const trailingCombinator = linter.verifyAndFix('a > :is(.foo, #bar) { color: red; }', config, {filename: 'test.css'});
	assert.equal(trailingCombinator.fixed, false);
	assert.equal(trailingCombinator.output, 'a > :is(.foo, #bar) { color: red; }');
	assert.deepEqual(trailingCombinator.messages.map(message => message.messageId), ['mixed-specificity-arguments']);
	assert.equal(linter.verifyAndFix(trailingCombinator.output, config, {filename: 'test.css'}).fixed, false);

	const mixedSpecificity = linter.verifyAndFix(':is(.foo, #bar) a { color: red; }', config, {filename: 'test.css'});
	assert.equal(mixedSpecificity.output, '.foo, #bar { a { color: red; } }');
	assert.deepEqual(mixedSpecificity.messages.map(message => message.ruleId), ['cssicorn/no-nesting-with-mixed-specificity']);
});

test({
	valid: [
		String.raw`.card:\4e OT(.disabled) {} .card:\4e OT(.disabled) .title {}`,
		'.card:not(:unknown) {} .card:not(:unknown) .title {}',
		'.card:has(:has(.title)) {} .card:has(:has(.title)) .title {}',
		'.card {} @layer theme;',
		'.card {} @layer theme { .other {} }',
		'.card {} @layer theme { .card {} .other {} }',
		'.card {} @layer theme { .card, .other {} }',
		'@scope (.outer) { .card {} @layer theme { .card {} } }',
		'@namespace url("http://www.w3.org/1999/xhtml"); .card {} @layer theme { .card {} }',
		String.raw`a :w\68 ere(.foo, .bar) {}`,
		'a :where(.foo) {}',
		':where(.foo, .bar) {}',
		'.outer { a :where(&, .bar) {} }',
		'@scope (.outer) { a :where(.foo, .bar) {} }',

		// Leave separate conditional parents untouched, preserving the layer order.
		'@layer x { .card .title { color: green; } } @layer y { .card { color: red; } }',
		'a :where(.foo, .bar) {}',
		'a :WHERE(.foo, #bar) {\r\n  color: red !important;\r\n  & .title { color: blue; }\r\n}',
	],
	invalid: [
		...[
			'not(.disabled)',
			'not([data-value="&"])',
			'has(> .title)',
			'is(.foo, #bar)',
			'where(.foo, #bar)',
			'nth-child(2n)',
			'nth-last-child(2n of .foo, #bar)',
			'nth-of-type(2n)',
			'nth-last-of-type(odd)',
		].map(pseudoClass => ({
			code: `.card:${pseudoClass} { color: red; } .card:${pseudoClass} .title { color: blue; }`,
			output: `.card:${pseudoClass} { color: red; .title { color: blue; } }`,
			errors: 1,
		})),
		{
			code: '.card:not(.disabled) {} .card:not(.disabled) .title {}',
			output: '.card:not(.disabled) { .title {} }',
			errors: 1,
		},
		{
			code: '.card:NOT(.disabled) { color: red; } .card:NOT(.disabled):hover { color: blue; }',
			output: '.card:NOT(.disabled) { color: red; &:hover { color: blue; } }',
			errors: 1,
		},
		{
			code: '.outer, #outer { .card:has(.title) { color: red; } @media (color) { .card:has(.title) { color: blue; } } }',
			output: '.outer, #outer { .card:has(.title) { color: red; @media (color) { color: blue; } } }',
			errors: 1,
		},
		...['layer theme', 'layer theme.buttons', 'layer', 'LAYER theme', String.raw`l\61 yer theme`].map(atRule => ({
			code: `.card { color: red; } @${atRule} { .card { color: blue !important; & .title { color: green; } } }`,
			output: `.card { color: red; @${atRule} { color: blue !important; & .title { color: green; } } }`,
			errors: 1,
		})),
		{
			code: '.card {} @layer theme { .card {} }',
			output: '.card { @layer theme {} }',
			errors: 1,
		},
		{
			code: '@layer base { .card:not(.disabled) { color: red; } @layer theme { .card:not(.disabled) { color: blue; } } }',
			output: '@layer base { .card:not(.disabled) { color: red; @layer theme { color: blue; } } }',
			errors: 1,
		},
		{
			code: '.card {\r\n  color: red;\r\n}\r\n@layer theme {\r\n  .card {\r\n    color: blue;\r\n  }\r\n}',
			output: '.card {\r\n  color: red;\r\n  @layer theme {\r\n    color: blue;\r\n  }\r\n}',
			errors: 1,
		},
		{
			code: '.card {\n\tcolor: red;\n}\n@layer {\n\t.card {\n\t\tcolor: blue;\n\t}\n}',
			output: '.card {\n\tcolor: red;\n\t@layer {\n\t\tcolor: blue;\n\t}\n}',
			errors: 1,
		},
		{
			code: '.card {} @layer theme { .card { color: blue; /* keep */ } }',
			errors: 1,
		},
		{
			code: '.card:not(/* keep */ .disabled) {} .card:not(/* keep */ .disabled) .title {}',
			errors: 1,
		},
	],
});

test({
	valid: [
		'a :is(.foo).active {}',
		'a :where(.foo).active {}',
		'a::before :is(.foo, .bar).active {}',
		'@scope (.outer) { a :is(.foo, .bar).active {} }',
		'@namespace url("http://www.w3.org/1999/xhtml"); a :where(.foo, .bar) b {}',
		String.raw`.card:\6c ang(en) {} .card:\6c ang(en) .title {}`,
		'.card:visited {} .card:visited .title {}',

		'.outer { a :where(&, .bar).active {} }',
		'a :is(.foo > .bar, .baz).active {}',
	],
	invalid: [
		...['.active', '::before', ' b', ' > b', ' + b', ' ~ b'].map(suffix => ({
			code: `a :is(.foo, #bar)${suffix} { color: red; }`,
			output: `a { :is(.foo, #bar)${suffix} { color: red; } }`,
			errors: 1,
		})),
		...['>', '+', '~'].map(combinator => ({
			code: `a ${combinator} :is(.foo, .bar).active { color: red; }`,
			output: `a { ${combinator} :is(.foo, .bar).active { color: red; } }`,
			errors: 1,
		})),
		{
			code: 'a :is(.foo, .bar) b :where(.baz, #qux).active { color: red; }',
			output: 'a { :is(.foo, .bar) b :where(.baz, #qux).active { color: red; } }',
			errors: [{message: 'Prefer CSS nesting over `:is()`.'}],
		},
		{
			code: 'a :is(.foo, .bar).active {}',
			output: 'a { :is(.foo, .bar).active {} }',
			errors: 1,
		},
		{
			code: 'a :is(.foo, .bar) b {}',
			output: 'a { :is(.foo, .bar) b {} }',
			errors: 1,
		},
		...[
			'lang(en)',
			'lang("en")',
			'lang(en, fr)',
			'dir(rtl)',
			'LANG(en)',
			'DIR(rtl)',
			'any-link',
			'open',
			'in-range',
			'out-of-range',
			'default',
			'user-valid',
			'user-invalid',
		].map(pseudoClass => ({
			code: `.card:${pseudoClass} { color: red; } .card:${pseudoClass} .title { color: blue; }`,
			output: `.card:${pseudoClass} { color: red; .title { color: blue; } }`,
			errors: 1,
		})),
		{
			code: '.card:lang(en) {} .card:lang(en) .title {}',
			output: '.card:lang(en) { .title {} }',
			errors: 1,
		},
		{
			code: String.raw`a :IS(.f\6f o, #bar)[data-value="&"] { color: red; }`,
			output: String.raw`a { :IS(.f\6f o, #bar)[data-value="&"] { color: red; } }`,
			errors: 1,
		},
		{
			code: '.card:dir(rtl) { color: red; } @layer theme { .card:dir(rtl) { color: blue; } }',
			output: '.card:dir(rtl) { color: red; @layer theme { color: blue; } }',
			errors: 1,
		},
		{
			code: '.card:lang(en) {\n\tcolor: red;\n}\n.card:lang(en) .title {\n\tcolor: blue;\n}',
			output: '.card:lang(en) {\n\tcolor: red;\n\t.title {\n\t\tcolor: blue;\n\t}\n}',
			errors: 1,
		},
		{
			code: 'a :is(.foo, .bar).active {\n\t--value: \\61\nbc;\n}',
			errors: 1,
		},
		{
			code: 'a :is(.foo, #bar):hover { color: red; /* keep */ }',
			errors: 1,
		},
	],
});

nodeTest('supports overrides with nested rules remain parseable', () => {
	const linter = new Linter();
	const config = {...plugin.configs.recommended, rules: {'cssicorn/prefer-nesting': 'error'}};
	for (const code of [
		'.card { color: red; } @supports (display: grid) { .card { & .title { color: blue; } } }',
		'.card { color: red; } @supports (display: grid) { .card { opacity: 0; & .title { color: blue; } } }',
	]) {
		assert.deepEqual(linter.verify(code, config, {filename: 'test.css'}), []);
		assert.deepEqual(linter.verifyAndFix(code, config, {filename: 'test.css'}), {fixed: false, messages: [], output: code});
	}
});

test({
	valid: [
		'.cardinal .title {} .card .body {}',
		'.card .title {} .other {} .card .body {}',
		'.card .title {} .card {}',
		'.card:scope .title {} .card:scope .body {}',
		'.card .title:unknown {} .card .body {}',
		'.card .title {} .card .body:unknown {}',
		'.outer { .card .title {} .card:has(&) .body {} }',
		'@scope (.outer) { .card .title {} .card .body {} }',
		'@namespace url("http://www.w3.org/1999/xhtml"); .card .title {} .card .body {}',
		'.card {} @media (color) { .card .title {} .other {} }',
		'.card {} @layer theme { .card .title {} .other .body {} }',
		// Moving the later layer block before the other one would change the layer order.
		'.card { color: red; } @layer y { .other { color: blue; } } @layer x { .card .title { color: green; } }',
		'.card {} @supports (display: grid) { .card .title {} }',
		'.card {} @container (width > 0px) { .card .title {} }',
		'.card {} @starting-style { .other {} }',
		'.card {} @starting-style { .card {} .other {} }',
		'.card {} @starting-style { .card, .other {} }',
		'.card {} @starting-style { .card .title {} }',
		'.card {} @starting-style { .card { & .title {} } }',
		'.card {} @starting-style { .card { @media (color) { color: red; } } }',

		'.page .card {} .page .cardinal .title {}',
		'.page > .card {} .page + .card .title {}',
		'.card:lang(en) {} .card:lang(fr) .title {}',
		'.card .title { color: red; } .card .body { color: blue; }',
		'.card.title { color: red; } .card.body { color: blue; }',
		'.grid > .small { color: red; } .grid > .large { color: blue; }',
		'.card + .title { color: red; } .card ~ .body { color: blue; }',
		'.page .card .title { color: red; } .page .card .body { color: blue; }',
		'.card::before { color: red; } .card::after { color: blue; }',
		'.card:lang(en) .title { color: red; } .card:lang(en) .body { color: blue; }',
	],
	invalid: [
		{
			code: '.card {} @media (width > 0px) { .card .title {} }',
			output: '.card { @media (width > 0px) { .title {} } }',
			errors: 1,
		},
		...['media (color)', 'layer theme', 'layer', 'MEDIA (color)', String.raw`m\65 dia (color)`].map(atRule => ({
			code: `.card { color: red; } @${atRule} { .card .title, .card:hover { color: blue; } }`,
			output: `.card { color: red; @${atRule} { .title, &:hover { color: blue; } } }`,
			errors: 1,
		})),
		{
			code: '.card { color: red; } @media (color) { .card .title { color: blue; & .link { color: green; } } }',
			output: '.card { color: red; @media (color) { .title { color: blue; & .link { color: green; } } } }',
			errors: 1,
		},
		{
			code: '.card {\n\tcolor: red;\n}\n@media (color) {\n\t.card .title {\n\t\tcolor: blue;\n\t}\n}',
			output: '.card {\n\tcolor: red;\n\t@media (color) {\n\t\t.title {\n\t\t\tcolor: blue;\n\t\t}\n\t}\n}',
			errors: 1,
		},
		{
			code: '.card {\r\n  color: red;\r\n}\r\n@layer theme {\r\n  .card:hover {\r\n    color: blue !important;\r\n  }\r\n}',
			output: '.card {\r\n  color: red;\r\n  @layer theme {\r\n    &:hover {\r\n      color: blue !important;\r\n    }\r\n  }\r\n}',
			errors: 1,
		},
		...['starting-style', 'STARTING-STYLE', String.raw`starting-st\79 le`].map(atRule => ({
			code: `.card { opacity: 1; } @${atRule} { .card { opacity: 0 !important; } }`,
			output: `.card { opacity: 1; @${atRule} { opacity: 0 !important; } }`,
			errors: 1,
		})),
		{
			code: '.card {} @starting-style { .card {} }',
			output: '.card { @starting-style {} }',
			errors: 1,
		},
		{
			code: '@media (color) { .card { opacity: 1; } @starting-style { .card { opacity: 0; } } }',
			output: '@media (color) { .card { opacity: 1; @starting-style { opacity: 0; } } }',
			errors: 1,
		},
		{
			code: '.card {\r\n  opacity: 1;\r\n}\r\n@starting-style {\r\n  .card {\r\n    opacity: 0;\r\n  }\r\n}',
			output: '.card {\r\n  opacity: 1;\r\n  @starting-style {\r\n    opacity: 0;\r\n  }\r\n}',
			errors: 1,
		},
		{
			code: '.card {} @media (color) { .card /* keep */ .title { color: blue; } }',
			errors: 1,
		},
		{
			code: '.card {} @starting-style { .card { opacity: 0; /* keep */ } }',
			errors: 1,
		},
	],
});

test({
	valid: [
		'.card .title, .other .body {}',
		'.card .title, .card .body:unknown {}',
		'.outer { & .title, & .body {} }',
		'@scope (.outer) { .card .title, .card .body {} }',
		'@namespace url("http://www.w3.org/1999/xhtml"); .card .title, .card .body {}',
		'.card:is(.foo) {}',
		'.outer { .card:is(.foo, &) {} }',
		'@scope (.outer) { .card:is(.foo, .bar) {} }',
		'.card {} .theme .other {}',
		'.card.active {} .theme .card {}',
		'.card {} .theme .card:unknown {}',
		'.card {} .theme .card, .other {}',
		'.card {} .other {} .theme .card {}',
		'.outer { .card {} .theme .card {} }',
		'.outer { @media (color) { .card {} .theme .card {} } }',
		'.outer { .card {} .theme & .card {} }',
		'@scope (.outer) { .card {} .theme .card {} }',
		'.card {} @media (color) { .card .title {} .other {} }',
		'.card {} @media (color) { .card .title {} .card {} }',
		'.card {} @media (color) { .card .title:unknown {} .card .body {} }',
		'.card {} @media (color) {}',
		'.card {} @media (color) { .card .title {} @font-face { font-family: example; src: url(example.woff2); } }',
		'.card {} @supports (display: grid) { .card .title {} .other {} }',
		'.card {} @container (width > 0px) { .card .title {} .other {} }',

		'.page .card {} .page .card .title, .page .other .body {}',
		'.outer { > .card .title, > .card .body {} }',
		'a:is(.foo, .bar) {}',
		'.card:lang("en") .title, .card:lang("en") .body {}',
		'.page .card:is(.foo > .bar, .baz) { color: red; }',
	],
	invalid: [
		{
			code: 'a:is(.foo, .bar)::before {}',
			output: 'a { &:is(.foo, .bar)::before {} }',
			errors: 1,
		},
		{
			code: '.card:is(.foo, .bar).active {}',
			output: '.card { &:is(.foo, .bar).active {} }',
			errors: 1,
		},
		...['is', 'IS'].flatMap(name => ['.active', '::before', ' > .title'].map(suffix => ({
			code: `.card:${name}(.foo, #bar)${suffix} { color: red; }`,
			output: `.card { &:${name}(.foo, #bar)${suffix} { color: red; } }`,
			errors: 1,
		}))),
		...['media (color)', 'layer theme', 'layer', 'MEDIA (color)', String.raw`l\61 yer theme`].map(atRule => ({
			code: `.card { color: red; } @${atRule} { .card .title, .card .body { color: blue; } .card:where(.active) { color: green; } }`,
			output: `.card { color: red; @${atRule} { .title, .body { color: blue; } &:where(.active) { color: green; } } }`,
			errors: 1,
		})),
		{
			code: '.card {\n\tcolor: red;\n}\n@media (color) {\n\t.card .title {\n\t\tcolor: blue;\n\t}\n\t.card:where(.active) {\n\t\tcolor: green;\n\t}\n}',
			output: '.card {\n\tcolor: red;\n\t@media (color) {\n\t\t.title {\n\t\t\tcolor: blue;\n\t\t}\n\t\t&:where(.active) {\n\t\t\tcolor: green;\n\t\t}\n\t}\n}',
			errors: 1,
		},
		{
			code: '.card { color: red; } @media (color) { .card .title { /* keep */ } .card.active {} }',
			errors: 1,
		},
	],
});
