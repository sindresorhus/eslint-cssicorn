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
];

const retainedCases = [
	...['', '&', '> ', '& > '].flatMap(prefix => ['&', '&&', ':not(&.disabled)', ':nth-child(odd of &.foo)', ':has(> &.foo)'].map(reference => ({
		code: `.outer { ${prefix}:is(.foo, .bar)${reference}::before { content: "test"; } }`,
		output: `.outer { ${prefix}:is(.foo, .bar)${reference} { &::before { content: "test"; } } }`,
	}))),
	...[' ', ' > ', ' + ', ' ~ '].map(combinator => ({
		code: `.outer { .theme:is(.dark, .light) &${combinator}.title { color: red; & .body { color: blue; } } }`,
		output: `.outer { .theme:is(.dark, .light) & { ${combinator === ' ' ? '& ' : combinator.trimStart()}.title { color: red; & .body { color: blue; } } } }`,
	})),
	{
		code: '.outer { :is(.foo, .bar):where(&.active, .open) & .title { color: red; } }',
		output: '.outer { :is(.foo, .bar):where(&.active, .open) & { & .title { color: red; } } }',
	},
	{
		code: '.card { :is(& > .foo, &#bar) & .title { color: red; } }',
		output: '.card { :is(& > .foo, &#bar) & { & .title { color: red; } } }',
	},
	{
		code: String.raw`.outer { :IS(.f\6f o, .bar):NOT(&.disabled)::before { content: "test"; } }`,
		output: String.raw`.outer { :IS(.f\6f o, .bar):NOT(&.disabled) { &::before { content: "test"; } } }`,
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: ['.outer {', '  :is(.foo, .bar):not(&.disabled)::before {', '    content: "test";', '  }', '}'].join(lineBreak),
		output: ['.outer {', '  :is(.foo, .bar):not(&.disabled) {', '    &::before {', '      content: "test";', '    }', '  }', '}'].join(lineBreak),
	})),
	...['', '&', '> ', '& > '].flatMap(prefix => ['is', 'where'].flatMap(name => ['&.active, .open', ':not(&.disabled), .open', '&&.active, .open'].map(argumentsText => ({
		code: `.outer { ${prefix}:is(.foo, .bar):${name}(${argumentsText})::before { content: "test"; } }`,
		output: `.outer { ${prefix}:is(.foo, .bar):${name}(${argumentsText}) { &::before { content: "test"; } } }`,
	})))),
	{
		code: '.outer { :where(.foo, .bar):is(&.active, .open) > .title { color: red; & .body { color: blue; } } }',
		output: '.outer { :where(.foo, .bar):is(&.active, .open) { > .title { color: red; & .body { color: blue; } } } }',
	},
	{
		code: '.outer { :is(.foo, .bar):where(&.active, .open) .title { color: red; } }',
		output: '.outer { :is(.foo, .bar):where(&.active, .open) { & .title { color: red; } } }',
	},
	{
		code: '.outer { :is(.foo, .bar):where(&.active, .open):is(.title, .body) { color: red; } }',
		output: '.outer { :is(.foo, .bar):where(&.active, .open) { &:is(.title, .body) { color: red; } } }',
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: ['.outer {', '  :is(.foo, .bar):where(&.active, .open)::before {', '    content: "test";', '  }', '}'].join(lineBreak),
		output: ['.outer {', '  :is(.foo, .bar):where(&.active, .open) {', '    &::before {', '      content: "test";', '    }', '  }', '}'].join(lineBreak),
	})),
	...['.card', '.theme ', '.theme > ', '& > .card'].flatMap(prefix => ['is', 'where'].map(name => ({
		code: `.outer { ${prefix}:${name}(&.foo, .bar)::before { content: "test"; } }`,
		output: `.outer { ${prefix}:${name}(&.foo, .bar) { &::before { content: "test"; } } }`,
	}))),
	{
		code: '.outer { .card:is(& > .foo, .bar).active { color: red; & .title { color: blue; } } }',
		output: '.outer { .card:is(& > .foo, .bar) { &.active { color: red; & .title { color: blue; } } } }',
	},
	...['& > .foo, .bar', '.foo > .bar, &#baz', '& > .foo, [data-kind="&"]', '& > .foo, &:unknown', '& > .foo, &[data-kind="CARD" s]'].map(argumentsText => ({
		code: `.card { :is(${argumentsText}).active { color: red; } }`,
		output: `.card { :is(${argumentsText}) { &.active { color: red; } } }`,
	})),
	{
		code: '.card { > :is(& > .foo, &#bar).active { color: red; } }',
		output: '.card { > :is(& > .foo, &#bar) { &.active { color: red; } } }',
	},
	{
		code: '.card { &:is(& > .foo, &#bar).active { color: red; } }',
		output: '.card { & > &.foo, &&#bar { &.active { color: red; } } }',
	},
	{
		code: '.card { :where(& > .foo, &#bar).active { color: red; } }',
		output: '.card { :where(& > .foo, &#bar) { &.active { color: red; } } }',
	},
	{
		code: '.outer { :is(.context > .foo, #bar)::before { content: "test"; } }',
		output: '.outer { :is(.context > .foo, #bar) { &::before { content: "test"; } } }',
	},
	{
		code: '.card { > :is(.context > .foo, #bar)::before { content: "test"; } }',
		output: '.card { > :is(.context > .foo, #bar) { &::before { content: "test"; } } }',
	},
	...['.foo > :unknown', '.foo > [data-kind="CARD" s]'].map(argument => ({
		code: `:is(${argument}, #bar)::before { content: "test"; }`,
		output: `:is(${argument}, #bar) { &::before { content: "test"; } }`,
	})),
	{
		code: ':where(.context > .foo, #bar)::before { content: "test"; }',
		output: ':where(.context > .foo, #bar) { &::before { content: "test"; } }',
	},
];

test({
	valid: [
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
		{code: '.outer { :is(.foo, .bar):not(&.disabled) /* keep */ ::before { content: "test"; } }', errors: [{messageId: 'prefer-nesting'}]},
		{code: '.outer { :is(.foo, .bar):where(&.active, /* keep */ .open)::before { content: "test"; } }', errors: [{messageId: 'prefer-nesting'}]},
		{code: '.outer { .card:is(&.foo, /* keep */ .bar).active { color: red; } }', errors: [{messageId: 'prefer-nesting'}]},
		...[...cases, ...explicitCases, ...retainedCases].map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting'}]})),
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
	for (const {code, output} of [...cases, ...explicitCases, ...retainedCases]) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
