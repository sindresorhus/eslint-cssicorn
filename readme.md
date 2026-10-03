# eslint-cssicorn

> Powerful ESLint rules for CSS

The rules work with the [`@eslint/css`](https://github.com/eslint/css) language plugin.

[`eslint-plugin-unicorn`](https://github.com/sindresorhus/eslint-plugin-unicorn#non-javascript-files) has more rules that also lint CSS, such as `no-zero-fractions` and `no-shorthand-property-overrides`.

[**Propose a new rule ➡**](.github/contributing.md)

*We do not accept pull requests because of too much AI slop.*

## Install

```sh
npm install --save-dev eslint @eslint/css eslint-cssicorn
```

**Requires ESLint `>=10.4`, [flat config](https://eslint.org/docs/latest/use/configure/configuration-files), and [ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c#how-can-i-make-my-typescript-project-output-esm).**

## Usage

Use a [preset config](#preset-configs) or configure each rule in `eslint.config.js`.

If you don't use a preset, set `language: 'css/css'` and add the `@eslint/css` plugin, as shown below.

```js
import css from '@eslint/css';
import cssicorn from 'eslint-cssicorn';
import {defineConfig} from 'eslint/config';

export default defineConfig([
	{
		files: ['**/*.css'],
		plugins: {
			css,
			cssicorn,
		},
		language: 'css/css',
		rules: {
			'cssicorn/prefer-short-hex-color': 'error',
			'cssicorn/…': 'error',
		},
	},
	// …
]);
```

## Rules

<!-- Do not manually modify this list. Run: `npm run fix:eslint-docs` -->
<!-- begin auto-generated rules list -->

💼 [Configurations](https://github.com/sindresorhus/eslint-cssicorn#recommended-config) enabled in.\
✅ Set in the `recommended` [configuration](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).\
☑️ Set in the `unopinionated` [configuration](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).\
💡 Manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

| Name                                                                                         | Description                                                                                                  | 💼   | 🔧 | 💡 |
| :------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :--- | :- | :- |
| [lowercase](docs/rules/lowercase.md)                                                         | Enforce lowercase CSS syntax.                                                                                | ✅    | 🔧 |    |
| [no-declarations-after-nested-rules](docs/rules/no-declarations-after-nested-rules.md)       | Disallow declarations after nested rules.                                                                    | ✅ ☑️ |    |    |
| [no-deprecated-features](docs/rules/no-deprecated-features.md)                               | Disallow deprecated CSS features.                                                                            | ✅    | 🔧 | 💡 |
| [no-descending-specificity](docs/rules/no-descending-specificity.md)                         | Disallow lower-specificity selectors from following higher-specificity selectors that set the same property. |      |    |    |
| [no-duplicate-font-family-names](docs/rules/no-duplicate-font-family-names.md)               | Disallow duplicate font family names.                                                                        | ✅ ☑️ | 🔧 |    |
| [no-duplicate-properties](docs/rules/no-duplicate-properties.md)                             | Disallow duplicate properties within CSS declaration blocks.                                                 | ✅    |    | 💡 |
| [no-duplicate-selectors](docs/rules/no-duplicate-selectors.md)                               | Disallow duplicate CSS selectors.                                                                            | ✅    | 🔧 |    |
| [no-ineffective-keyframe-declarations](docs/rules/no-ineffective-keyframe-declarations.md)   | Disallow ineffective declarations in keyframes.                                                              | ✅ ☑️ | 🔧 |    |
| [no-invalid-media-features](docs/rules/no-invalid-media-features.md)                         | Disallow unknown media features and invalid values for known media features.                                 | ✅ ☑️ |    |    |
| [no-nesting-with-mixed-specificity](docs/rules/no-nesting-with-mixed-specificity.md)         | Disallow nesting under selector lists with mixed specificity.                                                | ✅    |    |    |
| [no-redundant-longhand-properties](docs/rules/no-redundant-longhand-properties.md)           | Disallow longhand properties that can be combined into a shorthand.                                          | ✅    | 🔧 |    |
| [no-redundant-nested-style-rules](docs/rules/no-redundant-nested-style-rules.md)             | Disallow nested style rules that do not modify the parent selector.                                          | ✅    | 🔧 |    |
| [no-redundant-shorthand-values](docs/rules/no-redundant-shorthand-values.md)                 | Disallow redundant values in CSS shorthand properties.                                                       | ✅    | 🔧 |    |
| [no-self-referencing-custom-properties](docs/rules/no-self-referencing-custom-properties.md) | Disallow self-references in CSS custom properties.                                                           | ✅ ☑️ |    |    |
| [no-unknown-animations](docs/rules/no-unknown-animations.md)                                 | Disallow unknown animations.                                                                                 |      |    |    |
| [no-unknown-annotations](docs/rules/no-unknown-annotations.md)                               | Disallow unknown and noncanonical CSS annotations.                                                           | ✅ ☑️ |    | 💡 |
| [no-unknown-pseudo-selectors](docs/rules/no-unknown-pseudo-selectors.md)                     | Disallow unknown pseudo-class and pseudo-element selectors.                                                  | ✅ ☑️ |    |    |
| [no-unscoped-nesting-selector](docs/rules/no-unscoped-nesting-selector.md)                   | Disallow unscoped CSS nesting selectors.                                                                     | ✅ ☑️ |    |    |
| [no-zero-length-unit](docs/rules/no-zero-length-unit.md)                                     | Disallow units on zero CSS lengths.                                                                          | ✅    | 🔧 |    |
| [prefer-explicit-viewport-units](docs/rules/prefer-explicit-viewport-units.md)               | Prefer explicit viewport units.                                                                              | ✅    |    | 💡 |
| [prefer-media-feature-range-syntax](docs/rules/prefer-media-feature-range-syntax.md)         | Prefer modern media feature range syntax.                                                                    | ✅    | 🔧 | 💡 |
| [prefer-modern-syntax](docs/rules/prefer-modern-syntax.md)                                   | Prefer modern CSS color and pseudo-element syntax.                                                           | ✅    | 🔧 |    |
| [prefer-short-hex-color](docs/rules/prefer-short-hex-color.md)                               | Prefer short hexadecimal color notation.                                                                     | ✅    | 🔧 |    |
| [require-property-descriptors](docs/rules/require-property-descriptors.md)                   | Require descriptors in CSS `@property` rules.                                                                | ✅ ☑️ |    |    |

<!-- end auto-generated rules list -->

## Preset configs

See the [ESLint docs](https://eslint.org/docs/latest/use/configure/configuration-files) for more information about extending config files.

**Note**: The preset configs apply to `**/*.css` files. They also set `language: 'css/css'` and add the `@eslint/css` plugin.

### Recommended config

This plugin exports a `recommended` config that enforces good practices.

```js
import cssicorn from 'eslint-cssicorn';
import {defineConfig} from 'eslint/config';

export default defineConfig([
	// …
	cssicorn.configs.recommended,
	{
		files: ['**/*.css'],
		rules: {
			'cssicorn/no-unknown-animations': 'error',
		},
	},
]);
```

### Unopinionated config

This plugin exports an `unopinionated` config. It enables only the rules that catch bugs, without the style rules from the `recommended` config.

```js
import cssicorn from 'eslint-cssicorn';
import {defineConfig} from 'eslint/config';

export default defineConfig([
	// …
	cssicorn.configs.unopinionated,
]);
```

### All config

This plugin exports an `all` config that enables every rule.

```js
import cssicorn from 'eslint-cssicorn';
import {defineConfig} from 'eslint/config';

export default defineConfig([
	// …
	cssicorn.configs.all,
	{
		files: ['**/*.css'],
		rules: {
			'cssicorn/prefer-short-hex-color': 'off',
		},
	},
]);
```

## Related

- [eslint-plugin-unicorn](https://github.com/sindresorhus/eslint-plugin-unicorn) — More than 300 powerful ESLint rules. Some of them also lint CSS.
- [eslint-node-test](https://github.com/sindresorhus/eslint-node-test) — ESLint rules for the Node.js built-in test runner.
- [eslint-package-json](https://github.com/sindresorhus/eslint-package-json) — Powerful ESLint rules for `package.json`.
