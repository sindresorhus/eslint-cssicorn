import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	...[' ', ' > ', ' + ', ' ~ '].map(combinator => ({
		code: `:is(.context${combinator}.foo, #bar)::before { content: "test"; }`,
		output: `.context${combinator}.foo, #bar { &::before { content: "test"; } }`,
	})),
	{
		code: ':is(.context > .foo, .panel + .bar).active { color: red; }',
		output: '.context > .foo, .panel + .bar { &.active { color: red; } }',
	},
	{
		code: ':is(.context > .foo, #bar) .title { color: red; }',
		output: '.context > .foo, #bar { .title { color: red; } }',
	},
	{
		code: ':is(.context > .foo, #bar) > .title { color: red; }',
		output: '.context > .foo, #bar { > .title { color: red; } }',
	},
	{
		code: ':IS(.context > .foo, #bar).active { COLOR: RED !important; & .title { color: blue; } }',
		output: '.context > .foo, #bar { &.active { COLOR: RED !important; & .title { color: blue; } } }',
	},
	{
		code: String.raw`:is(.c\6f ntext > .f\6f o, #b\61 r)::before { content: "test"; }`,
		output: String.raw`.c\6f ntext > .f\6f o, #b\61 r { &::before { content: "test"; } }`,
	},
	{
		code: '@media (color) { @layer theme { :is(.context > .foo, #bar).active { color: red; } } }',
		output: '@media (color) { @layer theme { .context > .foo, #bar { &.active { color: red; } } } }',
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: [':is(.context > .foo, #bar)::before {', '  content: "test";', '}'].join(lineBreak),
		output: ['.context > .foo, #bar {', '  &::before {', '    content: "test";', '  }', '}'].join(lineBreak),
	})),
];

const explicitCases = [
	...[' ', ' > ', ' + ', ' ~ '].map(combinator => ({
		code: `.card { :is(&${combinator}.foo, .context > &#bar)::before { content: "test"; } }`,
		output: `.card { &${combinator}.foo, .context > &#bar { &::before { content: "test"; } } }`,
	})),
	{
		code: '.card { :is(.context > &.foo, &#bar).active { color: red; } }',
		output: '.card { .context > &.foo, &#bar { &.active { color: red; } } }',
	},
	{
		code: '.card { :is(&& .foo, &#bar).active { color: red; & .title { color: blue; } } }',
		output: '.card { && .foo, &#bar { &.active { color: red; & .title { color: blue; } } } }',
	},
	{
		code: '.card, #other { :is(& > .foo, .context > &#bar) .title { color: red; } }',
		output: '.card, #other { & > .foo, .context > &#bar { .title { color: red; } } }',
	},
	{
		code: '@media (color) { .card { @layer theme { :IS(& > .foo, &#bar).active { COLOR: RED !important; } } } }',
		output: '@media (color) { .card { @layer theme { & > .foo, &#bar { &.active { COLOR: RED !important; } } } } }',
	},
	{
		code: String.raw`.card { :is(& > .f\6f o, .c\6f ntext > &#b\61 r).active { color: red; } }`,
		output: String.raw`.card { & > .f\6f o, .c\6f ntext > &#b\61 r { &.active { color: red; } } }`,
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: ['.card {', '  :is(& > .foo, &#bar)::before {', '    content: "test";', '  }', '}'].join(lineBreak),
		output: ['.card {', '  & > .foo, &#bar {', '    &::before {', '      content: "test";', '    }', '  }', '}'].join(lineBreak),
	})),
	{
		code: '.card { &:is(& > .foo, &#bar).active { color: red; } }',
		output: '.card { & > &.foo, &&#bar { &.active { color: red; } } }',
	},
];

test({
	valid: [
		'.outer { :is(.foo, .bar):where(&.active, .open) & .title { color: red; } }',
		'.card { :is(& > .foo, &#bar) & .title { color: red; } }',
		'.outer { :is(.foo, .bar):where(&.active, .open) .title { color: red; } }',
		'.outer { :is(.foo, .bar):where(&.active, .open):is(.title, .body) { color: red; } }',
		'.outer { .card:is(& > .foo, .bar).active { color: red; & .title { color: blue; } } }',
		'.card { > :is(& > .foo, &#bar).active { color: red; } }',
		'.card { :where(& > .foo, &#bar).active { color: red; } }',
		'.outer { :is(.context > .foo, #bar)::before { content: "test"; } }',
		'.card { > :is(.context > .foo, #bar)::before { content: "test"; } }',
		':where(.context > .foo, #bar)::before { content: "test"; }',
		String.raw`.outer { :IS(.f\6f o, .bar):n\6f t(&.disabled)::before { content: "test"; } }`,
		'.outer { :is(.foo, .bar)& { color: red; } }',
		'.outer { :is(.foo, .bar):not(&.disabled) { color: red; } }',
		'.card { a :is(&.foo, .bar) { color: red; } }',
		'.card { :is(& > .foo, &#bar) { color: red; } }',
		'@scope (.card) { :is(& > .foo, &#bar)::before { content: "test"; } }',
		':is(.context > .foo, #bar) { color: red; }',
		'@scope (.outer) { :is(.context > .foo, #bar)::before { content: "test"; } }',
		'@namespace url("https://example.com"); :is(.context > .foo, #bar)::before { content: "test"; }',
	],
	invalid: [
		...[...cases, ...explicitCases].map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting'}]})),
		{code: '.card { :is(& > /* keep */ .foo, &#bar).active { color: red; } }', errors: [{messageId: 'prefer-nesting'}]},
		{code: ':is(.context > /* keep */ .foo, #bar)::before { content: "test"; }', errors: [{messageId: 'prefer-nesting'}]},
	],
});

nodeTest('complex leading groups reparse and reach stable output', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: Object.fromEntries([
			'prefer-nesting',
			'no-useless-is',
			'no-redundant-nested-style-rules',
			'no-declarations-after-nested-rules',
			'no-unscoped-nesting-selector',
		].map(name => [`cssicorn/${name}`, 'error'])),
	};
	for (const {code, output} of [...cases, ...explicitCases]) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
