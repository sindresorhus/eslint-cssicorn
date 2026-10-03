import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
	renamableRules,
	renameRule,
	replaceRuleId,
	replaceRuleIdInRulesIndex,
	sortReadmeRuleRows,
} from '../../scripts/rename-rule.js';

test('only source rules are offered for renaming', () => {
	assert.equal(renamableRules.includes('lowercase'), false);
	assert.equal(renamableRules.includes('no-zero-length-unit'), true);
	assert.equal(renamableRules.includes('prefer-short-hex-color'), true);
	assert.equal(renamableRules.includes('prefer-array-flat'), false);
});

test('renameRule validates names before changing files', async t => {
	const originalRename = fs.rename;
	t.after(() => {
		fs.rename = originalRename;
	});
	fs.rename = async () => {
		throw new Error('Attempted to rename a file.');
	};

	for (const [from, to, message] of [
		['prefer-array-flat', 'renamed-rule', 'Invalid rule name.'],
		['lowercase', 'lowercase-style', 'Rules without hyphens must be renamed manually to avoid changing unrelated code.'],
		['no-zero-length-unit', '123', 'Invalid rule name.'],
		['no-zero-length-unit', 'foo.bar', 'Invalid rule name.'],
		['no-zero-length-unit', '../foo', 'Invalid rule name.'],
		['no-zero-length-unit', undefined, 'Invalid rule name.'],
	]) {
		// eslint-disable-next-line no-await-in-loop
		await assert.rejects(renameRule(from, to), {message});
	}

	for (const to of ['renamed-rule', 'prefer-short-hex-colors', 'color']) {
		// eslint-disable-next-line no-await-in-loop
		await assert.rejects(renameRule('prefer-short-hex-color', to), {
			message: 'Attempted to rename a file.',
		});
	}
});

test('replaceRuleId only rewrites complete rule IDs', () => {
	const input = [
		'const MESSAGE_ID = \'prefer-array-flat\';',
		'\'cssicorn/prefer-array-flat\'',
		'./docs/rules/prefer-array-flat.md',
		'prefer-array-flat-map',
		'no-prefer-array-flat',
	].join('\n');

	assert.equal(
		replaceRuleId(input, 'prefer-array-flat', 'renamed-rule'),
		[
			'const MESSAGE_ID = \'renamed-rule\';',
			'\'cssicorn/renamed-rule\'',
			'./docs/rules/renamed-rule.md',
			'prefer-array-flat-map',
			'no-prefer-array-flat',
		].join('\n'),
	);
});

test('replaceRuleIdInRulesIndex only rewrites the exact export', () => {
	const input = [
		'export {default as \'prefer-array-flat-map\'} from \'./prefer-array-flat-map.js\';',
		'export {default as \'prefer-array-flat\'} from \'./prefer-array-flat.js\';',
	].join('\n');

	assert.equal(
		replaceRuleIdInRulesIndex(input, 'prefer-array-flat', 'renamed-rule'),
		[
			'export {default as \'prefer-array-flat-map\'} from \'./prefer-array-flat-map.js\';',
			'export {default as \'renamed-rule\'} from \'./renamed-rule.js\';',
		].join('\n'),
	);
});

for (const [from, to, input, output] of [
	['indent', 'indent-style', 'export {default as indent} from \'./indent.js\';', 'export {default as \'indent-style\'} from \'./indent-style.js\';'],
	['indent-style', 'indent', 'export {default as \'indent-style\'} from \'./indent-style.js\';', 'export {default as indent} from \'./indent.js\';'],
	['indent', 'indentation', 'export {default as indent} from \'./indent.js\';', 'export {default as indentation} from \'./indentation.js\';'],
	['indent-style', 'path3d', 'export {default as \'indent-style\'} from \'./indent-style.js\';', 'export {default as path3d} from \'./path3d.js\';'],
]) {
	test(`replaceRuleIdInRulesIndex renames ${from} to ${to}`, t => {
		const unrelated = 'export {default as \'indent-other\'} from \'./indent-other.js\';';
		assert.equal(replaceRuleIdInRulesIndex(`${input}\n${unrelated}`, from, to), `${output}\n${unrelated}`);
	});
}

test('sortReadmeRuleRows keeps the renamed row inside the rules table', () => {
	const input = [
		'# eslint-cssicorn',
		'',
		'<!-- begin auto-generated rules list -->',
		'',
		'| Name | Description |',
		'| :--- | :--- |',
		'| [alpha-rule](docs/rules/alpha-rule.md) | Alpha |',
		'| [zzz-rule](docs/rules/zzz-rule.md) | Throw |',
		'<!-- end auto-generated rules list -->',
		'',
		'## FAQ',
	].join('\n');

	assert.equal(
		sortReadmeRuleRows(input, 'zzz-rule'),
		[
			'# eslint-cssicorn',
			'',
			'<!-- begin auto-generated rules list -->',
			'',
			'| Name | Description |',
			'| :--- | :--- |',
			'| [alpha-rule](docs/rules/alpha-rule.md) | Alpha |',
			'| [zzz-rule](docs/rules/zzz-rule.md) | Throw |',
			'<!-- end auto-generated rules list -->',
			'',
			'## FAQ',
		].join('\n'),
	);
});
