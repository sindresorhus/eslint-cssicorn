import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Linter} from 'eslint';
import rule from '../../scripts/internal-rules/no-source-code-parameter.js';

const linter = new Linter();
const configuration = {
	plugins: {internal: {rules: {'no-source-code-parameter': rule}}},
	rules: {'internal/no-source-code-parameter': 'error'},
};

for (const [name, code] of [
	['shorthand object properties', 'function getSource(sourceCode) { return {sourceCode}; }'],
	['concise arrow functions', 'const getSource = sourceCode => ({sourceCode});'],
	['parenthesized arrow parameters', 'const getSource = (sourceCode) => ({sourceCode});'],
	['multiple arrow parameters', 'const getSource = (sourceCode, options) => ({sourceCode});'],
	['async arrow functions', 'const getSource = async sourceCode => ({sourceCode});'],
	['comments inside parenthesized returns', 'const getSource = sourceCode => (/* before */{sourceCode}/* after */);'],
	['arrow functions passed to calls', 'const getSource = value => [value].map(sourceCode => ({sourceCode}))[0];'],
	['references captured by closures', 'function getSource(sourceCode) { const read = () => ({sourceCode}); return read(); }'],
	['comments around shorthand properties', 'function getSource(sourceCode) { return {/* before */sourceCode/* after */}; }'],
	['explicit object properties', 'function getSource(sourceCode) { return {sourceCode: sourceCode}; }'],
	['computed keys and member accesses', 'function getSource(sourceCode) { return {sourceCode, [sourceCode.text]: sourceCode.text}; }'],
]) {
	for (const messageId of ['suggestion/member-access', 'suggestion/destructuring-in-body', 'suggestion/destructuring-in-parameter']) {
		test(`${messageId} preserves ${name}`, async () => {
			const [message] = linter.verify(code, configuration);
			const {fix} = message.suggestions.find(suggestion => suggestion.messageId === messageId);
			const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
			const sourceCode = {text: 'a { color: red; }'};
			const result = await vm.runInNewContext(`${output}\ngetSource({sourceCode});`, {sourceCode});
			assert.equal(result.sourceCode, sourceCode);
			for (const comment of code.match(/\/\*[\s\S]*?\*\//gv) ?? []) {
				assert.equal(output.includes(comment), true, comment);
			}
		});
	}
}

for (const messageId of ['suggestion/member-access', 'suggestion/destructuring-in-body', 'suggestion/destructuring-in-parameter']) {
	test(`${messageId} preserves arrow functions at the start of the source`, () => {
		const code = 'sourceCode => ({sourceCode})';
		const [message] = linter.verify(code, configuration);
		const {fix} = message.suggestions.find(suggestion => suggestion.messageId === messageId);
		const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		const sourceCode = {text: 'a { color: red; }'};
		const getSource = vm.runInNewContext(output);
		assert.equal(getSource({sourceCode}).sourceCode, sourceCode);
	});

	test(`${messageId} preserves concise primitive return values`, () => {
		const code = 'const getSource = sourceCode => sourceCode.text;';
		const [message] = linter.verify(code, configuration);
		const {fix} = message.suggestions.find(suggestion => suggestion.messageId === messageId);
		const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		const sourceCode = {text: 'a { color: red; }'};
		const result = vm.runInNewContext(`${output}\ngetSource({sourceCode});`, {sourceCode});
		assert.equal(result, sourceCode.text);
	});
}
