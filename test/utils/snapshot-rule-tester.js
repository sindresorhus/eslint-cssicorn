import assert from 'node:assert/strict';
import {codeFrameColumns} from '@babel/code-frame';
import {Linter} from 'eslint';
import outdent from 'outdent';
import * as YAML from 'yaml';

const isPlainObject = value => value && Object.getPrototypeOf(value) === Object.prototype;

function serializeOptions(value) {
	return YAML.stringify(
		value,
		(key, value) => {
			if (
				Array.isArray(value)
				|| isPlainObject(value)
				|| typeof value === 'boolean'
				|| typeof value === 'number'
				|| typeof value === 'string'
				|| value === null
			) {
				return value;
			}

			throw new Error('Unsupported value');
		},
		{
			defaultKeyType: 'PLAIN',
			defaultStringType: 'QUOTE_SINGLE',
		},
	)
		.trimEnd();
}

// A simple version of `SourceCodeFixer.applyFixes`
// https://github.com/eslint/eslint/issues/14936#issuecomment-906746754
const applyFix = (code, {fix}) => `${code.slice(0, fix.range[0])}${fix.text}${code.slice(fix.range[1])}`;
const codeFrameColumnsOptions = {linesAbove: Infinity, linesBelow: Infinity};

function visualizeRange(text, location, message) {
	return codeFrameColumns(
		text,
		location,
		{
			...codeFrameColumnsOptions,
			message,
		},
	);
}

function visualizeEslintMessage(text, result) {
	const {line, column, endLine, endColumn, message} = result;
	const location = {
		start: {
			line,
			column: Math.max(0, column - 1),
		},
	};

	if (typeof endLine === 'number' && typeof endColumn === 'number') {
		location.end = {
			line: endLine,
			column: Math.max(0, endColumn - 1),
		};
	}

	return visualizeRange(text, location, message);
}

const printCode = code => codeFrameColumns(code, {start: {line: 0, column: 0}}, codeFrameColumnsOptions);
const getAdditionalProperties = (object, properties) =>
	Object.keys(object).filter(property => !properties.includes(property));

function normalizeTests(tests) {
	const additionalProperties = getAdditionalProperties(tests, ['valid', 'invalid']);
	if (additionalProperties.length > 0) {
		throw new Error(`Unexpected snapshot test properties: ${additionalProperties.join(', ')}`);
	}

	for (const type of ['valid', 'invalid']) {
		const cases = tests[type];

		for (const [index, testCase] of cases.entries()) {
			if (typeof testCase === 'string') {
				cases[index] = {code: testCase};
				continue;
			}

			const additionalProperties = getAdditionalProperties(
				testCase,
				['code', 'options', 'languageOptions', 'only'],
			);

			if (additionalProperties.length > 0) {
				throw new Error(`Unexpected ${type} snapshot test case properties: ${additionalProperties.join(', ')}`);
			}
		}
	}

	return tests;
}

function getVerifyConfig(ruleId, rule, testerConfig, testCase) {
	const {
		languageOptions = {},
		options = [],
	} = testCase;

	// https://github.com/eslint/eslint/blob/ee7f9e62102d3dd0b7581d1e88e41bce3385980a/lib/rule-tester/rule-tester.js#L501
	const pluginName = 'rule-to-test';

	// Avoid a separate `{files}` config-array entry here. It makes ESLint merge an extra config for every snapshot test case. Keep `files` on the real config so non-JS filenames still match.
	return {
		files: ['**'],
		...testerConfig,
		languageOptions: {...testerConfig.languageOptions, ...languageOptions},
		rules: {
			[`${pluginName}/${ruleId}`]: ['error', ...options],
		},
		plugins: {
			...testerConfig.plugins,
			[pluginName]: {
				rules: {
					[ruleId]: rule,
				},
			},
		},
		// https://github.com/eslint/eslint/blob/ee7f9e62102d3dd0b7581d1e88e41bce3385980a/lib/config/default-config.js#L46-L48
		linterOptions: {
			reportUnusedDisableDirectives: 'off',
		},
	};
}

const linter = new Linter();

function verify(code, verifyConfig) {
	const messages = linter.verify(code, verifyConfig, {filename: 'file.css'});

	// Missed `message`, #1923
	const invalidMessage = messages.find(({message}) => typeof message !== 'string');
	if (invalidMessage) {
		throw Object.assign(new Error('Unexpected message.'), {eslintMessage: invalidMessage});
	}

	const fatalError = messages.find(({fatal}) => fatal);
	if (fatalError) {
		const {line, column, message} = fatalError;
		throw new SyntaxError('\n' + codeFrameColumns(code, {start: {line, column: Math.max(0, column - 1)}}, {message}));
	}

	return messages;
}

export default class SnapshotRuleTester {
	constructor(test, testerConfig) {
		this.test = test;
		this.testerConfig = testerConfig;
	}

	run(ruleId, rule, tests) {
		const {test, testerConfig} = this;
		const {fixable} = rule.meta;

		const {valid, invalid} = normalizeTests(tests);

		for (const [index, testCase] of valid.entries()) {
			const {code: input, only} = testCase;
			const verifyConfig = getVerifyConfig(ruleId, rule, testerConfig, testCase);

			test(
				`valid(${index + 1}): ${input}`,
				{only},
				() => {
					const messages = verify(input, verifyConfig);
					assert.deepEqual(messages, [], 'Valid case should not have errors.');
				},
			);
		}

		for (const [index, testCase] of invalid.entries()) {
			const {code: input, options, only} = testCase;
			const verifyConfig = getVerifyConfig(ruleId, rule, testerConfig, testCase);
			const runVerify = code => verify(code, verifyConfig);

			test(
				`invalid(${index + 1}): ${input}`,
				{only},
				t => {
					const messages = runVerify(input);

					assert.notDeepEqual(messages, [], 'Invalid case should have at least one error.');

					const inputSnapshotParts = [];
					let shouldPrintCodeHead = false;

					if (Array.isArray(options)) {
						inputSnapshotParts.push(outdent`
							Options:
							${serializeOptions(options)}
						`);
						shouldPrintCodeHead = true;
					}

					inputSnapshotParts.push(shouldPrintCodeHead
						? outdent`
							Code:
							${printCode(input)}
						`
						: printCode(input));

					t.assert.snapshot(`\n${inputSnapshotParts.join('\n\n')}\n`);

					for (const [index, message] of messages.entries()) {
						const snapshotParts = [
							outdent`
								Message:
								${visualizeEslintMessage(input, message)}
							`,
						];

						if (fixable && message.fix) {
							const output = applyFix(input, message);
							if (output !== input) {
								runVerify(output);

								snapshotParts.push(outdent`
									Output:
									${printCode(output)}
								`);
							}
						}

						const {suggestions = []} = message;

						for (const [index, suggestion] of suggestions.entries()) {
							const output = applyFix(input, suggestion);
							assert.notEqual(output, input, 'Suggestion should provide different output.');

							runVerify(output);

							snapshotParts.push([
								outdent`
									Suggestion ${index + 1}/${suggestions.length}: ${suggestion.desc}:
									${printCode(output)}
								`,
							]);
						}

						t.assert.snapshot(`\n${snapshotParts.join('\n\n')}\n`);
					}
				},
			);
		}
	}
}
export {visualizeEslintMessage};
