import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	{
		code: '.outer, #missing { :is(.a:where(&), .b:where(&.active)).active { color: red; } }',
		output: '.outer, #missing { .a:where(&), .b:where(&.active) { &.active { color: red; } } }',
	},
	{
		code: '.outer { :is(.a:where(&), &.b) .title { color: red; } }',
		output: '.outer { .a:where(&), &.b { .title { color: red; } } }',
	},
	{
		code: '.outer { :is(.a:where(#1&, .open), .b:where(&.active))::before { content: "test"; } }',
		output: '.outer { .a:where(#1&, .open), .b:where(&.active) { &::before { content: "test"; } } }',
	},
	...[' ', ' > ', ' + ', ' ~ '].map(combinator => ({
		code: `.outer { :is(.theme${combinator}.a:where(&), .b:where(&.active)) .title { color: red; } }`,
		output: `.outer { .theme${combinator}.a:where(&), .b:where(&.active) { .title { color: red; } } }`,
	})),
	{
		code: '.outer { &:is(:where(&.active), .foo).title { color: red; } }',
		output: '.outer { &:where(&.active), &.foo { &.title { color: red; } } }',
	},
	{
		code: '.outer { &:is(button:where(&.active), .foo) > .title { color: red; } }',
		output: '.outer { button&:where(&.active), &.foo { > .title { color: red; } } }',
	},
	...[' ', ' > ', ' + ', ' ~ '].map(combinator => ({
		code: `.outer { &${combinator}:is(.a:where(&), .b).active { color: red; } }`,
		output: `.outer { &${combinator}.a:where(&), &${combinator}.b { &.active { color: red; } } }`,
	})),
	{
		code: '.outer { &:is(.theme > .a:where(&), .b).active { color: red; &::before { content: "test"; } } }',
		output: '.outer { .theme > &.a:where(&), &.b { &.active { color: red; &::before { content: "test"; } } } }',
	},
	{
		code: '.outer { :is(.a:where(:not(&.disabled)), .b:where(:is(&, .open))).active { color: red; } }',
		output: '.outer { .a:where(:not(&.disabled)), .b:where(:is(&, .open)) { &.active { color: red; } } }',
	},
	...[':host(&)', ':host-context(&)', ':scope&', ':visited&'].map(argument => ({
		code: `.outer { :is(.a:where(${argument}, &), .b:where(&.active)).active { color: red; } }`,
		output: `.outer { .a:where(${argument}, &), .b:where(&.active) { &.active { color: red; } } }`,
	})),
	{
		code: ':is(.a:where(&), .b).active { color: red; }',
		output: '.a:where(&), .b { &.active { color: red; } }',
	},
	{
		code: '.outer { :IS(.a:WHERE(&), .b:WHERE(&.active)).active { COLOR: RED !important; } }',
		output: '.outer { .a:WHERE(&), .b:WHERE(&.active) { &.active { COLOR: RED !important; } } }',
	},
	{
		code: String.raw`.outer { :is(.\61:where(&), .\62:where(&.active)).active { color: red; } }`,
		output: String.raw`.outer { .\61:where(&), .\62:where(&.active) { &.active { color: red; } } }`,
	},
	{
		code: '@media (color) { .outer { @layer theme { &:is(:where(&.active), .foo) .title { color: red; } } } }',
		output: '@media (color) { .outer { @layer theme { &:where(&.active), &.foo { & .title { color: red; } } } } }',
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: ['.outer {', '  :is(.a:where(&), .b:where(&.active)).active {', '    color: red;', '  }', '}'].join(lineBreak),
		output: ['.outer {', '  .a:where(&), .b:where(&.active) {', '    &.active {', '      color: red;', '    }', '  }', '}'].join(lineBreak),
	})),
];

test({
	valid: [
		'.outer { :is(.a:where(:unknown(&)), .b:where(&)).active { color: red; } }',
		'@namespace url("https://example.com"); .outer { :is(.a:where(&), .b:where(&)).active { color: red; } }',
		'@scope (.page) { .outer { :is(.a:where(&), .b:where(&)).active { color: red; } } }',
	],
	invalid: [
		{
			code: '.outer { &:is(.a:where(&), .b) &.active { color: red; } }',
			output: '.outer { &:is(.a:where(&), .b) & { &.active { color: red; } } }',
			errors: [{messageId: 'prefer-nesting'}],
		},
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting'}]})),
		...[
			':is(.a:where(&), .b)',
			':is(.a:where(&) > .title, .b > .title)',
			':is(.a:where(&), .b:not(&))',
			':where(.a:where(&), .b:where(&))',
		].map(selector => ({
			code: `.outer { ${selector}.active { color: red; } }`,
			output: `.outer { ${selector} { &.active { color: red; } } }`,
			errors: [{messageId: 'prefer-nesting'}],
		})),
		{code: '.outer { :is(.a:where(&), .b:where(&)).active { color: red; /* keep */ } }', errors: [{messageId: 'prefer-nesting'}]},
	],
});

nodeTest('expanded groups preserve zero-specificity references and stable nested bodies', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/prefer-nesting': 'error'}};
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
