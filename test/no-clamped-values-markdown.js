import assert from 'node:assert/strict';
import test from 'node:test';
import {ESLint} from 'eslint';
import markdown from '@eslint/markdown';
import cssicorn from '../index.js';

test('Markdown configuration reports clamped CSS values at their original location', async () => {
	const eslint = new ESLint({
		overrideConfigFile: true,
		baseConfig: [
			{
				files: ['**/*.md'],
				plugins: {markdown},
				language: 'markdown/commonmark',
				processor: 'markdown/markdown',
			},
			cssicorn.configs.recommended,
		],
	});
	const code = [
		'# CSS example',
		'',
		'```text',
		'a { opacity: 50; }',
		'```',
		'',
		'```css',
		'a {',
		'/* eslint-disable-next-line cssicorn/no-clamped-values -- Intentional clamping. */',
		'opacity: 50;',
		'filter: grayscale(50);',
		'}',
		'```',
	].join('\n');
	const [result] = await eslint.lintText(code, {filePath: 'docs/example.md'});
	assert.deepEqual(result.messages.map(({ruleId, message, line, column, endLine, endColumn}) => ({
		ruleId, message, line, column, endLine, endColumn,
	})), [
		{
			ruleId: 'cssicorn/no-clamped-values',
			message: '\'grayscale() amount\' evaluates to 50, which the browser clamps to 1. Did you mean a percentage?',
			line: 11,
			column: 19,
			endLine: 11,
			endColumn: 21,
		},
	]);
});
