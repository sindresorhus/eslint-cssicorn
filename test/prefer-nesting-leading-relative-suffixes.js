import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = ['>', '+', '~'].map(combinator => ({
	code: `.outer { ${combinator} :is(.a:where(&), .b:where(&)) .title { color: red; } }`,
	output: `.outer { ${combinator} .a:where(&), ${combinator} .b:where(&) { & .title { color: red; } } }`,
}));

test({
	valid: ['>', '+', '~'].flatMap(combinator => ['&.card', '&&.card', ':where(&).card', ':not(&).card'].flatMap(parent => [
		`.outer { ${combinator} .a${parent}, ${combinator} .b${parent} { color: red; } }`,
		`.outer { ${combinator} .a${parent} { color: red; } ${combinator} .b${parent} { color: blue; } }`,
		`.outer { ${parent} {} ${combinator} .active${parent} { color: red; } }`,
		`.outer { ${parent} {} @media (color) { ${combinator} .active${parent} { color: red; } } }`,
	])),
	invalid: cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting'}]})),
});

nodeTest('leading combinator group fixes preserve their implicit ancestor and converge', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/prefer-nesting': 'error'}};
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
