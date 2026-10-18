import fs, {promises as fsAsync} from 'node:fs';
import path from 'node:path';
import test, {before} from 'node:test';
import assert from 'node:assert/strict';
import {ESLint} from 'eslint';
import {defineConfig} from 'eslint/config';
import markdown from '@eslint/markdown';
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

test('presets enable no-disabled-pinch-zoom only in recommended and all', async () => {
	await Promise.all(Object.entries(eslintCssicorn.configs).map(async ([name, config]) => {
		const eslint = new ESLint({
			baseConfig: config,
			overrideConfigFile: true,
		});

		const [result] = await eslint.lintText('a { touch-action: pan-y; }', {filePath: 'file.css'});
		assert.equal(result.messages.some(message => message.ruleId === 'cssicorn/no-disabled-pinch-zoom'), name !== 'unopinionated', name);
	}));
});

test('presets enable consistent-property-order only in all', async () => {
	await Promise.all(Object.entries(eslintCssicorn.configs).map(async ([name, config]) => {
		const eslint = new ESLint({
			baseConfig: config,
			overrideConfigFile: true,
		});

		const [result] = await eslint.lintText('a { color: red; display: flex; }', {filePath: 'file.css'});
		assert.equal(result.messages.some(message => message.ruleId === 'cssicorn/consistent-property-order'), name === 'all', name);
	}));
});

test('presets report invalid media feature notation', async () => {
	await Promise.all(Object.values(eslintCssicorn.configs).map(async config => {
		const eslint = new ESLint({
			baseConfig: config,
			overrideConfigFile: true,
		});

		const [result] = await eslint.lintText('@media (min-width) and (orientation > portrait) and (10px < width > 20px) { a { color: red; } }', {filePath: 'file.css'});
		const messages = result.messages.filter(message => message.ruleId === 'cssicorn/no-invalid-media-features');
		assert.deepEqual(messages.map(message => message.messageId), [
			'no-invalid-media-features/missing-value',
			'no-invalid-media-features/invalid-range',
			'no-invalid-media-features/invalid-chain',
		], config.name);
	}));
});

