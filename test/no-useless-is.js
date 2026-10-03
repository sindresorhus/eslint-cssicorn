import test from 'node:test';
import assert from 'node:assert/strict';
import css from '@eslint/css';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

ruleTest.snapshot({
	valid: [
		':is(.foo, .bar) {}',
		'a:is(.foo, .bar) {}',
		'.foo:is(:hover, :focus) {}',
		'.foo:has(:is(.bar, .baz)) {}',
		'div[class^="foo"]:is(li[class*="bar"] *) {}',
		'.foo { &:is(li[class*="bar"] *) { color: red; } }',
		'.foo:is(.bar .baz) {}',
		'.foo > :is(.bar .baz) {}',
		':is(.foo .bar) > .baz {}',
		':is(.foo .bar):hover {}',
		'.foo:has(:is(.foo .bar)) {}',
		'.foo:has(> :is(.bar .baz)) {}',
		':not(:is(.foo .bar)) {}',
		'::slotted(:is(.foo .bar)) {}',
		':host(:is(.foo .bar)) {}',
		'.foo { :is(.bar .baz) {} }',
		'.foo { @media (width > 1px) { :is(.bar > .baz) {} } }',
		'.foo:is(div) {}',
		'div:is(span) {}',
		'*:is(div) {}',
		':is(div)span {}',
		':is() {}',
		':is(> .foo) {}',
		':is(.foo >) {}',
		':is(:unknown) {}',
		':is(:--custom) {}',
		':is(:-webkit-any(.foo)) {}',
		':is(::before) {}',
		':is(:before) {}',
		':is(.foo::after) {}',
		':is(:has(:has(.foo))) {}',
		':is(:hover(value)) {}',
		'.foo { :is(&) {} :is(& .bar) {} }',
		':where(.foo) {} :not(.foo) {} :has(.foo) {} :-webkit-any(.foo) {}',
		'@supports selector(:is(.foo)) {}',
		'@scope (:is(.foo)) to (:is(.bar)) {}',
		'@namespace url("http://www.w3.org/2000/svg"); :is(.foo) {}',
		'@namespace svg url("http://www.w3.org/2000/svg"); :is(svg|a) {}',
		String.raw`@n\61 mespace url("http://www.w3.org/2000/svg"); :is(.foo) {}`,
		String.raw`:\69 s(.foo, .bar) {} :\69 s(.foo >) {}`,
		'a { content: ":is(.foo)"; background: url(":is(.foo)"); --selector: :is(.foo); }',
		'@scope (.root) { :is(.outside .inside) {} }',
		'@scope (.root) { @media (width > 1px) { :is(.foo > .bar) {} } }',
		'.fallback, .foo:has(:is(:has(.bar))) {}',
		'.fallback, .foo:has(:is(.bar:has(.baz))) {}',
		'.fallback, :is(svg|a) {}',
		'.fallback, :is([svg|href]) {}',
		':is(*|a) {} :is([*|href]) {} :is(|a) {}',
		'.fallback, :is([foo="bar" x]) {}',
		String.raw`.fallback, :is([foo="bar" \78]) {}`,
		'.fallback, :is([foo i]) {}',
		':is([foo="bar" i]) {} :is([foo="bar" S]) {}',
		String.raw`:is([foo="bar" \69]) {}`,
		':is(:lang(en)) {} :is(:dir(ltr)) {}',
		'.fallback, :is(:lang(en,)) {}',
		'.fallback, :is(:lang(,en)) {}',
		'.fallback, :is(:lang(en fr)) {}',
		'.fallback, :is(:lang(en,,fr)) {}',
		String.raw`.fallback, :\69 s(:LANG(en,)) {}`,
		'.fallback, :is(:nth-of-type(2n of .foo)) {}',
		'.fallback, :is(:nth-last-of-type(2n of .foo)) {}',
		':is(:nth-child(2n of .foo)) {}',
		'.fallback, :is(:left) {} :is(:first) {} :is(:right) {} :is(:recto) {} :is(:verso) {}',
		String.raw`.fallback, :is(:\6c eft) {} :\69 s(:FIRST) {}`,
		'@keyframes fade { :is(from) { opacity: 0; } }',
		'@NAMESPACE url("http://www.w3.org/2000/svg"); :is(.foo) {}',
		String.raw`@SCOPE (.root) { :\69 s(.foo > .bar) {} }`,
		String.raw`:\69 s(.foo ?) {}`,
	],
	invalid: [
		':is(.foo) {}',
		'a:is(.foo) {}',
		'.foo:is(:hover) {}',
		'.foo :is(.bar) {}',
		':is(.foo) a {}',
		'.rgh-tic:is(:nth-of-type(5n+1)):has(~ .rgh-tic:hover:nth-of-type(5n+1))::before {}',
		'.foo:has(:is(.bar)) {}',
		'.foo { a:is([class^="bar"]) { color: red; } }',
		':is(#foo.active[data-state="open"]) {}',
		':is(div).foo {}',
		':is(*).foo {}',
		'.foo > :is(span).bar {}',
		':is(.foo .bar) {}',
		':is(.foo > .bar) {}',
		':is(.foo + .bar) {}',
		':is(.foo ~ .bar), .baz {}',
		':IS(.foo) {}',
		String.raw`:\69 s(.foo) {}`,
		String.raw`:\000069s(div).foo {}`,
		String.raw`:is(.f\6f o) {}`,
		String.raw`:is(.foo\)):hover {}`,
		String.raw`:is(.foo\61):focus {}`,
		':is(.foo)::before { color: red !important; }',
		':not(:is(.foo)) {} :where(:is(.bar)) {}',
		':nth-child(2n of :is(.foo)) {}',
		':host(:is(.foo)) {} ::slotted(:is(.bar)) {}',
		'@media (width > 1px) { @supports (display: grid) { :is(.foo > .bar) {} } }',
		'@container (width > 1px) { @layer components { :is(.foo) {} } }',
		'@scope (.root) { :is(.foo) {} }',
		'@supports selector(:is(.foo)) { :is(.bar) {} }',
		'@scope (:is(.root)) to (:is(.limit)) { :is(.target) {} }',
		'.foo { &:is([class^="bar"]) {} }',
		':is(.foo/* keep */.bar) {}',
		':is(/* before */.foo/* after */) {}',
		':is(\n  .foo\n) {\n  color: red;\n}',
		':is(\r\n  .foo\r\n) {\r\n  color: red;\r\n}',
		String.raw`:\69 s(/* keep */.foo) {}`,
		String.raw`:\69 s(.foo > .bar) {}`,
		':is([data-label="& :is(.foo) /* text */"]) {}',
		':is(:nth-last-of-type(2n + 1)) {}',
	],
});

