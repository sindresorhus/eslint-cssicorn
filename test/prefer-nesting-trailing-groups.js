import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import {parse, toPlainObject} from '@eslint/css-tree';
import plugin from '../index.js';
import {getMaximumSpecificity, getRuleSelectorSpecificity} from '../rules/shared/css-selector-specificity.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');
const cases = [
	...['>', '+', '~'].flatMap(combinator => [
		{
			code: `.card ${combinator} :is(.title, .body) { color: red; }`,
			output: `.card { ${combinator} .title, ${combinator} .body { color: red; } }`,
		},
		{
			code: `.card${combinator}:is(h1,h2) { color: red; }`,
			output: `.card { ${combinator} h1, ${combinator} h2 { color: red; } }`,
		},
	]),
	{
		code: '.page .card > :is(.title, .body) { color: red; }',
		output: '.page .card { > .title, > .body { color: red; } }',
	},
	{
		code: '.outer { .card + :is(.title, .body) { color: red; } }',
		output: '.outer { .card { + .title, + .body { color: red; } } }',
	},
	{
		code: '.outer, #outer { &.card > :is(.title, .body) { color: red; } }',
		output: '.outer, #outer { &.card { > .title, > .body { color: red; } } }',
	},
	{
		code: ':where(article, table) ~ :is(h1, h2, h3, h4, h5, h6) { margin-top: 2rem; }',
		output: ':where(article, table) { ~ h1, ~ h2, ~ h3, ~ h4, ~ h5, ~ h6 { margin-top: 2rem; } }',
	},
	{
		code: String.raw`.card > :IS(.t\69 tle, .body) { COLOR: RED !important; }`,
		output: String.raw`.card { > .t\69 tle, > .body { COLOR: RED !important; } }`,
	},
	{
		code: '@media (color) { @layer theme { .card ~ :is(.title, .body) { color: red; } } }',
		output: '@media (color) { @layer theme { .card { ~ .title, ~ .body { color: red; } } } }',
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: ['.card > :is(.title, .body) {', '  color: red;', '}'].join(lineBreak),
		output: ['.card {', '  > .title, > .body {', '    color: red;', '  }', '}'].join(lineBreak),
	})),
];

test({
	valid: [
		...['>', '+', '~'].flatMap(combinator => [
			`.card ${combinator} :is(.title, #body) { color: red; }`,
			`.card ${combinator} :is(.title, :unknown) { color: red; }`,
			`.card ${combinator} :is(.context .title, .body) { color: red; }`,
			`.card ${combinator} :where(.title, .body) { color: red; }`,
		]),
		'.outer { .card > :is(&.title, &.body) { color: red; } }',
		'@scope (.outer) { .card > :is(.title, .body) { color: red; } }',
		'@namespace url("https://example.com"); .card > :is(.title, .body) { color: red; }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting'}]})),
		{
			...cases[0],
			options: [{checkSharedPrefixes: false}],
			errors: [{messageId: 'prefer-nesting'}],
		},
		...[
			'.card > :is(.title, /* keep */ .body) { color: red; }',
			'.card /* keep */ > :is(.title, .body) { color: red; }',
			'.card > :is(.title, .body) { /* keep */ color: red; }',
		].map(code => ({code, errors: [{messageId: 'prefer-nesting'}]})),
	],
});

nodeTest('trailing group fixes converge and preserve declaration specificity', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/prefer-nesting': ['error', {checkSharedPrefixes: false}]}};
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

	for (const {code, output} of cases) {
		assert.deepEqual(linter.verifyAndFix(code, config, {filename: 'test.css'}), {fixed: true, output, messages: []}, code);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
		assert.deepEqual(getDeclarationSpecificities(output), getDeclarationSpecificities(code), code);
	}
});
