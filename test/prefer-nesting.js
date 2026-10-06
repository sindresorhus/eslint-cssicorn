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
		'.outer { > .card {} > .card .title {} }',
		'.outer { .page & .card {} .page & .card .title {} }',
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
		'a :is(.foo > :unknown, .baz) {}',
	],
	invalid: [
		...['.page .card', '.page > .card', '.page + .card', '.page ~ .card'].map(parent => ({
			code: `${parent} { color: red; } ${parent} .title, ${parent}:hover { color: blue; }`,
			output: `${parent} { color: red; & .title, &:hover { color: blue; } }`,
			errors: 1,
		})),
		{
			code: '.page .card {} .page .card .title {}',
			output: '.page .card { & .title {} }',
			errors: 1,
		},
		{
			code: '.page  .card {} .page .card .title {}',
			output: '.page  .card { & .title {} }',
			errors: 1,
		},
		{
			code: '.outer, #outer { .page > .card { color: red; } .page > .card .title { color: blue; } }',
			output: '.outer, #outer { .page > .card { color: red; & .title { color: blue; } } }',
			errors: 1,
		},
		{
			code: String.raw`.p\61 ge > .card { color: red; } .p\61 ge > .card::before { content: ""; }`,
			output: String.raw`.p\61 ge > .card { color: red; &::before { content: ""; } }`,
			errors: 1,
		},
		...['first-child', 'last-child', 'only-child', 'first-of-type', 'last-of-type', 'only-of-type', 'empty', 'root', 'target'].map(pseudoClass => ({
			code: `.card:${pseudoClass} { color: red; } .card:${pseudoClass} + .hint { color: blue; }`,
			output: `.card:${pseudoClass} { color: red; & + .hint { color: blue; } }`,
			errors: 1,
		})),
		{
			code: String.raw`.card:\46 IRST-CHILD { color: red; } .card:\46 IRST-CHILD .title { color: blue; }`,
			output: String.raw`.card:\46 IRST-CHILD { color: red; & .title { color: blue; } }`,
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
		...[
			'.card { color: red; } @container (width > 0px) { .card { color: blue; /* keep */ } }',
			'.page .card { color: red; } /* keep */ .page .card .title { color: blue; }',
			'a :is(.foo > .bar, /* keep */ .baz) { color: red; }',
		].map(code => ({code, errors: 1})),
		{
			code: 'a :is(.foo > .bar, #baz) { color: red; }',
			output: 'a { :is(.foo > .bar, #baz) { color: red; } }',
			errors: 1,
		},
		{
			code: ':is(.foo + .bar, .baz).active { color: red; & .title { color: blue; } }',
			output: ':is(.foo + .bar, .baz) { &.active { color: red; & .title { color: blue; } } }',
			errors: 1,
		},
		{
			code: '.outer, #outer { :is(.foo ~ .bar, .baz) a { color: red; } }',
			output: '.outer, #outer { :is(.foo ~ .bar, .baz) { & a { color: red; } } }',
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
			output: '.message { color: red; & a:not(.button) { color: blue; } }',
			errors: 1,
		},
		{
			code: 'BUTTON { COLOR: RED; } BUTTON:hover { COLOR: BLUE; }',
			output: 'BUTTON { COLOR: RED; &:hover { COLOR: BLUE; } }',
			errors: 1,
		},
		{
			code: ':is(.foo, .bar) a:not(.button) { color: blue; }',
			output: '.foo, .bar { & a:not(.button) { color: blue; } }',
			errors: 1,
		},
		{
			code: '.card { color: red; } .card .title { color: blue; }',
			output: '.card { color: red; & .title { color: blue; } }',
			errors: [{messageId: 'prefer-nesting/related-rules'}],
		},
		...['>', '+', '~'].map(combinator => ({
			code: `a { color: red; } a ${combinator} b { color: blue; }`,
			output: `a { color: red; & ${combinator} b { color: blue; } }`,
			errors: 1,
		})),
		...['.active', ':hover', '::before'].map(suffix => ({
			code: `.card { color: red; } .card${suffix} { color: blue; }`,
			output: `.card { color: red; &${suffix} { color: blue; } }`,
			errors: 1,
		})),
		{
			code: '[data-x].card { color: red; } [data-x].card .title { color: blue !important; }',
			output: '[data-x].card { color: red; & .title { color: blue !important; } }',
			errors: 1,
		},
		{
			code: String.raw`.f\6f o { color: red; } .f\6f o .b\61 r { color: blue; }`,
			output: String.raw`.f\6f o { color: red; & .b\61 r { color: blue; } }`,
			errors: 1,
		},
		{
			code: '.card { color: red; } .card .title { color: blue; & > b { color: green; } }',
			output: '.card { color: red; & .title { color: blue; & > b { color: green; } } }',
			errors: 1,
		},
		{
			code: '.card { & > a { color: red; } } .card .title { color: blue; }',
			output: '.card { & > a { color: red; } & .title { color: blue; } }',
			errors: 1,
		},
		{
			code: '.card {} .card .title { color: blue; } .card .body { color: green; }',
			output: '.card { & .title { color: blue; } & .body { color: green; } }',
			errors: 1,
		},
		{
			code: '.outer, #outer { .card { color: red; } .card .title { color: blue; } }',
			output: '.outer, #outer { .card { color: red; & .title { color: blue; } } }',
			errors: 1,
		},
		...['media (width > 0px)', 'supports (display: grid)', 'container (width > 0px)', 'layer theme'].map(atRule => ({
			code: `@${atRule} { .card { color: red; } .card .title { color: blue; } }`,
			output: `@${atRule} { .card { color: red; & .title { color: blue; } } }`,
			errors: 1,
		})),
		{
			code: '.card {\n\tcolor: red;\n}\n\n.card .title {\n\tcolor: blue;\n}',
			output: '.card {\n\tcolor: red;\n\t& .title {\n\t\tcolor: blue;\n\t}\n}',
			errors: 1,
		},
		{
			code: '.card {\r\n  color: red;\r\n}\r\n.card .title {\r\n  color: blue;\r\n}',
			output: '.card {\r\n  color: red;\r\n  & .title {\r\n    color: blue;\r\n  }\r\n}',
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
		'.card {} .card .title, .card {}',
		'.card.active {} .card.active .title, .card {}',
		'.card {} .card .title, .card:unknown {}',
		'.outer { .card {} .card .title, & .card .body {} }',
		'.card:scope {} .card:scope .title {}',
		':host {} :host .title {}',
		'.card:unknown {} .card:unknown .title {}',
		'.card {} @media (width > 0px) { .other {} }',
		'.card {} @media (width > 0px) { .card {} .other {} }',
		'.card {} @media (width > 0px) { .card, .other {} }',
		'.card {} @media (width > 0px) { @supports (display: grid) { .card {} } }',
		'.card {} @supports (display: grid) {}',
		'.card {} .other {} @media (width > 0px) { .card {} }',
		'@media (width > 0px) { .card {} } .card {}',
		'@scope (.outer) { .card {} @media (width > 0px) { .card {} } }',
		'.card::before {} @media (width > 0px) { .card::before {} }',
	],
	invalid: [
		{
			code: '.card { color: red; } .card .title, .card .body { color: blue; }',
			output: '.card { color: red; & .title, & .body { color: blue; } }',
			errors: [{messageId: 'prefer-nesting/related-rules'}],
		},
		{
			code: '.card {} .card .title, .card > #body, .card:hover { color: blue; }',
			output: '.card { & .title, & > #body, &:hover { color: blue; } }',
			errors: 1,
		},
		{
			code: '.card {\n\tcolor: red;\n}\n.card .title,\n.card .body {\n\tcolor: blue;\n}',
			output: '.card {\n\tcolor: red;\n\t& .title,\n\t& .body {\n\t\tcolor: blue;\n\t}\n}',
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
			output: `.card:${pseudoClass} { color: red; & .title { color: blue; } }`,
			errors: 1,
		})),
		{
			code: String.raw`.card:\48 OVER { color: red; } .card:\48 OVER .title { color: blue; }`,
			output: String.raw`.card:\48 OVER { color: red; & .title { color: blue; } }`,
			errors: 1,
		},
		{
			code: '.card:hover:focus {} .card:hover:focus .title, .card:hover:focus .body { color: blue; }',
			output: '.card:hover:focus { & .title, & .body { color: blue; } }',
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
			output: '.card { color: red; @media (width > 0px) { color: blue; } & .title { color: green; } @supports (display: grid) { display: grid; } }',
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
			output: `[data-kind="CARD" ${flag}] { color: red; & .title { color: blue; } }`,
			errors: 1,
		})),
		{
			code: String.raw`[data-kind="CARD" \69] { color: red; } [data-kind="CARD" \69] .title { color: blue; }`,
			output: String.raw`[data-kind="CARD" \69] { color: red; & .title { color: blue; } }`,
			errors: 1,
		},
		{
			code: String.raw`form:\49 NVALID { color: red; } form:\49 NVALID .message { color: blue; }`,
			output: String.raw`form:\49 NVALID { color: red; & .message { color: blue; } }`,
			errors: 1,
		},
		{
			code: 'input:REQUIRED { color: red; } input:REQUIRED + .hint { color: blue; }',
			output: 'input:REQUIRED { color: red; & + .hint { color: blue; } }',
			errors: 1,
		},
		{
			code: '[data-kind="CARD" i]:invalid { color: red; } [data-kind="CARD" i]:invalid .title, [data-kind="CARD" i]:invalid::before { color: blue; }',
			output: '[data-kind="CARD" i]:invalid { color: red; & .title, &::before { color: blue; } }',
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
			output: '.outer { [data-kind="CARD" i] { color: red; & .title { color: blue; } } }',
			errors: 1,
		},
		{
			code: '[data-kind="CARD" i] {\r\n  color: red;\r\n}\r\n[data-kind="CARD" i] .title {\r\n  color: blue;\r\n}',
			output: '[data-kind="CARD" i] {\r\n  color: red;\r\n  & .title {\r\n    color: blue;\r\n  }\r\n}',
			errors: 1,
		},
		{
			code: '[data-kind="CARD" i] { color: red; } [data-kind="CARD" i] .title { color: blue; /* keep */ }',
			errors: 1,
		},
		{
			code: ':is([data-kind="CARD" i], .card) .title { color: blue; }',
			output: ':is([data-kind="CARD" i], .card) { .title { color: blue; } }',
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
		'a :is(.foo, :unknown) {}',
		':is(.foo, :unknown) a {}',
		'a :is(.foo, ::before) {}',
		':is(.foo, :before).active {}',
		':is(.foo, :has(:has(.bar))) a {}',
		'a::before :is(.foo, .bar) {}',
		'.parent { &:is(:focus, :hover) svg {} }',
		'.parent { & :is(.foo, .bar) {} }',
		'.parent { :is(&.foo, &.bar) a {} }',
		'.parent { :is(.foo, .bar):not(&) {} }',
		'.parent { :is(.foo, .bar) > & {} }',
		'.parent { :is(.foo:has(&), .bar) a {} }',
		'.parent { :is(:is(:unknown(&), .foo), .bar) a {} }',
		'@namespace url("http://www.w3.org/1999/xhtml"); a :is(.foo, .bar) {}',
		String.raw`@NAMESP\41 CE svg url("http://www.w3.org/2000/svg"); :is(.foo, .bar) a {}`,
		'a { --selector: a :is(.foo, .bar); content: "a :is(.foo, .bar)"; background: url("is(.foo,.bar)"); }',
		'@scope (.parent) { a :is(.foo, .bar) { color: red; } }',
		'@scope (.scope) { :is(body, html) :scope a { color: red; } }',
		'@scope (.scope) { @media (width > 0px) { .parent { :is(.foo, .bar) a { color: red; } } } }',
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
		'a :is(.foo:has(> b), .bar:has(> c)) { color: red; }',
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
		'a > :is(.foo .bar, .baz) {}',
		'a :is(.foo .bar, .baz .qux) {}',
		':is(.foo .bar, .baz) a {}',
		':is(.foo > .bar, .baz).active {}',
		':is(.foo .bar, .baz) > a {}',
	],
});

