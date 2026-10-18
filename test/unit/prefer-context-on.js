import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {Linter} from 'eslint';
import rule from '../../scripts/internal-rules/prefer-context-on.js';

const linter = new Linter();
const configuration = {
	plugins: {internal: {rules: {'prefer-context-on': rule}}},
	rules: {'internal/prefer-context-on': 'error'},
};

for (const code of [
	'const create = context => ({...listeners, Declaration() {}});',
	'const create = context => ({Declaration() {}, ...listeners});',
	'const create = context => { return {Declaration() {}, ...listeners}; };',
	'const create = context => ({Declaration, Rule() {}});',
	'const create = context => ({Rule() {}, Declaration});',
	'const create = context => ({Declaration() {}, [selector]: listener});',
	'const create = context => ({get Declaration() { return listener; }});',
	'const create = context => listeners;',
]) {
	test(`unsupported listeners are reported without a partial fix: ${code}`, () => {
		const result = linter.verifyAndFix(code, configuration);
		assert.equal(result.fixed, false);
		assert.equal(result.output, code);
		assert.equal(result.messages.length, 1);
		assert.equal(result.messages[0].ruleId, 'internal/prefer-context-on');
	});
}

for (const code of [
	'const create = context => ({Declaration(node) { return node; }});',
	'const create = context => { return {Declaration: function (node) { return node; }}; };',
	'function create(context) { return {Declaration: node => node}; }',
	'const listener = node => node; const create = context => ({\'Declaration\': listener});',
	'const create = context => ({\n// Before listener.\n/** Listener type. */\nDeclaration(node) { /* Inside listener. */ return node; }\n});',
]) {
	test(`explicit listeners are converted to working registrations: ${code}`, () => {
		const result = linter.verifyAndFix(code, configuration);
		assert.equal(result.fixed, true);
		assert.deepEqual(result.messages, []);
		const create = vm.runInNewContext(`${result.output}\ncreate;`);
		const registrations = [];
		create({
			on(...arguments_) {
				registrations.push(arguments_);
			},
		});
		assert.equal(registrations.length, 1);
		assert.equal(registrations[0][0], 'Declaration');
		assert.equal(registrations[0][1]('visited'), 'visited');
		for (const comment of code.match(/\/\/[^\n]*|\/\*[\s\S]*?\*\//gv) ?? []) {
			assert.equal(result.output.includes(comment), true, comment);
		}
	});
}
