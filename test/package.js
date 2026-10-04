import fs, {promises as fsAsync} from 'node:fs';
import path from 'node:path';
import test, {before} from 'node:test';
import assert from 'node:assert/strict';
import {ESLint} from 'eslint';
import {defineConfig} from 'eslint/config';
import eslintCssicorn from '../index.js';

let ruleFiles;

before(async () => {
	const files = await fsAsync.readdir('rules');
	ruleFiles = files.filter(file => path.extname(file) === '.js' && path.basename(file) !== 'index.js');
});

test('Every rule is defined in index file in alphabetical order', () => {
	for (const file of ruleFiles) {
		const name = path.basename(file, '.js');
		assert.ok(eslintCssicorn.rules[name], `'${name}' is not exported in 'index.js'`);

		const documentationPath = path.join('docs/rules', `${name}.md`);
		const testPath = path.join('test', file);

		assert.ok(fs.existsSync(documentationPath), `There is no documentation for '${name}'`);
		assert.ok(fs.existsSync(testPath), `There are no tests for '${name}'`);
	}

	assert.equal(
		Object.keys(eslintCssicorn.rules).length,
		ruleFiles.length,
		'There are more exported rules than rule files.',
	);

	for (const [configName, config] of Object.entries(eslintCssicorn.configs)) {
		assert.equal(
			Object.keys(config.rules).length,
			ruleFiles.length,
			`The ${configName} config does not list every rule.`,
		);
	}
});

test('Every rule only supports CSS', () => {
	for (const [name, rule] of Object.entries(eslintCssicorn.rules)) {
		assert.deepEqual(rule.meta.languages, ['css/css'], `'${name}' should only support CSS.`);
	}
});

test('validate configuration', async () => {
	const results = await Promise.all(Object.entries(eslintCssicorn.configs).map(async ([name, config]) => {
		const eslint = new ESLint({
			baseConfig: config,
			overrideConfigFile: true,
		});

		const result = await eslint.calculateConfigForFile('dummy.css');

		return {name, config, result};
	}));

	for (const {name, config, result} of results) {
		assert.deepEqual(
			Object.keys(result.rules),
			Object.keys(config.rules),
			`Configuration for "${name}" is invalid.`,
		);
	}
});

test('preset configs only apply to CSS files', () => {
	for (const config of Object.values(eslintCssicorn.configs)) {
		assert.deepEqual(config.files, ['**/*.css']);
		assert.equal(config.language, 'css/css');
	}
});

test('all config works on its own', async () => {
	const eslint = new ESLint({
		baseConfig: eslintCssicorn.configs.all,
		overrideConfigFile: true,
	});

	const [result] = await eslint.lintText('a { word-wrap: break-word; }', {filePath: 'file.css'});
	assert.equal(result.messages.some(message => message.ruleId === 'cssicorn/no-deprecated-features'), true);
});

test('recommended config works with defineConfig', async () => {
	const eslint = new ESLint({
		baseConfig: defineConfig({
			files: ['**/*.css'],
			plugins: {
				cssicorn: eslintCssicorn,
			},
			extends: [
				'cssicorn/recommended',
			],
		}),
		overrideConfigFile: true,
	});

	const [result] = await eslint.lintText('a { width: 0px; }', {filePath: 'file.css'});
	assert.equal(result.messages.some(message => message.ruleId === 'cssicorn/no-zero-length-unit'), true);
});

test('unopinionated config reports unnecessary :is() wrappers', async () => {
	const eslint = new ESLint({
		baseConfig: eslintCssicorn.configs.unopinionated,
		overrideConfigFile: true,
	});

	const [result] = await eslint.lintText(':is(.active) { color: red; }', {filePath: 'file.css'});
	assert.equal(result.messages.some(message => message.ruleId === 'cssicorn/no-useless-is'), true);
});

