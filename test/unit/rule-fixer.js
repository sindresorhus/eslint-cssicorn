import test from 'node:test';
import assert from 'node:assert/strict';
import {Linter} from 'eslint';
import css from '@eslint/css';
import {toEslintRules} from '../../rules/rule/index.js';
import toEslintRuleFixer from '../../rules/rule/to-eslint-rule-fixer.js';

for (const kind of ['autofix', 'suggestion']) {
	test(`ordinary ${kind} can abort without crashing or changing the source`, () => {
		const rule = {
			meta: {
				type: 'suggestion',
				fixable: 'code',
				hasSuggestions: true,
				languages: ['css/css'],
				messages: {problem: 'Keep this declaration.', suggestion: 'Replace this value.'},
			},
			create(context) {
				context.on('Identifier', node => {
					const fix = (fixer, {abort}) => abort();
					return {
						node,
						messageId: 'problem',
						...(kind === 'autofix' ? {fix} : {suggest: [{messageId: 'suggestion', fix}]}),
					};
				});
			},
		};
		const config = {
			files: ['**/*.css'],
			language: 'css/css',
			plugins: {css, test: {rules: toEslintRules({abort: rule})}},
			rules: {'test/abort': 'error'},
		};
		const code = 'a { color: red; }';
		const result = new Linter().verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, code);
		assert.equal(result.fixed, false);
		assert.equal(result.messages.length, 1);
		assert.equal(result.messages[0].message, 'Keep this declaration.');
		assert.equal(result.messages[0].fix, undefined);
		assert.equal(result.messages[0].suggestions, undefined);
	});
}

test('aborting a generator discards previously yielded edits', () => {
	const fix = toEslintRuleFixer(function * (fixer, {abort}) {
		yield {range: [0, 1], text: 'replacement'};
		abort();
	});
	assert.deepEqual(fix({}), []);
});

test('ordinary fix errors propagate', () => {
	const error = new Error('Unexpected fix failure.');
	const fix = toEslintRuleFixer(() => {
		throw error;
	});
	assert.throws(() => fix({}), error);
});
