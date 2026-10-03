import path from 'node:path';
import url from 'node:url';
import assert from 'node:assert/strict';
import test, {describe, it, snapshot} from 'node:test';
import css from '@eslint/css';
import {Linter, RuleTester} from 'eslint';
import plugin from '../../index.js';
import SnapshotRuleTester from './snapshot-rule-tester.js';

// Store the formatted snapshot strings as they are, in `test/snapshots/`.
snapshot.setDefaultSnapshotSerializers([value => value]);
snapshot.setResolveSnapshotPath(testFile => path.join(path.dirname(testFile), 'snapshots', `${path.basename(testFile)}.snapshot`));

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const normalizeTestCase = testCase => typeof testCase === 'string' ? {code: testCase} : testCase;

function normalizeInvalidTest(test) {
	if (test.code === test.output) {
		console.log(JSON.stringify(test, undefined, 2));
		throw new Error('Remove output if your test does not fix code.');
	}

	return {
		// Use `null` instead of `code` to get a better message
		// See https://github.com/eslint/eslint/blob/8a77b661bc921c3408bae01b3aa41579edfc6e58/lib/rule-tester/rule-tester.js#L847-L853

		output: JSON.parse('null'),
		...test,
	};
}

function assertNoManualEmptyFileTestCases(ruleId, testCases) {
	if (testCases.some(({code}) => code === '')) {
		throw new Error(`Do not add manual empty file test cases for \`${ruleId}\`. They are covered by the shared empty file test.`);
	}
}

// https://github.com/tc39/proposal-array-is-template-object
const isTemplateObject = value => Array.isArray(value?.raw);
// https://github.com/tc39/proposal-string-cooked
const cooked = (raw, ...substitutions) => String.raw({raw}, ...substitutions);

/*
Supported forms:

```js
only`code`;
only('code');
only({code: 'code'});
```
*/
function only(...arguments_) {
	if (isTemplateObject(arguments_[0])) {
		return {code: cooked(...arguments_), only: true};
	}

	return {...normalizeTestCase(arguments_[0]), only: true};
}

const getTestConfig = testerOptions => ({
	language: 'css/css',
	...testerOptions,
	plugins: {
		css,
		...testerOptions.plugins,
	},
});

class Tester {
	constructor(ruleId) {
		this.ruleId = ruleId;
		this.rule = plugin.rules[ruleId];
	}

	runEmptyFileTest() {
		const {ruleId, rule} = this;

		// Empty input should be a no-op for every rule.
		test(`empty file: ${ruleId}`, () => {
			const linter = new Linter();
			const messages = linter.verify(
				'',
				// Avoid a separate `{files}` config-array entry here. It makes ESLint merge an extra config for every empty-file smoke test.
				{
					files: ['**'],
					language: 'css/css',
					linterOptions: {
						reportUnusedDisableDirectives: 'off',
					},
					plugins: {
						css,
						'rule-to-test': {
							rules: {
								[ruleId]: rule,
							},
						},
					},
					rules: {
						[`rule-to-test/${ruleId}`]: 'error',
					},
				},
				{filename: 'index.css'},
			);

			assert.deepEqual(messages, []);
		});
	}

	runTest(tests) {
		const {ruleId, rule} = this;

		let {testerOptions = {}, valid, invalid} = tests;

		valid = valid.map(testCase => normalizeTestCase(testCase));
		invalid = invalid.map(testCase => normalizeInvalidTest(normalizeTestCase(testCase)));
		assertNoManualEmptyFileTestCases(ruleId, [...valid, ...invalid]);

		const testConfig = getTestConfig(testerOptions);

		const tester = new RuleTester(testConfig);

		return tester.run(
			ruleId,
			rule,
			{valid, invalid},
		);
	}

	snapshot(tests) {
		const {ruleId, rule} = this;
		let {testerOptions = {}, valid, invalid} = tests;

		valid = valid.map(testCase => normalizeTestCase(testCase));
		invalid = invalid.map(testCase => normalizeTestCase(testCase));
		assertNoManualEmptyFileTestCases(ruleId, [...valid, ...invalid]);

		const testConfig = getTestConfig(testerOptions);

		const tester = new SnapshotRuleTester(test, testConfig);
		return tester.run(ruleId, rule, {valid, invalid});
	}
}

function getTester(importMeta, ruleId = path.basename(url.fileURLToPath(importMeta.url), '.js')) {
	const tester = new Tester(ruleId);
	tester.runEmptyFileTest();

	const runTest = Tester.prototype.runTest.bind(tester);
	runTest.snapshot = Tester.prototype.snapshot.bind(tester);
	runTest.only = only;

	return {
		ruleId,
		rule: tester.rule,
		test: runTest,
	};
}

export {getTester};