ruleTest({
	valid: [],
	invalid: [
		{
			code: ':is(.first):is(.second) {}',
			output: '.first:is(.second) {}',
			errors: [{messageId: 'no-useless-is'}, {messageId: 'no-useless-is'}],
		},
		{
			code: ':is(:is(.foo)) {}',
			output: ':is(.foo) {}',
			errors: [{messageId: 'no-useless-is'}, {messageId: 'no-useless-is'}],
		},
		{
			code: ':is(.foo /* keep */) {}',
			errors: [{messageId: 'no-useless-is'}],
		},
		{
			code: String.raw`:is(.foo\61 ):hover {}`,
			output: String.raw`.foo\61 :hover {}`,
			errors: [{messageId: 'no-useless-is'}],
		},
		{
			code: '/* 🌈 */\r\n@media (width > 1px) {\r\n  .card:\\69 s(\r\n    .active\r\n  ) { color: red; }\r\n}',
			output: '/* 🌈 */\r\n@media (width > 1px) {\r\n  .card.active { color: red; }\r\n}',
			errors: [{messageId: 'no-useless-is'}],
		},
	],
});

ruleTest({
	valid: [],
	invalid: [
		[String.raw`:is(.foo\61) a {}`, String.raw`.foo\61  a {}`],
		[String.raw`:is(#foo\61) a {}`, String.raw`#foo\61  a {}`],
		[String.raw`:is(div\61) a {}`, String.raw`div\61  a {}`],
		[String.raw`:is(:hove\72) a {}`, String.raw`:hove\72  a {}`],
		[String.raw`:is(.foo\000061) :hover {}`, String.raw`.foo\000061  :hover {}`],
		[':is(.foo\\61)\na {}', '.foo\\61 \na {}'],
		[':is(.foo\\61)\r\na {}', '.foo\\61 \r\na {}'],
		[String.raw`:is(.foo\61 ) a {}`, String.raw`.foo\61  a {}`],
		[String.raw`:is(.foo\\61) a {}`, String.raw`.foo\\61 a {}`],
		[String.raw`:is(.foo\)) a {}`, String.raw`.foo\) a {}`],
	].map(([code, output]) => ({code, output, errors: [{messageId: 'no-useless-is'}]})),
});

test('fixes converge with other selector rules', () => {
	const linter = new Linter();
	const config = {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {
			css,
			cssicorn: plugin,
		},
		rules: {
			'cssicorn/no-useless-is': 'error',
			'cssicorn/lowercase': 'error',
			'cssicorn/prefer-modern-syntax': 'error',
		},
	};
	for (const [code, expected] of [
		[':is(.first):is(.second) {}', '.first.second {}'],
		[':is(:is(.foo)) {}', '.foo {}'],
		[String.raw`:\69 s(:is(.foo)) {}`, '.foo {}'],
		[':IS(.foo):BEFORE { color: RED; }', '.foo::before { color: red; }'],
	]) {
		const first = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(first.fixed, true);
		assert.equal(first.output, expected);
		assert.deepEqual(first.messages, []);
		const second = linter.verifyAndFix(first.output, config, {filename: 'test.css'});
		assert.equal(second.fixed, false);
		assert.equal(second.output, expected);
		assert.deepEqual(second.messages, []);
	}
});
