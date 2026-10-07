import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	...['&.card', '&&.card'].flatMap(parent => ['', ' ', ' > ', ' + ', ' ~ '].map(combinator => ({
		code: `.outer, #missing { .theme.small${combinator}${parent}, .theme.large${combinator}${parent} { color: red; & .title { color: blue; } } }`,
		output: `.outer, #missing { ${parent} { .theme.small${combinator}&, .theme.large${combinator}& { color: red; & .title { color: blue; } } } }`,
	}))),
	...[':not(&)', ':is(&, .open)', ':where(&, .open)', ':nth-child(odd of &.open)', ':has(> &)'].map(reference => ({
		code: `.outer, #missing { .theme.small .card${reference}, .theme.large .card${reference} { color: red; } }`,
		output: `.outer, #missing { .card${reference} { .theme.small &, .theme.large & { color: red; } } }`,
	})),
	{
		code: '.outer { .theme.small &.card { color: red; } .theme.large &.card { color: blue; } }',
		output: '.outer { &.card { .theme.small & { color: red; } .theme.large & { color: blue; } } }',
	},
	{
		code: '.outer { .theme.small .card:not(&) { color: red; } .theme.large .card:not(&) { color: blue; } }',
		output: '.outer { .card:not(&) { .theme.small & { color: red; } .theme.large & { color: blue; } } }',
	},
	{
		code: '.outer { @media (color) { .theme.small &.card { color: red; } } @layer theme { .theme.large &.card { color: blue; } } }',
		output: '.outer { &.card { @media (color) { .theme.small & { color: red; } } @layer theme { .theme.large & { color: blue; } } } }',
	},
	{
		code: '.outer { .small.card, .large.card { color: red; } }',
		output: '.outer { .card { .small&, .large& { color: red; } } }',
	},
	{
		code: '.outer { .small.card { color: red; } .large.card { color: blue; } }',
		output: '.outer { .card { .small& { color: red; } .large& { color: blue; } } }',
	},
	{
		code: '.outer { button.card, input.card { color: red; } }',
		output: '.outer { .card { button&, input& { color: red; } } }',
	},
	{
		code: '.outer { .card { color: red; } .active.card .title { color: blue; } }',
		output: '.outer { .card { color: red; .active& .title { color: blue; } } }',
	},
	{
		code: '.outer { .card { color: red; } button:not(.disabled).card:hover { color: blue; } }',
		output: '.outer { .card { color: red; button&:not(.disabled):hover { color: blue; } } }',
	},
	...[' ', ' > ', ' + ', ' ~ '].map(combinator => ({
		code: `.outer { .theme${combinator}&.card, .other${combinator}&.card { color: red; } }`,
		output: `.outer { &.card { .theme${combinator}&, .other${combinator}& { color: red; } } }`,
	})),
	{
		code: '.outer { .theme &&.card { color: red; } .other &&.card { color: blue; } }',
		output: '.outer { &&.card { .theme & { color: red; } .other & { color: blue; } } }',
	},
	...[':not(&)', ':is(&, .open)', ':where(&, .open)', ':nth-child(odd of &.open)', ':has(> &)'].map(reference => ({
		code: `.outer, #missing { .theme .card${reference}, .other .card${reference} { color: red; & .title { color: blue; } } }`,
		output: `.outer, #missing { .card${reference} { .theme &, .other & { color: red; & .title { color: blue; } } } }`,
	})),
	{
		code: '.outer { .card:not(&) { color: red; } .theme .card:not(&).active { color: blue; } }',
		output: '.outer { .card:not(&) { color: red; .theme &.active { color: blue; } } }',
	},
	{
		code: '@media (color) { .outer { @layer theme { .small.card { color: red; } .large.card { color: blue; } } } }',
		output: '@media (color) { .outer { @layer theme { .card { .small& { color: red; } .large& { color: blue; } } } } }',
	},
	{
		code: String.raw`.outer { .sm\61 ll.c\61 rd, .l\61 rge.c\61 rd { COLOR: RED !important; } }`,
		output: String.raw`.outer { .c\61 rd { .sm\61 ll&, .l\61 rge& { COLOR: RED !important; } } }`,
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: ['.outer {', '  .small.card, .large.card {', '    color: red;', '  }', '}'].join(lineBreak),
		output: ['.outer {', '  .card {', '    .small&, .large& {', '      color: red;', '    }', '  }', '}'].join(lineBreak),
	})),
];

test({
	valid: [
		'.outer { .theme.small &.card, .theme.large &&.card { color: red; } }',
		'.outer { .theme.small&, .theme.large& { color: red; } }',
		'.outer { .theme.small :unknown(&).card, .theme.large :unknown(&).card { color: red; } }',
		':host { :host(&.card) {} :host(&.card):host(.small) { color: red; } }',
		':host { :host(.small):host(&.card), :host(.large):host(&.card) { color: red; } }',
		':host { :host-context(.small):host-context(&.card), :host-context(.large):host-context(&.card) { color: red; } }',
		':host { .small:where(:host(&), .card), .large:where(:host(&), .card) { color: red; } }',
		'.outer { .theme > .small.card, .other > .large.card { color: red; } }',
		'.outer { .card {} .theme > .active.card { color: red; } }',
		'.outer { .theme &.card, .other &&.card { color: red; } }',
		'.outer { .small:not(&).card, .large.card { color: red; } }',
		'.outer { .theme &, .other & { color: red; } }',
		'.outer { .theme :unknown(&).card, .other :unknown(&).card { color: red; } }',
		'@scope (.page) { .outer { .small.card, .large.card { color: red; } } }',
		'@namespace url("https://example.com"); .outer { .small.card, .large.card { color: red; } }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
		{code: '.outer { .theme.small &.card, /* keep */ .theme.large &.card { color: red; } }', errors: [{messageId: 'prefer-nesting/related-rules'}]},
		{code: '.outer { .small.card, /* keep */ .large.card { color: red; } }', errors: [{messageId: 'prefer-nesting/related-rules'}]},
	],
});

nodeTest('nested compound suffixes preserve parseable and stable fixes', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: Object.fromEntries([
			'prefer-nesting',
			'no-redundant-nested-style-rules',
			'no-declarations-after-nested-rules',
			'no-unscoped-nesting-selector',
		].map(name => [`cssicorn/${name}`, 'error'])),
	};
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
