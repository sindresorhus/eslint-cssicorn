import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import css from '@eslint/css';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'.card {} .card {}',
		'.card {} .cardinal {}',
		'.card {} .card-other {}',
		'.card {} .other {} .card .title {}',
		'.card .title {} .card {}',
		'.card, .other {} .card .title {}',
		'.page .card {} .page .card .title {}',
		'.card::before {} .card::before.active {}',
		'.card {} .card .title:unknown {}',
		'.outer { .card {} & .card .title {} }',
		'.outer { .card {} .card:has(&) {} }',
		'.outer { .card {} --value: red; .card .title {} }',
		'.card {} @media (width > 0px) { .card .title {} }',
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
		'.card:not(.disabled) {} .card:not(.disabled) .title {}',
		'.card:unknown {} .card:unknown .title {}',
		'.card {} @media (width > 0px) { .other {} }',
		'.card {} @media (width > 0px) { .card {} .other {} }',
		'.card {} @media (width > 0px) { .card, .other {} }',
		'.card {} @media (width > 0px) { @supports (display: grid) { .card {} } }',
		'.card {} @supports (display: grid) {}',
		'.card {} @layer theme { .card {} }',
		'.card {} @container (width > 0px) { .card {} }',
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
		'a:is(.foo, .bar) {}',
		':is(.foo, .bar) {}',
		'a :is(.foo) {}',
		':is(.foo) a {}',
		'a :is(.foo, .bar) b {}',
		'a :is(.foo, .bar).active {}',
		'a :is(.foo, .bar), b {}',
		':is(.foo, .bar) a, b {}',
		'a :where(.foo, .bar) {}',
		'a :not(.foo, .bar) {}',
		'a :has(.foo, .bar) {}',
		'a :matches(.foo, .bar) {}',
		String.raw`a :\69 s(.foo, .bar) {}`,
		'a > :is(.foo) {}',
		'a > :is(.foo .bar, .baz) {}',
		'a > :is(.foo, .bar), b {}',
		'a :is(.foo .bar, .baz .qux) {}',
		':is(.foo .bar, .baz) a {}',
		':is(.foo > .bar, .baz).active {}',
		':is(.foo .bar, .baz) > a {}',
		'a :is(.foo, :unknown) {}',
		':is(.foo, :unknown) a {}',
		'a :is(.foo, ::before) {}',
		':is(.foo, :before).active {}',
		':is(.foo, :has(:has(.bar))) a {}',
		'a::before :is(.foo, .bar) {}',
		'a:is(.foo, .bar)::before {}',
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
		'.card { color: red; } .card .title, .card > #body { color: blue; }',
		'.card:hover { color: red; } .card:hover .title { color: blue; }',
		'[data-kind="CARD" i] { color: red; } [data-kind="CARD" i] .title { color: blue; }',
		'form:invalid { color: red; } @media (width > 0px) { form:invalid { color: blue; } }',
		'.card { color: red; } @media (width > 0px) { .card { color: blue; } }',
		'.card { color: red; } @supports (display: grid) { .card { color: blue; } }',
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
