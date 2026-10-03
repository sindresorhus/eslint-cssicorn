import css from '@eslint/css';
import * as rawRules from './rules/index.js';
import {toEslintRules} from './rules/rule/index.js';
import packageJson from './package.json' with {type: 'json'};

const rules = toEslintRules(rawRules);

const createRules = shouldEnable => Object.fromEntries(Object.entries(rules).map(([id, rule]) => [
	`cssicorn/${id}`,
	shouldEnable(rule) ? 'error' : 'off',
]));

const recommendedRules = createRules(rule => Boolean(rule.meta.docs.recommended));
const unopinionatedRules = createRules(rule => rule.meta.docs.recommended === 'unopinionated');
const allRules = createRules(() => true);

const createConfig = (rules, flatConfigName) => ({
	name: flatConfigName,
	files: ['**/*.css'],
	plugins: {
		css,
		cssicorn,
	},
	language: 'css/css',
	rules,
});

const cssicorn = {
	meta: {
		// `eslint-doc-generator` derives the rule prefix from this name, expecting either the
		// `eslint-plugin-<prefix>` convention or the prefix itself; our package name doesn't
		// follow that convention, so use the prefix directly to keep doc generation working.
		name: 'cssicorn',
		version: packageJson.version,
	},
	rules,
};

const configs = {
	recommended: createConfig(recommendedRules, 'cssicorn/recommended'),
	unopinionated: createConfig(unopinionatedRules, 'cssicorn/unopinionated'),
	all: createConfig(allRules, 'cssicorn/all'),
};

cssicorn.configs = configs;

export default cssicorn;
