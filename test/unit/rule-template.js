import {spawnSync} from 'node:child_process';
import process from 'node:process';
import test from 'node:test';
import assert from 'node:assert/strict';
import renderRuleTemplate from '../../scripts/template/rule.js.template.js';

const cases = [
	{
		name: 'ordinary descriptions without fixes',
		description: 'Disallow ineffective properties.',
		fixableType: false,
		hasSuggestions: false,
	},
	{
		name: 'apostrophes with code fixes',
		description: 'Disallow properties that don\'t affect layout.',
		fixableType: 'code',
		hasSuggestions: false,
	},
	{
		name: 'double quotes with whitespace fixes',
		description: 'Disallow the "unicorn" identifier.',
		fixableType: 'whitespace',
		hasSuggestions: false,
	},
	{
		name: 'literal backslashes with suggestions',
		description: String.raw`Disallow the CSS escape \31 0.`,
		fixableType: false,
		hasSuggestions: true,
	},
	{
		name: 'backslashes and quotes with code fixes and suggestions',
		description: String.raw`Disallow "\31 0" when it doesn't need escaping.`,
		fixableType: 'code',
		hasSuggestions: true,
	},
	{
		name: 'line breaks with whitespace fixes and suggestions',
		description: 'Disallow ineffective properties.\nPreserve the description.',
		fixableType: 'whitespace',
		hasSuggestions: true,
	},
];

for (const {name, ...data} of cases) {
	test(`rule templates preserve ${name}`, () => {
		const source = renderRuleTemplate({
			id: 'example-rule',
			type: 'problem',
			...data,
		});
		const result = spawnSync(process.execPath, ['--input-type=module'], {
			input: `${source}\nconsole.log(JSON.stringify(config.meta));`,
			cwd: new URL('../../rules/', import.meta.url),
			encoding: 'utf8',
		});
		assert.equal(result.status, 0, result.stderr);
		const metadata = JSON.parse(result.stdout);
		assert.equal(metadata.docs.description, data.description);
		assert.equal(metadata.fixable, data.fixableType || undefined);
		assert.equal(metadata.hasSuggestions, data.hasSuggestions || undefined);
	});
}
