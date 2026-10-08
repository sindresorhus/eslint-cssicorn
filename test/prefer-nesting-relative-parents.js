import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	...['>', '+', '~'].flatMap(combinator => ['.card', '&.card', '&&.card', '.card:where(&)'].map(parent => ({
		code: `.outer, #missing { ${combinator} ${parent} { color: red; } ${combinator} ${parent}.active { color: blue; } }`,
		output: `.outer, #missing { ${combinator} ${parent} { color: red; &.active { color: blue; } } }`,
	}))),
	...['>', '+', '~'].map(combinator => ({
		code: `.outer { ${combinator} .card:hover, ${combinator} .card:focus { color: red; } }`,
		output: `.outer { ${combinator} .card { &:hover, &:focus { color: red; } } }`,
	})),
	{
		code: '.outer { > .card:hover { color: red; } > .card:focus { color: blue; } }',
		output: '.outer { > .card { &:hover { color: red; } &:focus { color: blue; } } }',
	},
	{
		code: '.outer { > .card, + .panel {} > .card .title, + .panel .title { color: red; } }',
		output: '.outer { > .card, + .panel { & .title { color: red; } } }',
	},
	{
		code: '.outer { > &.card, &&.panel {} > &.card .title, &&.panel .title { color: red; } }',
		output: '.outer { > &.card, &&.panel { & .title { color: red; } } }',
	},
	{
		code: '.outer { > .card:where(&), .panel {} > .card:where(&).active, .panel.active { color: red; } }',
		output: '.outer { > .card:where(&), .panel { &.active { color: red; } } }',
	},
	{
		code: '.outer { > .card { color: red; } @media (color) { > .card::before { content: "test"; } } }',
		output: '.outer { > .card { color: red; @media (color) { &::before { content: "test"; } } } }',
	},
	{
		code: '@media (color) { .outer { > .card .title { color: red; } > .card .body { color: blue; &::before { content: "test"; } } } }',
		output: '@media (color) { .outer { > .card { & .title { color: red; } & .body { color: blue; &::before { content: "test"; } } } } }',
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: ['.outer {', '  > .card {', '    color: red;', '  }', '  > .card.active {', '    color: blue;', '  }', '}'].join(lineBreak),
		output: ['.outer {', '  > .card {', '    color: red;', '    &.active {', '      color: blue;', '    }', '  }', '}'].join(lineBreak),
	})),
];

test({
	valid: [
		'.outer { > &.card, &.panel {} > &.card .title, &.panel .title { color: red; } }',
		'.outer { > .card:where(&), .panel:where(&) {} > .card:where(&) .title, .panel:where(&) .title { color: red; } }',
		'.outer { > .card {} .card.active { color: red; } }',
		'.outer { > .card {} + .card.active { color: red; } }',
		'.outer { > &.card {} > &.card &.active { color: red; } }',
		'@scope (.page) { .outer { > .card {} > .card.active { color: red; } } }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
		{code: '.outer { > .card {} /* keep */ > .card.active { color: red; } }', errors: [{messageId: 'prefer-nesting/related-rules'}]},
	],
});

nodeTest('relative literal parents preserve ancestor counts and stable nested bodies', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/prefer-nesting': 'error'}};
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
