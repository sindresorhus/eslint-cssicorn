import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import {parse, toPlainObject} from '@eslint/css-tree';
import plugin from '../index.js';
import {getMaximumSpecificity, getRuleSelectorSpecificity} from '../rules/shared/css-selector-specificity.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	{
		code: '.card { &:is(.foo, #bar)::before { content: "test"; } }',
		output: '.card { &.foo, &#bar { &::before { content: "test"; } } }',
	},
	{
		code: '.card { &:is(.foo, #bar) & .title { color: red; } }',
		output: '.card { &:is(.foo, #bar) & { & .title { color: red; } } }',
	},
	{
		code: '.card { &:is(.context > .foo, #bar) & .title { color: red; } }',
		output: '.card { &:is(.context > .foo, #bar) & { & .title { color: red; } } }',
	},
	{
		code: '.card { &:is(.foo, .bar).active { color: red; } }',
		output: '.card { &.foo, &.bar { &.active { color: red; } } }',
	},
	{
		code: '.card { &:is(.foo, #bar) > .title { color: red; } }',
		output: '.card { &.foo, &#bar { > .title { color: red; } } }',
	},
	...[' ', ' + ', ' ~ '].map(combinator => ({
		code: `.card { &:is(.foo, #bar)${combinator}.title { color: red; } }`,
		output: `.card { &.foo, &#bar { ${combinator === ' ' ? '& ' : combinator.trimStart()}.title { color: red; } } }`,
	})),
	{
		code: '.card { &:IS(.foo, #bar):hover { COLOR: RED !important; } }',
		output: '.card { &.foo, &#bar { &:hover { COLOR: RED !important; } } }',
	},
	{
		code: String.raw`.card { &:is(.f\6f o, #b\61 r)::before { content: "test"; } }`,
		output: String.raw`.card { &.f\6f o, &#b\61 r { &::before { content: "test"; } } }`,
	},
	{
		code: '.card { &:is(.foo.active, [data-kind="&"])::before { content: "test"; } }',
		output: '.card { &.foo.active, &[data-kind="&"] { &::before { content: "test"; } } }',
	},
	{
		code: '.card { &:is(:hover, :focus) svg { fill: red; } }',
		output: '.card { &:hover, &:focus { & svg { fill: red; } } }',
	},
	{
		code: '.card { &:is(div, button)::before { content: "test"; } }',
		output: '.card { div&, button& { &::before { content: "test"; } } }',
	},
	{
		code: '.card { &:is(button.primary, input[data-kind="submit"])::before { content: "test"; } }',
		output: '.card { button&.primary, input&[data-kind="submit"] { &::before { content: "test"; } } }',
	},
	{
		code: '.card { &:is(*, .foo, #bar).active { color: red; } }',
		output: '.card { *&, &.foo, &#bar { &.active { color: red; } } }',
	},
	{
		code: String.raw`.card { &:is(\64 iv.foo, \62 utton)::before { content: "test"; } }`,
		output: String.raw`.card { \64 iv&.foo, \62 utton& { &::before { content: "test"; } } }`,
	},
	{
		code: String.raw`.card { &:is(\61 .foo, button)::before { content: "test"; } }`,
		output: String.raw`.card { \61 &.foo, button& { &::before { content: "test"; } } }`,
	},
	{
		code: '.card { &:is(.foo > .bar, #baz).active { color: red; } }',
		output: '.card { .foo > &.bar, &#baz { &.active { color: red; } } }',
	},
	...[' ', ' > ', ' + ', ' ~ '].map(combinator => ({
		code: `.card { &:is(.context${combinator}.foo, #bar)::before { content: "test"; } }`,
		output: `.card { .context${combinator}&.foo, &#bar { &::before { content: "test"; } } }`,
	})),
	{
		code: '.card { &:is(.context > button.primary, .panel input[data-kind="SUBMIT" i]) .title { color: red; } }',
		output: '.card { .context > button&.primary, .panel input&[data-kind="SUBMIT" i] { & .title { color: red; } } }',
	},
	{
		code: '.card { &:is(.context > *, .panel .foo).active { color: red; } }',
		output: '.card { .context > *&, .panel &.foo { &.active { color: red; } } }',
	},
	{
		code: String.raw`.card { &:is(.c\6f ntext > \62 utton.primary, .panel \61 .foo)::before { content: "test"; } }`,
		output: String.raw`.card { .c\6f ntext > \62 utton&.primary, .panel \61 &.foo { &::before { content: "test"; } } }`,
	},
	{
		code: '.outer, #outer { .card { &:is(.context > .foo, #bar).active { color: red; & .title { color: blue; } } } }',
		output: '.outer, #outer { .card { .context > &.foo, &#bar { &.active { color: red; & .title { color: blue; } } } } }',
	},
	{
		code: '.card { &:IS(.context > .foo, #bar).active { COLOR: RED !important; } }',
		output: '.card { .context > &.foo, &#bar { &.active { COLOR: RED !important; } } }',
	},
	...['.foo > :unknown', '.foo > [data-kind="CARD" s]'].map(argument => ({
		code: `.card { &:is(${argument}, #bar).active { color: red; } }`,
		output: `.card { &:is(${argument}, #bar) { &.active { color: red; } } }`,
	})),
	{
		code: '.card { &:where(.context > .foo, #bar).active { color: red; } }',
		output: '.card { &:where(.context > .foo, #bar) { &.active { color: red; } } }',
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: ['.card {', '  &:is(.context > .foo, #bar)::before {', '    content: "test";', '  }', '}'].join(lineBreak),
		output: ['.card {', '  .context > &.foo, &#bar {', '    &::before {', '      content: "test";', '    }', '  }', '}'].join(lineBreak),
	})),
	{
		code: '.card { &:is(.foo, :unknown)::before { content: "test"; } }',
		output: '.card { &:is(.foo, :unknown) { &::before { content: "test"; } } }',
	},
	{
		code: '.card { &:is(.foo, [data-kind="CARD" i])::before { content: "test"; } }',
		output: '.card { &.foo, &[data-kind="CARD" i] { &::before { content: "test"; } } }',
	},
	{
		code: '.card { &:where(.foo, #bar)::before { content: "test"; } }',
		output: '.card { &:where(.foo, #bar) { &::before { content: "test"; } } }',
	},
	{
		code: '.card { &:is(&.foo, &#bar)::before { content: "test"; } }',
		output: '.card { &&.foo, &&#bar { &::before { content: "test"; } } }',
		settledOutput: '.card { && { &.foo, &#bar { &::before { content: "test"; } } } }',
	},
	...[' ', ' > ', ' + ', ' ~ '].map(combinator => ({
		code: `.card { &:is(&${combinator}.foo, .context > &#bar).active { color: red; } }`,
		output: `.card { &${combinator}&.foo, .context > &&#bar { &.active { color: red; } } }`,
	})),
	{
		code: '.card { &:is(.context > &.foo, &&#bar) .title { color: red; } }',
		output: '.card { .context > &&.foo, &&&#bar { & .title { color: red; } } }',
	},
	{
		code: '.card { &:is(.context > button&.primary, .panel input&[data-kind="SUBMIT" i])::before { content: "test"; } }',
		output: '.card { .context > button&&.primary, .panel input&&[data-kind="SUBMIT" i] { &::before { content: "test"; } } }',
	},
	{
		code: String.raw`.card { &:is(.context > \62 utton&.primary, \61 &.foo)::before { content: "test"; } }`,
		output: String.raw`.card { .context > \62 utton&&.primary, \61 &&.foo { &::before { content: "test"; } } }`,
	},
	{
		code: '.outer, #outer { .card { &:is(& > .foo, .context > &#bar).active { color: red; & .title { color: blue; } } } }',
		output: '.outer, #outer { .card { & > &.foo, .context > &&#bar { &.active { color: red; & .title { color: blue; } } } } }',
	},
	{
		code: '@media (color) { .card { @layer theme { &:IS(&.foo, &#bar).active { COLOR: RED !important; } } } }',
		output: '@media (color) { .card { @layer theme { &&.foo, &&#bar { &.active { COLOR: RED !important; } } } } }',
		settledOutput: '@media (color) { .card { @layer theme { && { &.foo, &#bar { &.active { COLOR: RED !important; } } } } } }',
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: ['.card {', '  &:is(& > .foo, &#bar)::before {', '    content: "test";', '  }', '}'].join(lineBreak),
		output: ['.card {', '  & > &.foo, &&#bar {', '    &::before {', '      content: "test";', '    }', '  }', '}'].join(lineBreak),
	})),
	{
		code: '.card { &:is(&.foo, .bar)::before { content: "test"; } }',
		output: '.card { &&.foo, &.bar { &::before { content: "test"; } } }',
	},
	...[' ', ' > ', ' + ', ' ~ '].map(combinator => ({
		code: `.card { &:is(&${combinator}.foo, #bar).active { color: red; } }`,
		output: `.card { &${combinator}&.foo, &#bar { &.active { color: red; } } }`,
	})),
	{
		code: '.card { &:is(.context > &.foo, #bar).active { color: red; } }',
		output: '.card { .context > &&.foo, &#bar { &.active { color: red; } } }',
	},
	{
		code: '.card { &:is(.foo, &#bar) .title { color: red; } }',
		output: '.card { &.foo, &&#bar { & .title { color: red; } } }',
	},
	{
		code: '.card, #other { &:is(button&.primary, input[data-kind="SUBMIT" i])::before { content: "test"; & .title { color: blue; } } }',
		output: '.card, #other { button&&.primary, input&[data-kind="SUBMIT" i] { &::before { content: "test"; & .title { color: blue; } } } }',
	},
	{
		code: String.raw`.card { &:is(\62 utton&.primary, \61 .foo)::before { content: "test"; } }`,
		output: String.raw`.card { \62 utton&&.primary, \61 &.foo { &::before { content: "test"; } } }`,
	},
	{
		code: '.card { :is(&.foo, &#bar)::before { content: "test"; } }',
		output: '.card { &.foo, &#bar { &::before { content: "test"; } } }',
	},
	{
		code: '.card { :is(&.foo, .bar)::before { content: "test"; } }',
		output: '.card { :is(&.foo, .bar) { &::before { content: "test"; } } }',
	},
	{
		code: '.card { :is(&&.foo, &#bar)::before { content: "test"; } }',
		output: '.card { &&.foo, &#bar { &::before { content: "test"; } } }',
	},
	{
		code: '.card { &:is(.foo, #bar):is(.active, .open)::before { content: "test"; } }',
		output: '.card { &.foo, &#bar { &:is(.active, .open)::before { content: "test"; } } }',
		settledOutput: '.card { &.foo, &#bar { &.active, &.open { &::before { content: "test"; } } } }',
	},
	{
		code: '.card, #other { &:is(.foo, #bar).active { color: red; & .title { color: blue; } } }',
		output: '.card, #other { &.foo, &#bar { &.active { color: red; & .title { color: blue; } } } }',
	},
	{
		code: '@media (color) { .card { @layer theme { &:is(.foo, #bar)::before { content: "test"; } } } }',
		output: '@media (color) { .card { @layer theme { &.foo, &#bar { &::before { content: "test"; } } } } }',
	},
	...['\n', '\r\n'].flatMap(lineBreak => ['\t', '  '].map(indentation => ({
		code: [
			'.card {',
			`${indentation}&:is(.foo, #bar)::before {`,
			`${indentation.repeat(2)}content: "test";`,
			`${indentation}}`,
			'}',
		].join(lineBreak),
		output: [
			'.card {',
			`${indentation}&.foo, &#bar {`,
			`${indentation.repeat(2)}&::before {`,
			`${indentation.repeat(3)}content: "test";`,
			`${indentation.repeat(2)}}`,
			`${indentation}}`,
			'}',
		].join(lineBreak),
	}))),
];

