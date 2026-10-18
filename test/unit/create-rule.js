import fs from 'node:fs';
import {registerHooks} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import enquirer from 'enquirer';

const editorMockUrl = `data:text/javascript,${encodeURIComponent('export const calls = []; export default async (...arguments_) => { calls.push(arguments_); throw new Error(\'No editor.\'); };')}`;
const spawnMockUrl = `data:text/javascript,${encodeURIComponent('export const calls = []; export default async (...arguments_) => { calls.push(arguments_); };')}`;
const {calls: editorCalls} = await import(editorMockUrl);
const {calls: spawnCalls} = await import(spawnMockUrl);

for (const shouldOpenFiles of [false, true]) {
	test(`create-rule respects the editor confirmation ${shouldOpenFiles}`, async t => {
		const hooks = registerHooks({
			resolve(specifier, context, nextResolve) {
				if (specifier === 'open-editor' || specifier === 'nano-spawn') {
					return {url: specifier === 'open-editor' ? editorMockUrl : spawnMockUrl, shortCircuit: true};
				}

				return nextResolve(specifier, context);
			},
		});
		t.after(() => {
			hooks.deregister();
			editorCalls.length = 0;
			spawnCalls.length = 0;
		});

		const data = {
			id: 'fixture-rule',
			description: 'Enforce a fixture rule.',
			fixableType: 'code',
			type: 'suggestion',
			hasSuggestions: false,
		};
		t.mock.method(enquirer.prototype, 'ask', async function (question) {
			if (question.name) {
				this.answers[question.name] = question.type === 'confirm' ? shouldOpenFiles : data[question.name];
			}
		});
		t.mock.method(fs, 'existsSync', () => false);
		const copyFile = t.mock.method(fs.promises, 'copyFile', async () => {});
		const writeFile = t.mock.method(fs.promises, 'writeFile', async () => {});
		t.mock.method(console, 'log', () => {});
		await import(`../../scripts/create-rule.js?confirmation=${shouldOpenFiles}`);

		assert.equal(copyFile.mock.callCount(), 2);
		assert.equal(writeFile.mock.callCount(), 1);
		assert.equal(editorCalls.length, shouldOpenFiles ? 1 : 0);
		assert.deepEqual(spawnCalls.map(call => call[0]), shouldOpenFiles ? ['code'] : []);
	});
}
