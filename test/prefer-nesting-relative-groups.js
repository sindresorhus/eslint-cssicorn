import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	{
		code: '.card { > :is(.foo, #bar) & .title { color: red; } }',
		output: '.card { > :is(.foo, #bar) & { & .title { color: red; } } }',
	},
	...[' ', ' > ', ' + ', ' ~ '].flatMap(combinator => [
		{
			code: `.card { &${combinator}:is(.foo, #bar).active { color: red; } }`,
			output: `.card { &${combinator}.foo, &${combinator}#bar { &.active { color: red; } } }`,
		},
		{
			code: `.card { &${combinator}:is(&.foo, button).active { color: red; } }`,
			output: `.card { &${combinator}&.foo, &${combinator}button { &.active { color: red; } } }`,
		},
		{
			code: `.card { &${combinator}:is(.context > .foo, #bar)::before { content: "test"; } }`,
			output: `.card { &${combinator}:is(.context > .foo, #bar) { &::before { content: "test"; } } }`,
		},
	]),
	{
		code: '.card {\r\n  & > :is(.foo, #bar)::before {\r\n    content: "test";\r\n  }\r\n}',
		output: '.card {\r\n  & > .foo, & > #bar {\r\n    &::before {\r\n      content: "test";\r\n    }\r\n  }\r\n}',
	},
	...['>', '+', '~'].flatMap(combinator => [

		{
			code: `.card { ${combinator} :is(.foo, #bar).active { color: red; } }`,
			output: `.card { ${combinator} .foo, ${combinator} #bar { &.active { color: red; } } }`,
		},
		{
			code: `.card { ${combinator} :is(div.foo, button)::before { content: "test"; } }`,
			output: `.card { ${combinator} div.foo, ${combinator} button { &::before { content: "test"; } } }`,
		},
		{
			code: `.card { ${combinator} :is(.foo, #bar) .title { color: red; } }`,
			output: `.card { ${combinator} .foo, ${combinator} #bar { & .title { color: red; } } }`,
		},
		{
			code: `.card { ${combinator} :is(.foo, #bar) > .title { color: red; } }`,
			output: `.card { ${combinator} .foo, ${combinator} #bar { > .title { color: red; } } }`,
		},
		{
			code: `.card { ${combinator} :where(.foo, #bar)::before { content: "test"; } }`,
			output: `.card { ${combinator} :where(.foo, #bar) { &::before { content: "test"; } } }`,
		},
	]),
	{
		code: '.card { > :is(:hover, :focus)::before { content: "test"; } }',
		output: '.card { > :hover, > :focus { &::before { content: "test"; } } }',
	},
	{
		code: '.card { > :is(.foo > .bar, #baz).active { color: red; } }',
		output: '.card { > :is(.foo > .bar, #baz) { &.active { color: red; } } }',
	},
	{
		code: '.card { > :is(.foo, :unknown)::before { content: "test"; } }',
		output: '.card { > :is(.foo, :unknown) { &::before { content: "test"; } } }',
	},
	{
		code: '.card { > :IS(.foo, #bar).active { COLOR: RED !important; } }',
		output: '.card { > .foo, > #bar { &.active { COLOR: RED !important; } } }',
	},
	{
		code: String.raw`.card { > :is(.f\6f o, #b\61 r)::before { content: "test"; } }`,
		output: String.raw`.card { > .f\6f o, > #b\61 r { &::before { content: "test"; } } }`,
	},
	{
		code: '.card, #other { > :is(.foo, #bar).active { color: red; & .title { color: blue; } } }',
		output: '.card, #other { > .foo, > #bar { &.active { color: red; & .title { color: blue; } } } }',
	},
	{
		code: '.card { > :is(&.foo, &#bar)::before { content: "test"; } }',
		output: '.card { > &.foo, > &#bar { &::before { content: "test"; } } }',
		settledOutput: '.card { > & { &.foo, &#bar { &::before { content: "test"; } } } }',
	},
	{
		code: '.card { > :is(&.foo, .bar)::before { content: "test"; } }',
		output: '.card { > &.foo, > .bar { &::before { content: "test"; } } }',
	},
	...['>', '+', '~'].flatMap(combinator => [
		{
			code: `.card { ${combinator} :is(.foo, &#bar).active { color: red; } }`,
			output: `.card { ${combinator} .foo, ${combinator} &#bar { &.active { color: red; } } }`,
		},
		{
			code: `.card { ${combinator} :is(&&.foo, .bar) .title { color: red; } }`,
			output: `.card { ${combinator} &&.foo, ${combinator} .bar { & .title { color: red; } } }`,
		},
	]),
	{
		code: '.card, #other { > :IS(&.foo, .bar).active { COLOR: RED !important; & .title { color: blue; } } }',
		output: '.card, #other { > &.foo, > .bar { &.active { COLOR: RED !important; & .title { color: blue; } } } }',
	},
	{
		code: String.raw`.card { > :is(\62 utton&.primary, \61 .foo)::before { content: "test"; } }`,
		output: String.raw`.card { > \62 utton&.primary, > \61 .foo { &::before { content: "test"; } } }`,
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: ['.card {', '  > :is(&.foo, .bar)::before {', '    content: "test";', '  }', '}'].join(lineBreak),
		output: ['.card {', '  > &.foo, > .bar {', '    &::before {', '      content: "test";', '    }', '  }', '}'].join(lineBreak),
	})),
	{
		code: '@media (color) { .card { @layer theme { > :is(.foo, #bar).active { color: red; } } } }',
		output: '@media (color) { .card { @layer theme { > .foo, > #bar { &.active { color: red; } } } } }',
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: ['.card {', '  > :is(.foo, #bar)::before {', '    content: "test";', '  }', '}'].join(lineBreak),
		output: ['.card {', '  > .foo, > #bar {', '    &::before {', '      content: "test";', '    }', '  }', '}'].join(lineBreak),
	})),
];