test({
	valid: [],
	invalid: [
		...['>', '+', '~'].map(combinator => ({
			code: `a ${combinator} :is(.foo, .bar) { color: red; }`,
			output: `a { ${combinator} :is(.foo, .bar) { color: red; } }`,
			errors: [{messageId: 'prefer-nesting'}],
		})),
		{
			code: 'a ~ :is(.foo, #bar) { color: red; }',
			output: 'a { ~ :is(.foo, #bar) { color: red; } }',
			errors: 1,
		},
		{
			code: 'a + :is(.foo, :blank) { color: red; }',
			output: 'a { + :is(.foo, :blank) { color: red; } }',
			errors: 1,
		},
		{
			code: String.raw`.f\6f o>:IS(.bar, .b\61 z) { color: red; }`,
			output: String.raw`.f\6f o { >:IS(.bar, .b\61 z) { color: red; } }`,
			errors: 1,
		},
		{
			code: 'a > /* keep */ :is(.foo, .bar) { color: red; }',
			errors: 1,
		},
		{
			code: 'a > :is(.foo, .bar) {\r\n  color: red;\r\n}',
			output: 'a {\r\n  > :is(.foo, .bar) {\r\n    color: red;\r\n  }\r\n}',
			errors: 1,
		},
		{
			code: ':where(article, p) ~ :is(h1, h2) { color: red; }',
			output: ':where(article, p) { ~ :is(h1, h2) { color: red; } }',
			errors: 1,
		},
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
			code: ':is(.foo, :blank) ~ a { color: red; }',
			output: ':is(.foo, :blank) { ~ a { color: red; } }',
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
		...['.foo, #bar', '.foo, button', '.foo, .bar.active', '.foo, :where(#bar)'].map(argumentsText => ({
			code: `a :is(${argumentsText}) { color: red; }`,
			output: `a { :is(${argumentsText}) { color: red; } }`,
			errors: 1,
		})),
		{
			code: String.raw`a :IS(.f\6f o, #bar) { color: red; }`,
			output: String.raw`a { :IS(.f\6f o, #bar) { color: red; } }`,
			errors: 1,
		},
		{
			code: 'a :is(.foo, #bar) {\n\tcolor: red;\n}',
			output: 'a {\n\t:is(.foo, #bar) {\n\t\tcolor: red;\n\t}\n}',
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
			code: ':is(.foo, #123) a { color: red; }',
			output: ':is(.foo, #123) { & a { color: red; } }',
			errors: 1,
		},
		{
			code: 'a :is(#123, #foo) { color: red; }',
			output: 'a { :is(#123, #foo) { color: red; } }',
			errors: 1,
		},
		{
			code: ':is(.foo, #-1).active { color: red; }',
			output: ':is(.foo, #-1) { &.active { color: red; } }',
			errors: 1,
		},
		{
			code: String.raw`:is(.foo, #\31 23) a { color: red; }`,
			output: String.raw`.foo, #\31 23 { & a { color: red; } }`,
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
		{
			code: 'a :is(.foo, :blank) { color: red; }',
			output: 'a { :is(.foo, :blank) { color: red; } }',
			errors: 1,
		},
		{
			code: ':is(.foo, :blank) a { color: red; }',
			output: ':is(.foo, :blank) { & a { color: red; } }',
			errors: 1,
		},
		{
			code: 'a :is(.foo, [x="a" s]) { color: red; }',
			output: 'a { :is(.foo, [x="a" s]) { color: red; } }',
			errors: 1,
		},
		{
			code: ':is(.foo, [x="a" s]) a { color: red; }',
			output: ':is(.foo, [x="a" s]) { & a { color: red; } }',
			errors: 1,
		},
		{
			code: 'a :is(foo|b, c) { color: red; }',
			output: 'a { :is(foo|b, c) { color: red; } }',
			errors: 1,
		},
		{
			code: ':is(foo|b, c) a { color: red; }',
			output: ':is(foo|b, c) { & a { color: red; } }',
			errors: 1,
		},
		{
			code: 'a :is(.foo, [foo|x]) { color: red; }',
			output: 'a { :is(.foo, [foo|x]) { color: red; } }',
			errors: 1,
		},
		{
			code: ':IS(.foo, :blank)::before { content: ""; }',
			output: ':IS(.foo, :blank) { &::before { content: ""; } }',
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
			code: '.parent, #parent { > a + :is(.foo, #bar) { color: red; & > b { color: blue; } } }',
			output: '.parent, #parent { > a { + :is(.foo, #bar) { color: red; & > b { color: blue; } } } }',
		},
		{
			code: '.parent, #parent { a > :is(.foo, .bar) { color: red; & > b { color: blue; } } }',
			output: '.parent, #parent { a { > :is(.foo, .bar) { color: red; & > b { color: blue; } } } }',
		},
		{
			code: 'a > :is(.foo, .bar) { b + :is(.baz, #qux) { color: red; } }',
			output: 'a { > :is(.foo, .bar) { b { + :is(.baz, #qux) { color: red; } } } }',
		},
		{
			code: ':is(.foo, .bar) > a :is(.baz, #qux) { color: red; }',
			output: '.foo, .bar { > a { :is(.baz, #qux) { color: red; } } }',
		},
		{
			code: '.parent, #parent { a :is(.foo, #bar) { color: red; & > b { color: blue; } } }',
			output: '.parent, #parent { a { :is(.foo, #bar) { color: red; & > b { color: blue; } } } }',
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
			code: 'a :where(.foo, #bar) b { color: red; }',
			output: 'a { :where(.foo, #bar) { & b { color: red; } } }',
		},
		{
			code: 'a :is(.foo, .bar) b :where(.baz, #qux).active { color: red; }',
			output: 'a { .foo, .bar { & b { :where(.baz, #qux) { &.active { color: red; } } } } }',
		},
		{
			code: ':where(.foo, #bar) a :is(.baz, .qux).active { color: red; }',
			output: ':where(.foo, #bar) { & a :is(.baz, .qux).active { color: red; } }',
		},
		{
			code: ':is(.foo, :blank) a :is(.bar, :blank) { color: red; }',
			output: ':is(.foo, :blank) { & a :is(.bar, :blank) { color: red; } }',
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
	assert.equal(linter.verify('.a .x {} .a .y {} .b {} .b .z {}', config, {filename: 'test.css'}).length, 2);
	const cases = [
		{
			code: '.card { color: red; } .card .title { color: blue; } .card .title > a { color: green; }',
			output: '.card { color: red; & .title { color: blue; } & .title > a { color: green; } }',
		},
		{
			code: '.card { color: red; } .card :is(.foo, :is(.bar)) { color: blue; }',
			output: '.card { color: red; & :is(.foo, .bar) { color: blue; } }',
		},
		{
			code: `.card {} ${Array.from({length: 20}, (_, index) => `.card .child-${index} { color: red; }`).join(' ')}`,
			output: `.card { ${Array.from({length: 20}, (_, index) => `& .child-${index} { color: red; }`).join(' ')} }`,
		},
		{
			code: '.a .x {} .a .y {} .b {} .b .z {}',
			output: '.a { & .x {} & .y {} } .b { & .z {} }',
		},
		{
			code: '.card .title {} .card .body {} @media (color) { .card { color: blue; } }',
			output: '.card { & .title {} & .body {} @media (color) { color: blue; } }',
		},
		{
			code: '.card .title {} .card .body {} @layer theme { .card .footer { color: blue; } }',
			output: '.card { & .title {} & .body {} @layer theme { & .footer { color: blue; } } }',
		},
		{
			code: '.card .title, .card .body {} .card:hover {} .theme .card {}',
			output: '.card { & .title, & .body {} &:hover {} .theme & {} }',
		},
		{
			code: '.card:is(.foo, #bar) {} .card:is(.foo, #bar) .title {}',
			output: '.card { &:is(.foo, #bar) { & .title {} } }',
		},
		{
			code: '.card {} @media (color) { .card .title, .card .body {} .card.active {} }',
			output: '.card { @media (color) { & .title, & .body {} &.active {} } }',
		},
		{
			code: '.card .title, .card .body {} @layer theme { .card .footer, .card .aside {} .card.active {} }',
			output: '.card { & .title, & .body {} @layer theme { & .footer, & .aside {} &.active {} } }',
		},
	];
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.fixed, true);
		assert.equal(result.output, output);
		assert.deepEqual(result.messages, []);
		assert.equal(linter.verifyAndFix(output, config, {filename: 'test.css'}).fixed, false);
	}
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
	assert.equal(relatedRules.output, '.card { color: red; & .title { color: blue; } }');
	assert.deepEqual(relatedRules.messages, []);
	assert.equal(linter.verifyAndFix(relatedRules.output, config, {filename: 'test.css'}).fixed, false);

	for (const code of [
		'.page .card { color: red; } .page .card .title { color: blue; }',
		'.card:first-child { color: red; } .card:first-child + .hint { color: blue; }',
		'.card { color: red; } @container (width > 0px) { .card { color: blue; } }',
		'a :is(.foo > .bar, #baz) { color: red; }',
		'.card:not(.disabled) { color: red; } .card:not(.disabled) .title { color: blue; }',
		'.card { color: red; } @layer theme { .card { color: blue; } }',
		'a :where(.foo, #bar) { color: red; }',
		':where(.foo, #bar).active { color: red; }',
		'a :where(.foo, #bar).active { color: red; }',
		'.card:lang(en) { color: red; } .card:lang(en) .title { color: blue; }',
		'.card:open { color: red; } .card:open .title { color: blue; }',
		'.card { color: red; } .card .title, .card > #body { color: blue; }',
		'.card:hover { color: red; } .card:hover .title { color: blue; }',
		'[data-kind="CARD" i] { color: red; } [data-kind="CARD" i] .title { color: blue; }',
		'form:invalid { color: red; } @media (width > 0px) { form:invalid { color: blue; } }',
		'.card { color: red; } @media (width > 0px) { .card { color: blue; } }',
		'.card { color: red; } @supports (display: grid) { .card { color: blue; } }',
		'.card .title { color: red; } .card .body { color: blue; }',
		'.card { color: red; } @media (color) { .card .title { color: blue; } }',
		'.card { color: red; } @layer theme { .card:hover { color: blue; } }',
		'.card { opacity: 1; } @starting-style { .card { opacity: 0; } }',
		'.card .title, .card #body { color: red; }',
		'.card:is(.foo, #bar) { color: red; }',
		'.card:where(.foo, #bar)::before { content: ""; color: red; }',
		'.card { color: red; } .theme .card { color: blue; }',
		'.card { color: red; } @media (color) { .card .title, .card .body { color: blue; } .card.active { color: green; } }',
		'.card { color: red; } @layer theme { .card .title, .card .body { color: blue !important; } .card.active { color: green; } }',
	]) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.fixed, true);
		assert.deepEqual(result.messages, []);
		assert.equal(linter.verifyAndFix(result.output, config, {filename: 'test.css'}).fixed, false);
	}

	const equalSpecificity = linter.verifyAndFix(':is(a, button).active { color: red; }', config, {filename: 'test.css'});
	assert.equal(equalSpecificity.output, 'a, button { &.active { color: red; } }');
	assert.deepEqual(equalSpecificity.messages, []);
	assert.equal(linter.verifyAndFix(equalSpecificity.output, config, {filename: 'test.css'}).fixed, false);

	const trailingMixedSpecificity = linter.verifyAndFix('a :is(.foo, #bar) { color: red; }', config, {filename: 'test.css'});
	assert.equal(trailingMixedSpecificity.output, 'a { :is(.foo, #bar) { color: red; } }');
	assert.deepEqual(trailingMixedSpecificity.messages, []);
	assert.equal(linter.verifyAndFix(trailingMixedSpecificity.output, config, {filename: 'test.css'}).fixed, false);

	const trailingCombinator = linter.verifyAndFix('a > :is(.foo, #bar) { color: red; }', config, {filename: 'test.css'});
	assert.equal(trailingCombinator.output, 'a { > :is(.foo, #bar) { color: red; } }');
	assert.deepEqual(trailingCombinator.messages, []);
	assert.equal(linter.verifyAndFix(trailingCombinator.output, config, {filename: 'test.css'}).fixed, false);

	const mixedSpecificity = linter.verifyAndFix(':is(.foo, #bar) a { color: red; }', config, {filename: 'test.css'});
	assert.equal(mixedSpecificity.output, '.foo, #bar { & a { color: red; } }');
	assert.deepEqual(mixedSpecificity.messages.map(message => message.ruleId), ['cssicorn/no-nesting-with-mixed-specificity']);
});