test('unopinionated config enables prefer-clamp', async () => {
	const eslint = new ESLint({
		baseConfig: eslintCssicorn.configs.unopinionated,
		overrideConfigFile: true,
	});

	const [result] = await eslint.lintText('a { width: max(10px, min(5vw, 100px)); }', {filePath: 'file.css'});
	assert.equal(result.messages.some(message => message.ruleId === 'cssicorn/prefer-clamp'), true);
});

test('Every rule has valid meta.type', () => {
	const validTypes = ['problem', 'suggestion', 'layout'];

	for (const file of ruleFiles) {
		const name = path.basename(file, '.js');
		const rule = eslintCssicorn.rules[name];

		assert.equal(rule.meta !== null && rule.meta !== undefined, true, `${name} has no meta`);
		assert.equal(typeof rule.meta.type, 'string', `${name} meta.type is not string`);
		assert.equal(validTypes.includes(rule.meta.type), true, `${name} meta.type is not one of [${validTypes.join(', ')}]`);
	}
});

test('Every rule file has the appropriate contents', () => {
	for (const ruleFile of ruleFiles) {
		const ruleName = path.basename(ruleFile, '.js');
		const rulePath = path.join('rules', `${ruleName}.js`);
		const ruleContents = fs.readFileSync(rulePath, 'utf8');

		assert.match(
			ruleContents,
			// TODO: Use `CssicornRule` for all rules.
			/\/\*\*\s*@type \{(?:CssicornRule|(?:import\('eslint'\)|ESLint)\.Rule\.RuleModule)\}\s*\*\//,
			`${ruleName} includes jsdoc comment for rule type`,
		);
	}
});

test('Every rule has a doc with the appropriate content', () => {
	for (const ruleFile of ruleFiles) {
		const ruleName = path.basename(ruleFile, '.js');
		const documentPath = path.join('docs/rules', `${ruleName}.md`);
		const documentContents = fs.readFileSync(documentPath, 'utf8');

		// Check for examples.
		assert.equal(documentContents.includes('## Examples'), true, `${ruleName} includes '## Examples' examples section`);
	}
});

test('Plugin should have metadata', () => {
	assert.equal(typeof eslintCssicorn.meta.name, 'string');
	assert.equal(typeof eslintCssicorn.meta.version, 'string');
});

// Rules that cannot work well in normal projects. Every other rule belongs in `recommended`.
const RULES_NOT_RECOMMENDED = new Set([
	// Enforces file-local layer contracts that may not describe modular stylesheet architecture.
	'consistent-layer-order',
	// Only sees `@keyframes` in the same file.
	'no-unknown-animations',
	// Enforces a source order convention, and intentional "specific before general" ordering is common.
	'no-descending-specificity',
]);

test('Every rule is recommended unless listed as an exception', () => {
	for (const [name, rule] of Object.entries(eslintCssicorn.rules)) {
		assert.equal(Boolean(rule.meta.docs.recommended), !RULES_NOT_RECOMMENDED.has(name), `'${name}' has the wrong recommended level.`);
	}
});

test('rule.meta.docs.recommended should be synchronized with presets', () => {
	for (const [name, rule] of Object.entries(eslintCssicorn.rules)) {
		const {recommended} = rule.meta.docs;
		assert.equal(typeof recommended === 'boolean' || recommended === 'unopinionated', true, `meta.docs.recommended in '${name}' rule should be a boolean or 'unopinionated'.`);

		const recommendedSeverity = eslintCssicorn.configs.recommended.rules[`cssicorn/${name}`];
		assert.equal(recommendedSeverity, recommended ? 'error' : 'off', `'${name}' rule should have the correct severity in the recommended config.`);

		const unopinionatedSeverity = eslintCssicorn.configs.unopinionated.rules[`cssicorn/${name}`];
		assert.equal(unopinionatedSeverity, recommended === 'unopinionated' ? 'error' : 'off', `'${name}' rule should have the correct severity in the unopinionated config.`);
	}
});
