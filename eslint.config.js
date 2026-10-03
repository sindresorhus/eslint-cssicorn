import globals from 'globals';
import xo from 'eslint-config-xo';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import eslintPlugin from 'eslint-plugin-eslint-plugin';
import nodeStyleTextConfig from 'node-style-text/eslint-config';
import internalRules from './scripts/internal-rules/index.js';

const disabledJsdocRules = Object.fromEntries(
	Object.keys(jsdocPlugin.rules).map(name => [`jsdoc/${name}`, 'off']),
);

const config = [
	...xo(),
	nodeStyleTextConfig,
	internalRules,
	{
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		ignores: [
			'.ai-temporary',
			'**/*.ts',
		],
	},
	{
		rules: disabledJsdocRules,
	},
	{
		files: ['package.json'],
		rules: {
			// This version defines the committed pseudo-selector snapshot and must only change when the snapshot is regenerated.
			'package-json/dependency-version-range': ['error', {exceptions: ['@webref/css']}],
		},
	},
	{
		files: ['**/*.js'],
		rules: {
			'no-sequences': ['error', {allowInParentheses: false}],
			'require-unicode-regexp': 'off',
			'no-shadow': 'off',
			'no-unused-vars': 'off',
			'no-undef': 'off',
			'import-x/no-anonymous-default-export': 'off',
			'node-test/no-conditional-assertion': 'off',
			// Tests import `node:assert/strict` instead of using `t.assert`.
			'node-test/prefer-test-context-assert': 'off',
			'n/prefer-global/process': 'off',
			// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2341
			'unicorn/escape-case': 'off',
			'unicorn/prefer-unicode-code-point-escapes': 'off',
			'unicorn/expiring-todo-comments': 'off',
			'unicorn/no-hex-escape': 'off',
			'unicorn/no-null': 'off',
			'unicorn/consistent-boolean-name': 'off',
			// Recursive AST/tree walkers are intentional in rule implementation code.
			'unicorn/no-useless-recursion': 'off',
			// Disabled violations remain intentional in this codebase.
			'unicorn/prefer-minimal-ternary': 'off',
			'unicorn/prefer-simple-condition-first': 'off',
			'unicorn/prefer-simplified-conditions': 'off',
			// `eslint-config-xo` 4 brings in `eslint-plugin-unicorn` 76, which reports much more code with these rules. The codebase does not follow them yet.
			'unicorn/prefer-ternary': 'off',
			'unicorn/prefer-combined-guards': 'off',
			'unicorn/prefer-early-return': 'off',
			'unicorn/prefer-logical-operator-over-ternary': 'off',
			'unicorn/prefer-continue': 'off',
			// Many existing internal utilities intentionally export declarations separately.
			'unicorn/default-export-style': 'off',
			'unicorn/prefer-array-flat': ['error', {
				functions: [
					'flat',
					'flatten',
				],
			}],
			'unicorn/consistent-function-scoping': 'off',
			'import/order': 'off',
			'func-names': 'off',
			'@stylistic/function-paren-newline': 'off',
			'@stylistic/curly-newline': 'off',
			// Rule tests import the shared harness `test/utils/test.js`, whose name matches the Node.js test file conventions.
			'node-test/no-import-test-files': 'off',
			'ava/no-import-test-files': 'off',
			// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2833
			'unicorn/template-indent': ['error', {indent: '\t'}],
			// These `regexp/*` rules flag our own rule-implementation regexes, which run on source
			// code at lint time rather than untrusted input, and rewriting them would hurt readability.
			'regexp/optimal-quantifier-concatenation': 'off',
			'regexp/no-super-linear-move': 'off',
			'regexp/no-super-linear-backtracking': 'off',
			'regexp/strict': 'off',
			'regexp/no-control-character': 'off',
			'regexp/prefer-named-capture-group': 'off',
			// Our long-standing `eslint-disable` directives predate this rule and are self-explanatory.
			'@eslint-community/eslint-comments/require-description': 'off',
		},
	},
	{
		files: [
			'scripts/internal-rules/fix-snapshot-test.js',
			'test/utils/snapshot-rule-tester.js',
		],
		rules: {
			// Existing implementations intentionally use nested control flow in a few places.
			'unicorn/no-break-in-nested-loop': 'off',
		},
	},
	{
		files: [
			'test/**/*.js',
		],
		rules: {
			// Test files contain source-code fixtures in template literals.
			'unicorn/no-incorrect-template-string-interpolation': 'off',
		},
	},
	{
		files: [
			'test/utils/*.js',
		],
		rules: {
			// Test helpers export utilities and configure `node:test` and `RuleTester` when they are loaded.
			'node-test/no-export': 'off',
			'unicorn/no-top-level-side-effects': 'off',
		},
	},
	{
		files: [
			'rules/*.js',
		],
		plugins: {
			'eslint-plugin': eslintPlugin,
		},
		rules: {
			...eslintPlugin.configs.all.rules,
			'eslint-plugin/require-meta-docs-description': [
				'error',
				{
					pattern: '.+',
				},
			],
			'eslint-plugin/require-meta-docs-recommended': [
				'error',
				{
					allowNonBoolean: true,
				},
			],
			'eslint-plugin/require-meta-docs-url': 'off',
			'eslint-plugin/require-meta-has-suggestions': 'off',
			'eslint-plugin/require-meta-schema': 'off',
			'eslint-plugin/require-meta-schema-description': 'error',
		},
	},
];

export default config;
