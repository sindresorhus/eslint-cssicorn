import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {Linter} from 'eslint';
import rule from '../../scripts/internal-rules/fix-snapshot-test.js';

const linter = new Linter();
const configuration = {
	plugins: {internal: {rules: {'fix-snapshot-test': rule}}},
	rules: {'internal/fix-snapshot-test': 'error'},
};

for (const object of [
	'{code: /* Explain this case. */ \'a { color: red; }\'}',
	'{code /* Explain this case. */: \'a { color: red; }\'}',
	'{code: // Explain this case.\n\'a { color: red; }\'}',
	'{code // Explain this case.\n: \'a { color: red; }\'}',
	'{/* Explain this case. */ code: \'a { color: red; }\'}',
	'{code: \'a { color: red; }\' /* Explain this case. */}',
	'{// Explain this case.\ncode: \'a { color: red; }\'}',
	'{code: \'a { color: red; }\' // Explain this case.\n}',
	'{code: (/* Explain this case. */ \'a { color: red; }\')}',
]) {
	test(`unwrapping snapshot code objects keeps comments outside the retained value: ${object}`, () => {
		const code = `test.snapshot({valid: [], invalid: [${object}]});`;
		const result = linter.verifyAndFix(code, configuration);
		assert.equal(result.fixed, false);
		assert.equal(result.output, code);
		assert.equal(result.messages.length, 1);
		assert.equal(result.messages[0].messageId, 'use-string');
	});
}

for (const [object, output] of [
	['{code: \'a { color: red; }\'}', '\'a { color: red; }\''],
	['{code: \'a\' /* Preserve this comment. */ + \' { color: red; }\'}', '\'a\' /* Preserve this comment. */ + \' { color: red; }\''],
	['{code: \'a\' + // Preserve this comment.\n\' { color: red; }\'}', '\'a\' + // Preserve this comment.\n\' { color: red; }\''],
	['{code: [\'a\', /* Preserve this comment. */ \'{ color: red; }\'].join(\' \')}', '[\'a\', /* Preserve this comment. */ \'{ color: red; }\'].join(\' \')'],
]) {
	test(`snapshot code objects still unwrap when their value is retained: ${object}`, () => {
		const code = `test.snapshot({valid: [], invalid: [${object}]});`;
		const result = linter.verifyAndFix(code, configuration);
		assert.equal(result.fixed, true);
		assert.equal(result.output, `test.snapshot({valid: [], invalid: [${output}]});`);
		assert.deepEqual(result.messages, []);
		let testCases;
		vm.runInNewContext(result.output, {
			test: {
				snapshot(cases) {
					testCases = cases;
				},
			},
		});
		assert.equal(testCases.invalid[0], 'a { color: red; }');
	});
}
