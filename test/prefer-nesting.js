import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import css from '@eslint/css';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

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
			output: ':is(.foo, #123) { a { color: red; } }',
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
		{
			code: 'a :is(.foo, :blank) { color: red; }',
			output: 'a { :is(.foo, :blank) { color: red; } }',
			errors: 1,
		},
		{
			code: ':is(.foo, :blank) a { color: red; }',
			output: ':is(.foo, :blank) { a { color: red; } }',
			errors: 1,
		},
		{
			code: 'a :is(.foo, [x="a" s]) { color: red; }',
			output: 'a { :is(.foo, [x="a" s]) { color: red; } }',
			errors: 1,
		},
		{
			code: ':is(.foo, [x="a" s]) a { color: red; }',
			output: ':is(.foo, [x="a" s]) { a { color: red; } }',
			errors: 1,
		},
		{
			code: 'a :is(foo|b, c) { color: red; }',
			output: 'a { :is(foo|b, c) { color: red; } }',
			errors: 1,
		},
		{
			code: ':is(foo|b, c) a { color: red; }',
			output: ':is(foo|b, c) { a { color: red; } }',
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
			output: ':is(.foo, :blank) { a { :is(.bar, :blank) { color: red; } } }',
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
	assert.equal(mixedSpecificity.output, '.foo, #bar { a { color: red; } }');
	assert.deepEqual(mixedSpecificity.messages.map(message => message.ruleId), ['cssicorn/no-nesting-with-mixed-specificity']);
});