// Checks file-local layer contracts while permitting later additions.
test('recommended config enables consistent-layer-order with default options', async () => {
	const eslint = new ESLint({
		baseConfig: eslintCssicorn.configs.recommended,
		overrideConfigFile: true,
	});

	const [result] = await eslint.lintText('@layer base, theme; @layer theme, base; @layer extra {}', {filePath: 'file.css'});
	const messages = result.messages.filter(message => message.ruleId === 'cssicorn/consistent-layer-order');
	assert.equal(messages.length, 1);
	assert.equal(messages[0].messageId, 'consistent-layer-order');
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
			/\/\*\*\s*@type \{(?:CssicornRule|(?:import\('eslint'\)|ESLint)\.Rule\.RuleModule)\}\s*\*\//v,
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
	// Broad formatting preference that can require manual review of cascade-sensitive declaration sequences.
	'consistent-property-order',
	// Component stylesheet policy that intentionally rejects global and reset styles.
	'require-selector-scope',
	// Only sees `@keyframes` in the same file.
	'no-unknown-animations',
	// Enforces a source order convention, and intentional "specific before general" ordering is common.
	'no-descending-specificity',
	// Layout animations are intentional in common patterns like expanding accordions.
	'no-layout-animations',
	// Enforces opt-in motion placement rather than accepting reduced-motion overrides or application preferences.
	'require-prefers-reduced-motion',
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

test('require-selector-scope is enabled only in the all preset', () => {
	const ruleId = 'cssicorn/require-selector-scope';
	assert.equal(eslintCssicorn.configs.recommended.rules[ruleId], 'off');
	assert.equal(eslintCssicorn.configs.unopinionated.rules[ruleId], 'off');
	assert.equal(eslintCssicorn.configs.all.rules[ruleId], 'error');
});

test('require-selector-scope component configuration preserves scoped flat selectors', async () => {
	const eslint = new ESLint({
		overrideConfigFile: true,
		fix: true,
		baseConfig: [
			eslintCssicorn.configs.recommended,
			{
				files: ['src/components/**/*.css'],
				ignores: ['**/global.css', '**/reset.css'],
				rules: {
					'cssicorn/prefer-nesting': 'off',
					'cssicorn/require-selector-scope': 'error',
				},
			},
		],
	});
	const code = 'body :is(.card, .other) { color: red; }';
	const [result] = await eslint.lintText(code, {filePath: 'src/components/card.css'});
	assert.deepEqual(result.messages, []);
	assert.equal(result.output, undefined);

	const [unscopedResult] = await eslint.lintText('button {}', {filePath: 'src/components/card.css'});
	assert.deepEqual(unscopedResult.messages.map(message => message.ruleId), ['cssicorn/require-selector-scope']);

	const globalResults = await Promise.all(['src/components/global.css', 'src/components/reset.css', 'src/global.css'].map(filePath => eslint.lintText('button {}', {filePath})));
	for (const [globalResult] of globalResults) {
		assert.deepEqual(globalResult.messages, []);
	}
});

test('presets report unknown type selectors and allow custom elements by default', async () => {
	await Promise.all(Object.values(eslintCssicorn.configs).map(async config => {
		const eslint = new ESLint({baseConfig: config, overrideConfigFile: true});
		const [result] = await eslint.lintText('buton {} my-widget {}', {filePath: 'file.css'});
		const messages = result.messages.filter(message => message.ruleId === 'cssicorn/no-unknown-type-selectors');
		assert.equal(messages.length, 1, config.name);
		assert.equal(messages[0].message, 'Unknown type selector \'buton\'.', config.name);
	}));
});

test('unknown type selectors in Markdown CSS fences use original document locations', async () => {
	const eslint = new ESLint({
		overrideConfigFile: true,
		baseConfig: [
			{
				files: ['**/*.md'],
				plugins: {markdown},
				language: 'markdown/commonmark',
				processor: 'markdown/markdown',
			},
			eslintCssicorn.configs.unopinionated,
		],
	});
	const [result] = await eslint.lintText('# Example\n\n```css\nbuton {}\nmy-widget {}\n```\n', {filePath: 'example.md'});
	assert.deepEqual(result.messages.map(message => ({
		ruleId: message.ruleId,
		message: message.message,
		range: [message.line, message.column, message.endLine, message.endColumn],
	})), [{
		ruleId: 'cssicorn/no-unknown-type-selectors',
		message: 'Unknown type selector \'buton\'.',
		range: [4, 1, 4, 6],
	}]);
});

test('animation property documentation fences report only the failing example', async () => {
	const ruleId = 'cssicorn/no-overridden-animation-properties';
	const eslint = new ESLint({
		overrideConfigFile: true,
		baseConfig: [
			{
				files: ['**/*.md'],
				plugins: {markdown},
				language: 'markdown/commonmark',
				processor: 'markdown/markdown',
			},
			{
				...eslintCssicorn.configs.recommended,
				rules: {[ruleId]: 'error'},
			},
		],
	});
	const code = fs.readFileSync('docs/rules/no-overridden-animation-properties.md', 'utf8');
	const [result] = await eslint.lintText(code, {filePath: 'example.md'});
	const animationLine = code.split('\n').findIndex(line => line.includes('animation: spin')) + 1;
	assert.equal(result.messages[0]?.line, animationLine);
	assert.deepEqual(result.messages.map(({ruleId, message}) => ({ruleId, message})), [{
		ruleId,
		message: 'Animation `bounce` replaces `transform` from earlier overlapping animations.',
	}]);
});

test('nesting autofixes in Markdown CSS fences preserve surrounding prose and converge', async () => {
	const eslint = new ESLint({
		overrideConfigFile: true,
		fix: true,
		baseConfig: [
			{
				files: ['**/*.md'],
				plugins: {markdown},
				language: 'markdown/commonmark',
				processor: 'markdown/markdown',
			},
			{
				...eslintCssicorn.configs.recommended,
				rules: {'cssicorn/prefer-nesting': 'error'},
			},
		],
	});
	const code = [
		'# Example',
		'',
		'Keep this prose.',
		'',
		'```css',
		'.card:is(.foo, #bar)::before { content: "test"; }',
		'.card .footer { color: blue; }',
		'```',
		'',
		'Keep this ending.',
		'',
	].join('\n');
	const output = [
		'# Example',
		'',
		'Keep this prose.',
		'',
		'```css',
		'.card { &.foo, &#bar { &::before { content: "test"; } } .footer { color: blue; } }',
		'```',
		'',
		'Keep this ending.',
		'',
	].join('\n');
	const [result] = await eslint.lintText(code, {filePath: 'example.md'});
	assert.deepEqual(result.messages, []);
	assert.equal(result.output, output);

	const [repeated] = await eslint.lintText(output, {filePath: 'example.md'});
	assert.deepEqual(repeated.messages, []);
	assert.equal(repeated.output, undefined);
});

for (const [name, config] of Object.entries(eslintCssicorn.configs)) {
	test(`${name} preset fixes preserve animation composition and adjacent margin values`, async () => {
		const eslint = new ESLint({baseConfig: config, overrideConfigFile: true, fix: true});
		const code = '@keyframes pulse { from { opacity: 0; } to { opacity: 1; } } .card { margin: 0px.5em; animation-composition: add; animation-trigger: initial; animation-range: initial; animation-duration: 1s; animation-timing-function: ease; animation-delay: 0s; animation-iteration-count: 1; animation-direction: normal; animation-fill-mode: none; animation-play-state: running; animation-name: pulse; animation-timeline: auto; }';
		const [result] = await eslint.lintText(code, {filePath: 'file.css'});
		assert.deepEqual(result.messages, []);
		const output = result.output ?? code;
		assert.ok(output.includes(name === 'unopinionated' ? 'margin: 0px.5em;' : 'margin: 0 .5em;'));
		assert.ok(output.includes('animation-composition: add;'));
		assert.ok(output.includes(name === 'unopinionated' ? 'animation-name: pulse;' : 'animation: 1s ease 0s 1 normal none running pulse;'));

		const [repeated] = await eslint.lintText(output, {filePath: 'file.css'});
		assert.deepEqual(repeated.messages, []);
		assert.equal(repeated.output, undefined);
	});
}