test({
	valid: [
		String.raw`.card:\4e OT(.disabled) {} .card:\4e OT(.disabled) .title {}`,
		'.card:not(:unknown) {} .card:not(:unknown) .title {}',
		'.card:has(:has(.title)) {} .card:has(:has(.title)) .title {}',
		'.outer { .card:not(&) {} @media (color) { .card:not(&) {} } }',
		'.outer { .card:has(&) {} @layer theme { .card:has(&) {} } }',
		'.outer { .card:is(&, .foo) {} @media (color) { .card:is(&, .foo) {} } }',
		'.outer { .card:nth-child(2n of :is(&)) {} .card:nth-child(2n of :is(&)) .title {} }',
		'.card {} @layer theme;',
		'.card {} @layer theme { .other {} }',
		'.card {} @layer theme { .card {} .other {} }',
		'.card {} @layer theme { .card, .other {} }',
		'@scope (.outer) { .card {} @layer theme { .card {} } }',
		'@namespace url("http://www.w3.org/1999/xhtml"); .card {} @layer theme { .card {} }',
		String.raw`a :w\68 ere(.foo, .bar) {}`,
		'a :where(.foo) {}',
		':where(.foo, .bar) {}',
		'a :where(.foo, :unknown) {}',
		'.outer { a :where(&, .bar) {} }',
		'@scope (.outer) { a :where(.foo, .bar) {} }',
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
			output: `.card:${pseudoClass} { color: red; & .title { color: blue; } }`,
			errors: 1,
		})),
		{
			code: '.card:not(.disabled) {} .card:not(.disabled) .title {}',
			output: '.card:not(.disabled) { & .title {} }',
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
		...[
			'.card {} @layer theme { .card { color: blue; /* keep */ } }',
			'.card:not(/* keep */ .disabled) {} .card:not(/* keep */ .disabled) .title {}',
			'a :where(.foo, /* keep */ #bar) { color: red; }',
		].map(code => ({code, errors: 1})),
		{
			code: 'a :where(.foo, .bar) {}',
			output: 'a { :where(.foo, .bar) {} }',
			errors: [{message: 'Prefer CSS nesting over `:where()`.'}],
		},
		...['.foo, .bar', '.foo, #bar', '.foo > .bar, .baz', '.foo, :not(.disabled)', '.foo, [x="y" i]'].map(argumentsText => ({
			code: `a :where(${argumentsText}) { color: red; }`,
			output: `a { :where(${argumentsText}) { color: red; } }`,
			errors: 1,
		})),
		...[['.active', '&.active'], ['::before', '&::before'], [' a', '& a'], [' > a', '> a'], [' + a', '+ a'], [' ~ a', '~ a']].map(([suffix, inner]) => ({
			code: `:where(.foo, #bar)${suffix} { color: red; }`,
			output: `:where(.foo, #bar) { ${inner} { color: red; } }`,
			errors: 1,
		})),
		...['>', '+', '~'].map(combinator => ({
			code: `a ${combinator} :where(.foo, #bar) { color: red; }`,
			output: `a { ${combinator} :where(.foo, #bar) { color: red; } }`,
			errors: 1,
		})),
		{
			code: 'a :WHERE(.foo, #bar) {\r\n  color: red !important;\r\n  & .title { color: blue; }\r\n}',
			output: 'a {\r\n  :WHERE(.foo, #bar) {\r\n    color: red !important;\r\n    & .title { color: blue; }\r\n  }\r\n}',
			errors: 1,
		},
	],
});

