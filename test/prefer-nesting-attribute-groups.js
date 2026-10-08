import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	...['i', 'I', String.raw`\69`].flatMap(flag => [
		{
			code: `.card { &:is([data-kind="CARD" ${flag}], .foo)::before { content: "test"; } }`,
			output: `.card { &[data-kind="CARD" ${flag}], &.foo { &::before { content: "test"; } } }`,
		},
		{
			code: `.card :is([data-kind="CARD" ${flag}], .foo) { color: red; }`,
			output: `.card { [data-kind="CARD" ${flag}], .foo { color: red; } }`,
		},
		{
			code: `:is([data-kind="CARD" ${flag}], #bar)::before { content: "test"; }`,
			output: `[data-kind="CARD" ${flag}], #bar { &::before { content: "test"; } }`,
		},
	]),
];

const retainedCases = ['s', 'S', String.raw`\73`, 'x'].map(flag => ({
	code: `:is([data-kind="CARD" ${flag}], .foo)::before { content: "test"; }`,
	output: `:is([data-kind="CARD" ${flag}], .foo) { &::before { content: "test"; } }`,
}));

const invalidFlagCases = ['i', 'I', String.raw`\69`].map(flag => ({
	code: `:is([data-kind ${flag}], .foo)::before { content: "test"; }`,
	output: `:is([data-kind ${flag}], .foo) { &::before { content: "test"; } }`,
}));

test({
	valid: [
		'@namespace ns url("https://example.com"); :is([ns|kind="CARD" i], .foo)::before { content: "test"; }',
	],
	invalid: [
		...[...cases, ...retainedCases, ...invalidFlagCases].map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting'}]})),
		{code: ':is([data-kind="CARD" i], /* keep */ .foo)::before { content: "test"; }', errors: [{messageId: 'prefer-nesting'}]},
	],
});

nodeTest('attribute groups reach stable output with other nesting rules', () => {
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
	for (const {code, output} of [...cases, ...retainedCases, ...invalidFlagCases]) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