test({
	valid: [
		'.card { &:is(.foo, #bar) { color: red; } }',
		'.card { &:where(.foo, #bar) { color: red; } }',
		'.card { &:is(.foo, #bar):not(&) { color: red; } }',
		'.card { &:is(.context > .foo, #bar) { color: red; } }',
		'.card { &:is(.foo, :unknown(&))::before { content: "test"; } }',
		String.raw`.card { &:\69 s(.foo, #bar)::before { content: "test"; } }`,
		'@scope (.outer) { .card { &:is(.foo, #bar)::before { content: "test"; } } }',
		'@namespace url("https://example.com"); .card { &:is(.foo, #bar)::before { content: "test"; } }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting'}]})),
		...[
			'.card { &:is(&.foo, /* keep */ .bar)::before { content: "test"; } }',
			'.card { &:is(& > /* keep */ .foo, &#bar)::before { content: "test"; } }',
			'.card { &:is(.context > /* keep */ .foo, #bar)::before { content: "test"; } }',
			'.card { &:is(.foo, /* keep */ #bar)::before { content: "test"; } }',
			'.card { &:is(.foo, #bar)::before { /* keep */ content: "test"; } }',
		].map(code => ({code, errors: [{messageId: 'prefer-nesting'}]})),
	],
});

nodeTest('attached groups reach the fully nested output', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/prefer-nesting': 'error'}};
	const result = linter.verifyAndFix('.card:is(.foo, #bar)::before { content: "test"; }', config, {filename: 'test.css'});
	assert.equal(result.output, cases[0].output);
	assert.deepEqual(result.messages, []);
	assert.equal(linter.verifyAndFix(result.output, config, {filename: 'test.css'}).fixed, false);
});

nodeTest('attached group fixes reparse and converge with other nesting rules', () => {
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
});

nodeTest('attached group fixes preserve declaration specificity through every nesting level', () => {
	const getDeclarationSpecificities = code => {
		const declarations = [];
		const visit = (node, specificity) => {
			if (node.type === 'Rule') {
				specificity = getMaximumSpecificity(node.prelude.children.map(selector => getRuleSelectorSpecificity(selector, specificity)));
			} else if (node.type === 'Declaration') {
				declarations.push({property: node.property, specificity});
			}

			for (const child of node.block?.children ?? node.children ?? []) {
				visit(child, specificity);
			}
		};

		visit(toPlainObject(parse(code)), [0, 0, 0]);
		return declarations;
	};

	assert.deepEqual(getDeclarationSpecificities(cases[0].code), [{property: 'content', specificity: [1, 1, 1]}]);
	for (const {code, output, settledOutput = output} of cases) {
		assert.deepEqual(getDeclarationSpecificities(settledOutput), getDeclarationSpecificities(code), code);
	}
});