test({
	valid: [
		'a :is(.foo).active {}',
		'a :where(.foo).active {}',
		'a :is(.foo, :unknown).active {}',
		'a :where(.foo, ::before) b {}',
		'a::before :is(.foo, .bar).active {}',
		'.outer { a :where(&, .bar).active {} }',
		'@scope (.outer) { a :is(.foo, .bar).active {} }',
		'@namespace url("http://www.w3.org/1999/xhtml"); a :where(.foo, .bar) b {}',
		String.raw`.card:\6c ang(en) {} .card:\6c ang(en) .title {}`,
		'.card:visited {} .card:visited .title {}',
		'.card:host {} .card:host .title {}',
	],
	invalid: [
		...['is', 'where'].flatMap(name => ['.active', '::before', ' b', ' > b', ' + b', ' ~ b'].map(suffix => ({
			code: `a :${name}(.foo, #bar)${suffix} { color: red; }`,
			output: `a { :${name}(.foo, #bar)${suffix} { color: red; } }`,
			errors: 1,
		}))),
		...['>', '+', '~'].map(combinator => ({
			code: `a ${combinator} :is(.foo, .bar).active { color: red; }`,
			output: `a { ${combinator} :is(.foo, .bar).active { color: red; } }`,
			errors: 1,
		})),
		{
			code: 'a :is(.foo, .bar) b :where(.baz, #qux).active { color: red; }',
			output: 'a :is(.foo, .bar) b { :where(.baz, #qux).active { color: red; } }',
			errors: [{message: 'Prefer CSS nesting over `:where()`.'}],
		},
		{
			code: 'a :is(.foo > .bar, .baz).active {}',
			output: 'a { :is(.foo > .bar, .baz).active {} }',
			errors: 1,
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
		{
			code: 'a :where(.foo, .bar).active {}',
			output: 'a { :where(.foo, .bar).active {} }',
			errors: 1,
		},
		{
			code: 'a :where(.foo, .bar) b {}',
			output: 'a { :where(.foo, .bar) b {} }',
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
			output: `.card:${pseudoClass} { color: red; & .title { color: blue; } }`,
			errors: 1,
		})),
		{
			code: '.card:lang(en) {} .card:lang(en) .title {}',
			output: '.card:lang(en) { & .title {} }',
			errors: 1,
		},
		{
			code: String.raw`a :IS(.f\6f o, #bar)[data-value="&"] { color: red; }`,
			output: String.raw`a { :IS(.f\6f o, #bar)[data-value="&"] { color: red; } }`,
			errors: 1,
		},
		{
			code: '.outer, #outer { a :where(.foo, #bar).active { color: red; & .title { color: blue; } } }',
			output: '.outer, #outer { a { :where(.foo, #bar).active { color: red; & .title { color: blue; } } } }',
			errors: 1,
		},
		{
			code: '.card:dir(rtl) { color: red; } @layer theme { .card:dir(rtl) { color: blue; } }',
			output: '.card:dir(rtl) { color: red; @layer theme { color: blue; } }',
			errors: 1,
		},
		{
			code: 'a :where(.foo, #bar).active {\r\n  color: red !important;\r\n}',
			output: 'a {\r\n  :where(.foo, #bar).active {\r\n    color: red !important;\r\n  }\r\n}',
			errors: 1,
		},
		{
			code: '.card:lang(en) {\n\tcolor: red;\n}\n.card:lang(en) .title {\n\tcolor: blue;\n}',
			output: '.card:lang(en) {\n\tcolor: red;\n\t& .title {\n\t\tcolor: blue;\n\t}\n}',
			errors: 1,
		},
		...[
			'a :where(.foo, #bar) /* keep */ .title { color: red; }',
			'a :is(.foo, .bar).active {\n\t--value: \\61\nbc;\n}',
			'a :is(.foo, #bar):hover { color: red; /* keep */ }',
		].map(code => ({code, errors: 1})),
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
		'.card .title, .other .title {} .card .body {}',
		'.card:scope .title {} .card:scope .body {}',
		'.outer { & .card .title {} & .card .body {} }',
		'.card .title:unknown {} .card .body {}',
		'.card .title {} .card .body:unknown {}',
		'.outer { .card .title {} .card:has(&) .body {} }',
		'@scope (.outer) { .card .title {} .card .body {} }',
		'@namespace url("http://www.w3.org/1999/xhtml"); .card .title {} .card .body {}',
		'.card {} @media (color) { .card .title {} .other {} }',
		'.card {} @layer theme { .card .title {} .other .body {} }',
		'.card {} @supports (display: grid) { .card .title {} }',
		'.card {} @container (width > 0px) { .card .title {} }',
		'.card {} @starting-style { .other {} }',
		'.card {} @starting-style { .card {} .other {} }',
		'.card {} @starting-style { .card, .other {} }',
		'.card {} @starting-style { .card .title {} }',
		'.card {} @starting-style { .card { & .title {} } }',
		'.card {} @starting-style { .card { @media (color) { color: red; } } }',
	],
	invalid: [
		{
			code: '.page .card {} .page .cardinal .title {}',
			output: '.page { & .card {} & .cardinal .title {} }',
			errors: 1,
		},
		{
			code: '.page > .card {} .page + .card .title {}',
			output: '.page { & > .card {} & + .card .title {} }',
			errors: 1,
		},
		{
			code: '.card {} @media (width > 0px) { .card .title {} }',
			output: '.card { @media (width > 0px) { & .title {} } }',
			errors: 1,
		},
		{
			code: '.card:lang(en) {} .card:lang(fr) .title {}',
			output: '.card { &:lang(en) {} &:lang(fr) .title {} }',
			errors: 1,
		},
		...[
			['.card .title', '.card .body', '.card', '& .title', '& .body'],
			['.card.title', '.card.body', '.card', '&.title', '&.body'],
			['.grid > .small', '.grid > .large', '.grid', '& > .small', '& > .large'],
			['.card + .title', '.card ~ .body', '.card', '& + .title', '& ~ .body'],
			['.page .card .title', '.page .card .body', '.page .card', '& .title', '& .body'],
			['.card::before', '.card::after', '.card', '&::before', '&::after'],
			['.card:lang(en) .title', '.card:lang(en) .body', '.card:lang(en)', '& .title', '& .body'],
		].map(([first, second, parent, firstInner, secondInner]) => ({
			code: `${first} { color: red; } ${second} { color: blue; }`,
			output: `${parent} { ${firstInner} { color: red; } ${secondInner} { color: blue; } }`,
			errors: 1,
		})),
		{
			code: '.card .title { color: red } .card .body { color: blue }',
			output: '.card { & .title { color: red } & .body { color: blue } }',
			errors: 1,
		},
		{
			code: '.card .title {} .card .body {} .card:hover {}',
			output: '.card { & .title {} & .body {} &:hover {} }',
			errors: 1,
		},
		{
			code: '.card .title {} .card .body {} .card .footer, .card .aside { color: blue; }',
			output: '.card { & .title {} & .body {} & .footer, & .aside { color: blue; } }',
			errors: 1,
		},
		{
			code: '.outer, #outer { .card .title { color: red; } .card .body { color: blue; } }',
			output: '.outer, #outer { .card { & .title { color: red; } & .body { color: blue; } } }',
			errors: 1,
		},
		{
			code: String.raw`.c\61 rd .title { color: red; } .c\61 rd .body { color: blue; }`,
			output: String.raw`.c\61 rd { & .title { color: red; } & .body { color: blue; } }`,
			errors: 1,
		},
		{
			code: '.card .title {\n\tcolor: red;\n}\n.card .body {\n\tcolor: blue;\n}',
			output: '.card {\n\t& .title {\n\t\tcolor: red;\n\t}\n\t& .body {\n\t\tcolor: blue;\n\t}\n}',
			errors: 1,
		},
		{
			code: '.card .title {\r\n  color: red;\r\n}\r\n.card .body {\r\n  color: blue;\r\n}',
			output: '.card {\r\n  & .title {\r\n    color: red;\r\n  }\r\n  & .body {\r\n    color: blue;\r\n  }\r\n}',
			errors: 1,
		},
		...['media (color)', 'layer theme', 'layer', 'MEDIA (color)', String.raw`m\65 dia (color)`].map(atRule => ({
			code: `.card { color: red; } @${atRule} { .card .title, .card:hover { color: blue; } }`,
			output: `.card { color: red; @${atRule} { & .title, &:hover { color: blue; } } }`,
			errors: 1,
		})),
		{
			code: '.card { color: red; } @media (color) { .card .title { color: blue; & .link { color: green; } } }',
			output: '.card { color: red; @media (color) { & .title { color: blue; & .link { color: green; } } } }',
			errors: 1,
		},
		{
			code: '.card {\n\tcolor: red;\n}\n@media (color) {\n\t.card .title {\n\t\tcolor: blue;\n\t}\n}',
			output: '.card {\n\tcolor: red;\n\t@media (color) {\n\t\t& .title {\n\t\t\tcolor: blue;\n\t\t}\n\t}\n}',
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
		...[
			'.card .title { color: red; /* keep */ } .card .body { color: blue; }',
			'.card .title { color: red; } /* keep */ .card .body { color: blue; }',
			'.card .title { color: red; } .card .body {\n\tcolor: blue;\n}',
			'.card {} @media (color) { .card /* keep */ .title { color: blue; } }',
			'.card {} @starting-style { .card { opacity: 0; /* keep */ } }',
		].map(code => ({code, errors: 1})),
	],
});

