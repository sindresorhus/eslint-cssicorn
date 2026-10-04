import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import css from '@eslint/css';
import {Linter} from 'eslint';
import {getTester} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test.snapshot({
	valid: [
		'a {}',
		'* {}',
		'#foo {}',
		'.foo {}',
		'[data-x] {}',
		':hover {}',
		'::before {}',
		'a#foo.bar[data-x]:hover::before {}',
		'a#foo.bar[data-x]:not(.disabled):hover::before {}',
		'a:is(.foo, .bar)::before {}',
		'::cue(.foo#id) {}',
		String.raw`:i\73 (.foo#id) {}`,
		'a#z#a.z.a[data-z][data-a]:hover:focus::before {}',
		'&.foo {}',
		'&#id.foo {}',
		'&:hover {}',
		'&:hover::before {}',
		'div&#id.foo[data-x]:hover {}',
		'&&#id.foo {}',
		'svg|a#id.foo {}',
		'*|*#id.foo {}',
		'|a#id.foo {}',
		'::before:hover {}',
		':hover::before {}',
		'a::before::marker {}',
		'::part(button):hover:focus {}',
		':before:hover {}',
		String.raw`:\62 efore:hover {}`,
		':BEFORE:hover {}',
		'.foo #id {}',
		'.foo > #id + .bar ~ [data-x] {}',
		'#id/* keep */.foo {}',
		':global.foo#id {}',
		':local.foo#id {}',
		':global(.foo#id).bar {}',
		':local(.foo#id).bar {}',
		String.raw`:\67 lobal.foo#id {}`,
		':LOCAL.foo#id {}',
		'.foo#id:global {}',
		'.foo#id::part(button):global(:hover) {}',
		'.foo#id::before:LOCAL {}',
		String.raw`.foo#id:before:\67 lobal {}`,
		'.foo#id* {}',
		'&div.foo#id {}',
		'.foo::before#id {}',
		'.foo:before#id {}',
		'a { content: ".foo#id"; --selector: .foo#id; background: url(".foo#id"); }',
	],
	invalid: [
		'.foo#a {}',
		'[data-x]#foo {}',
		'[data-x].foo {}',
		':hover[data-x] {}',
		':hover.foo {}',
		'#id& {}',
		'.foo& {}',
		':hover& {}',
		'.foo&&#id {}',
		'.foo#a[data-x]:hover::before {}',
		':is(a, button).rgh-own-conversation {}',
		'[data-x]:not(.disabled):hover.foo#id {}',
		'a[data-x]:hover.foo#id {}',
		'a[data-z].z[data-a].a#z#a:hover:focus {}',
		'div.foo&#id {}',
		'svg|a.foo#id {}',
		'*|*.foo#id {}',
		String.raw`.\66 oo#\69 d {}`,
		String.raw`.foo\61 #id {}`,
		':HOVER[DATA-X].Foo#ID {}',
		':-webkit-any(a, button).foo {}',
		'.foo#id::before:hover {}',
		'.foo#id::before::marker {}',
		'.foo#id:BEFORE:hover {}',
		String.raw`.foo#id:\62 efore:hover {}`,
		'.foo#id ::part(button):hover {}',
		'.foo#id > .bar#other + [data-x].baz ~ :hover.qux {}',
		'.foo#id, [data-x].bar {}',
		':is(.foo#id, [data-x].bar) {}',
		':not(.foo#id) {}',
		':where(.foo#id) {}',
		':has(> .foo#id) {}',
		':nth-child(2n of .foo#id) {}',
		':nth-last-child(odd of [data-x].foo) {}',
		'::slotted(.foo#id) {}',
		':host(.foo#id) {}',
		'[title="/* text */"].foo#id {}',
		'.foo/* keep */#id {}',
		'[data-x/* keep */].foo#id {}',
		':is(.foo/* keep */)#id {}',
		'a { :hover.foo&#id { color: red !important; } }',
		'@media (width > 0px) { .foo#id {} }',
		'@supports (display: grid) { .foo#id {} }',
		'@container (width > 0px) { .foo#id {} }',
		'@layer theme { .foo#id {} }',
		'@scope (.foo#id) { .bar#other {} }',
		'@supports selector(.foo#id) { .bar#other {} }',
	],
});

