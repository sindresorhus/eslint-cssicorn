import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const parents = [
	[':is(#1, .foo).a', '#real.b'],
	[':not(:is(#1, .foo)).a', '#real.b'],
	[':has(:is(#1, .foo)).a', '#real.b'],
	[':nth-child(odd of :is(#1, .foo)).a', '#real.b.c'],
	[':is(:has(#missing), .foo).a', '#real.b'],
];

test({
	valid: parents.flatMap(([first, second]) => [
		`.outer { ${first}, ${second} {} ${first} .title, ${second} .title { color: red; } }`,
		`.outer { ${first} .title, ${second} .title, ${first} .body, ${second} .body { color: red; } }`,
		`.outer { ${first}, ${second} {} @media (color) { ${first} .title, ${second} .title { color: red; } } }`,
	]),
	invalid: [
		{
			code: '.outer { .card:is(#1, .foo) {} .card:is(#1, .foo) .title { color: red; } }',
			output: '.outer { .card:is(#1, .foo) { & .title { color: red; } } }',
			errors: [{messageId: 'prefer-nesting/related-rules'}],
		},
		{
			code: '.outer { :is(#1, .foo).a, #real.b {} @media (color) { :is(#1, .foo).a, #real.b { color: red; } } }',
			output: '.outer { :is(#1, .foo).a, #real.b { @media (color) { color: red; } } }',
			errors: [{messageId: 'prefer-nesting/related-rules'}],
		},
	],
});

nodeTest('uncertain grouped parent specificity remains unchanged through repeated fixes', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/prefer-nesting': 'error'}};
	for (const [first, second] of parents) {
		const code = `.outer { ${first}, ${second} {} ${first} .title, ${second} .title { color: red; } }`;
		assert.deepEqual(linter.verifyAndFix(code, config, {filename: 'test.css'}), {fixed: false, output: code, messages: []});
	}
});