test({
	valid: [
		'.card, .card.active {}',
		'.card .title, .other .body {}',
		'.card .title, .card .body:unknown {}',
		'.outer { & .title, & .body {} }',
		'.outer { > .card .title, > .card .body {} }',
		'@scope (.outer) { .card .title, .card .body {} }',
		'@namespace url("http://www.w3.org/1999/xhtml"); .card .title, .card .body {}',
		'.card:is(.foo) {}',
		'.card:is(.foo, :unknown) {}',
		'.card:where(.foo, ::before) {}',
		'.outer { .card:is(.foo, &) {} }',
		'@scope (.outer) { .card:is(.foo, .bar) {} }',
		'.card {} .theme .other {}',
		'.card.active {} .theme .card {}',
		'.card {} .theme .card.active {}',
		'.card {} .theme .card:unknown {}',
		'.page .card {} .theme .page .card {}',
		'.card {} .theme.card {}',
		'.card {} .theme .card, .other {}',
		'.card {} .other {} .theme .card {}',
		'.outer { .card {} .theme .card {} }',
		'.outer { @media (color) { .card {} .theme .card {} } }',
		'.outer { .card {} .theme & .card {} }',
		'.card {} @media (color) { .theme .card {} }',
		'@scope (.outer) { .card {} .theme .card {} }',
		'.card {} @media (color) { .card .title {} .other {} }',
		'.card {} @media (color) { .card .title {} .card {} }',
		'.card {} @media (color) { .card .title:unknown {} .card .body {} }',
		'.card {} @media (color) {}',
		'.card {} @media (color) { .card .title {} @font-face { font-family: example; src: url(example.woff2); } }',
		'.card {} @layer theme { .card .title {} @media (color) { .card .body {} } }',
		'.card {} @supports (display: grid) { .card .title {} .other {} }',
		'.card {} @container (width > 0px) { .card .title {} .other {} }',
	],
	invalid: [
		{
			code: '.page .card {} .page .card .title, .page .other .body {}',
			output: '.page .card {} .page { & .card .title, & .other .body {} }',
			errors: 1,
		},
		{
			code: 'a:is(.foo, .bar) {}',
			output: 'a { &:is(.foo, .bar) {} }',
			errors: 1,
		},
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
		{
			code: '.card:lang("en") .title, .card:lang("en") .body {}',
			output: '.card:lang("en") { & .title, & .body {} }',
			errors: 1,
		},
		...[
			['.card .title, .card .body', '.card', '& .title, & .body'],
			['.card:hover, .card.active, .card[aria-disabled=true]', '.card', '&:hover, &.active, &[aria-disabled=true]'],
			['input[type=checkbox], input[type=radio]', 'input', '&[type=checkbox], &[type=radio]'],
			['.page .card > .title, .page .card + #body', '.page .card', '& > .title, & + #body'],
			['.card::before, .card::after', '.card', '&::before, &::after'],
			['[data-kind="CARD" i] .title, [data-kind="CARD" i] #body', '[data-kind="CARD" i]', '& .title, & #body'],
			['.card:not(.disabled) .title, .card:not(.disabled) .body', '.card:not(.disabled)', '& .title, & .body'],
			[String.raw`.c\61 rd .title, .c\61 rd .body`, String.raw`.c\61 rd`, '& .title, & .body'],
		].map(([selector, parent, inner]) => ({
			code: `${selector} { color: red !important; & .link { color: blue; } }`,
			output: `${parent} { ${inner} { color: red !important; & .link { color: blue; } } }`,
			errors: 1,
		})),
		{
			code: '.outer, #outer { .card .title, .card #body { color: red; } }',
			output: '.outer, #outer { .card { & .title, & #body { color: red; } } }',
			errors: 1,
		},
		{
			code: '.card .title,\r\n.card .body {\r\n  color: red;\r\n}',
			output: '.card {\r\n  & .title,\r\n  & .body {\r\n    color: red;\r\n  }\r\n}',
			errors: 1,
		},
		...['media (color)', 'supports (display: grid)', 'container (width > 0px)', 'layer theme'].map(atRule => ({
			code: `@${atRule} { .card .title, .card .body { color: red; } }`,
			output: `@${atRule} { .card { & .title, & .body { color: red; } } }`,
			errors: 1,
		})),
		...['is', 'where', 'IS', 'WHERE'].flatMap(name => ['', '.active', '::before', ' > .title'].map(suffix => ({
			code: `.card:${name}(.foo, #bar)${suffix} { color: red; }`,
			output: `.card { &:${name}(.foo, #bar)${suffix} { color: red; } }`,
			errors: 1,
		}))),
		{
			code: '.page .card:is(.foo > .bar, .baz) { color: red; }',
			output: '.page .card { &:is(.foo > .bar, .baz) { color: red; } }',
			errors: 1,
		},
		{
			code: '.card:is(.foo, #bar) {\n\tcolor: red;\n\t& .title { color: blue; }\n}',
			output: '.card {\n\t&:is(.foo, #bar) {\n\t\tcolor: red;\n\t\t& .title { color: blue; }\n\t}\n}',
			errors: 1,
		},
		...[' ', ' > ', ' + ', ' ~ '].map(combinator => ({
			code: `.card { color: red; } .theme${combinator}.card { color: blue; }`,
			output: `.card { color: red; .theme${combinator}& { color: blue; } }`,
			errors: 1,
		})),
		{
			code: '.card.active { color: red; } .page .theme > .card.active { color: blue; }',
			output: '.card.active { color: red; .page .theme > & { color: blue; } }',
			errors: 1,
		},
		{
			code: '.card { color: red; } .theme .card, #other > .card { color: blue; }',
			output: '.card { color: red; .theme &, #other > & { color: blue; } }',
			errors: 1,
		},
		{
			code: String.raw`.c\61 rd { color: red; } .th\65 me .c\61 rd { color: blue; }`,
			output: String.raw`.c\61 rd { color: red; .th\65 me & { color: blue; } }`,
			errors: 1,
		},
		{
			code: '.card {\r\n  color: red;\r\n}\r\n.theme .card {\r\n  color: blue;\r\n}',
			output: '.card {\r\n  color: red;\r\n  .theme & {\r\n    color: blue;\r\n  }\r\n}',
			errors: 1,
		},
		...['media (color)', 'layer theme'].map(atRule => ({
			code: `@${atRule} { .card { color: red; } .theme .card { color: blue; } }`,
			output: `@${atRule} { .card { color: red; .theme & { color: blue; } } }`,
			errors: 1,
		})),
		...['media (color)', 'layer theme', 'layer', 'MEDIA (color)', String.raw`l\61 yer theme`].map(atRule => ({
			code: `.card { color: red; } @${atRule} { .card .title, .card .body { color: blue; } .card:where(.active) { color: green; } }`,
			output: `.card { color: red; @${atRule} { & .title, & .body { color: blue; } &:where(.active) { color: green; } } }`,
			errors: 1,
		})),
		{
			code: '.card {\n\tcolor: red;\n}\n@media (color) {\n\t.card .title {\n\t\tcolor: blue;\n\t}\n\t.card:where(.active) {\n\t\tcolor: green;\n\t}\n}',
			output: '.card {\n\tcolor: red;\n\t@media (color) {\n\t\t& .title {\n\t\t\tcolor: blue;\n\t\t}\n\t\t&:where(.active) {\n\t\t\tcolor: green;\n\t\t}\n\t}\n}',
			errors: 1,
		},
		...[
			'.card .title, .card /* keep */ .body { color: red; }',
			'.card:is(.foo, #bar) { color: red; /* keep */ }',
			'.card:is(.foo, #bar) {\n\tcontent: "a\\\n\tb";\n}',
			'.card .title, .card .body {\n\t--value: a\n\t\tb;\n}',
			'.card { color: red; } /* keep */ .theme .card { color: blue; }',
			'.card { color: red } .theme .card { color: blue; }',
			'.card { color: red; } @media (color) { .card .title { /* keep */ } .card.active {} }',
		].map(code => ({code, errors: 1})),
	],
});