test({
	valid: [],
	invalid: [
		{
			code: '[disabled].button#save:hover {}',
			output: '#save.button[disabled]:hover {}',
			errors: [{messageId: 'consistent-compound-selector-order', column: 1, endColumn: 29}],
		},
		{
			code: 'a[data-z].z[data-a].a#z#a:hover:focus {}',
			output: 'a#z#a.z.a[data-z][data-a]:hover:focus {}',
			errors: 1,
		},
		{
			code: 'a { :hover.foo&#id {} }',
			output: 'a { &#id.foo:hover {} }',
			errors: 1,
		},
		{
			code: '.foo#id:before:hover {}',
			output: '#id.foo:before:hover {}',
			errors: [{messageId: 'consistent-compound-selector-order', column: 1, endColumn: 8}],
		},
		{
			code: String.raw`.foo#id:\62 efore:hover {}`,
			output: String.raw`#id.foo:\62 efore:hover {}`,
			errors: 1,
		},
		{
			code: '.foo#id::part(button):hover {}',
			output: '#id.foo::part(button):hover {}',
			errors: 1,
		},
		{
			code: String.raw`.\66 oo#\69 d {}`,
			output: String.raw`#\69 d.\66 oo {}`,
			errors: 1,
		},
		{
			code: String.raw`.foo\61 #id {}`,
			output: String.raw`#id.foo\61  {}`,
			errors: 1,
		},
		{
			code: ':is(.foo#id, .bar#other)[data-x] {}',
			output: '[data-x]:is(.foo#id, .bar#other) {}',
			errors: 3,
		},
		{
			code: '.foo#id::slotted([data-x].bar#other) {}',
			output: '#id.foo::slotted(#other.bar[data-x]) {}',
			errors: 2,
		},
		{
			code: ':IS(.foo#id):NTH-CHILD(2n of .bar#other) {}',
			output: ':IS(#id.foo):NTH-CHILD(2n of #other.bar) {}',
			errors: 2,
		},
		{
			code: '@scope (.scope#root) to ([data-stop].limit#end) { .item#target {} }',
			output: '@scope (#root.scope) to (#end.limit[data-stop]) { #target.item {} }',
			errors: 3,
		},
		{
			code: '.foo/* keep */#id {}',
			errors: 1,
		},
		{
			code: '[data-x/* keep */].foo#id {}',
			errors: 1,
		},
		{
			code: ':is(.foo/* keep */)#id {}',
			errors: 1,
		},
		{
			code: '/* before */ .foo#id /* after */ {}',
			output: '/* before */ #id.foo /* after */ {}',
			errors: 1,
		},
		{
			code: '.foo/* keep */#id > [data-x].bar#other {}',
			output: '.foo/* keep */#id > #other.bar[data-x] {}',
			errors: [
				{messageId: 'consistent-compound-selector-order', column: 1, endColumn: 18},
				{messageId: 'consistent-compound-selector-order', column: 21, endColumn: 39},
			],
		},
		{
			code: '.foo#id::part(button):global(:hover) > .bar#other {}',
			output: '.foo#id::part(button):global(:hover) > #other.bar {}',
			errors: 1,
		},
		{
			code: 'a {\n  .foo#id {\n    color: red;\n  }\n}',
			output: 'a {\n  #id.foo {\n    color: red;\n  }\n}',
			errors: 1,
		},
		{
			code: 'a {\r\n\t.foo#id {\r\n\t\tcolor: red;\r\n\t}\r\n}',
			output: 'a {\r\n\t#id.foo {\r\n\t\tcolor: red;\r\n\t}\r\n}',
			errors: 1,
		},
	],
});

nodeTest('nested fixes converge and are idempotent', () => {
	const linter = new Linter();
	const config = {
		language: 'css/css',
		plugins: {
			css,
			test: {rules: {order: rule}},
		},
		rules: {'test/order': 'error'},
	};

	for (const [code, output] of [
		[':is(.foo#id, .bar#other)[data-x] {}', '[data-x]:is(#id.foo, #other.bar) {}'],
		[':is(:not([data-x].foo#id).bar)[data-y] {}', '[data-y]:is(.bar:not(#id.foo[data-x])) {}'],
	]) {
		const result = linter.verifyAndFix(code, config);
		assert.equal(result.output, output);
		assert.deepEqual(result.messages, []);
		assert.equal(result.fixed, true);
		assert.deepEqual(linter.verifyAndFix(output, config), {output, messages: [], fixed: false});
	}

	const code = ':is(.foo#id/* keep */).bar {}';
	const output = ':is(#id.foo/* keep */).bar {}';
	const result = linter.verifyAndFix(code, config);
	assert.equal(result.output, output);
	assert.equal(result.fixed, true);
	assert.equal(result.messages.length, 1);
	assert.equal(result.messages[0].messageId, 'consistent-compound-selector-order');
	assert.equal(result.messages[0].fix, undefined);
	assert.deepEqual(linter.verifyAndFix(output, config), {...result, fixed: false});
});