test({
	valid: [
		'.card { > :is(.foo, #bar) { color: red; } }',
		'.card { > :is(.foo, #bar):not(&) { color: red; } }',
		'@scope (.outer) { .card { > :is(.foo, #bar).active { color: red; } } }',
	],
	invalid: [
		{code: '.card { & > /* keep */ :is(.foo, #bar).active { color: red; } }', errors: [{messageId: 'prefer-nesting'}]},
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting'}]})),
		{code: '.card { > :is(&.foo, /* keep */ .bar).active { color: red; } }', errors: [{messageId: 'prefer-nesting'}]},
		{code: '.card { > :is(.foo, /* keep */ #bar).active { color: red; } }', errors: [{messageId: 'prefer-nesting'}]},
	],
});

nodeTest('relative groups reach stable output with other nesting rules', () => {
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
	for (const {code, output, settledOutput = output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, settledOutput, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {fixed: false, output: settledOutput, messages: []}, code);
	}

	const result = linter.verifyAndFix('.card > :is(.foo, #bar).active { color: red; }', config, {filename: 'test.css'});
	assert.equal(result.output, '.card { > .foo, > #bar { &.active { color: red; } } }');
	assert.deepEqual(result.messages, []);
	assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {fixed: false, output: result.output, messages: []});
});

nodeTest('relative group fixes converge when redundant nesting selectors are removed', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: Object.fromEntries([
			'prefer-nesting',
			'no-redundant-nesting-selector',
			'no-redundant-nested-style-rules',
		].map(name => [`cssicorn/${name}`, 'error'])),
	};
	const code = '.outer, #missing { & > :is(.foo:where(&), .bar:where(&)) button:hover { color: red; } }';
	const output = '.outer, #missing { > .foo:where(&), > .bar:where(&) { button:hover { color: red; } } }';
	const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
	assert.equal(result.output, output);
	assert.deepEqual(result.messages, []);
	assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []});
});
