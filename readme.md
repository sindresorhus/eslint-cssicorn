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

## Embedded CSS

To lint fenced CSS blocks in Markdown, configure the [`@eslint/markdown` processor](https://github.com/eslint/markdown/blob/main/docs/processors/markdown.md). It extracts virtual `.css` files, which the preset configs match. This processes the fenced CSS, while Markdown prose rules require a separate run.

```js
import markdown from '@eslint/markdown';
import cssicorn from 'eslint-cssicorn';

export default [
	{
		files: ['**/*.md'],
		plugins: {markdown},
		language: 'markdown/commonmark',
		processor: 'markdown/markdown',
	},
	cssicorn.configs.recommended,
];
```

## Rules

<!-- Do not manually modify this list. Run: `npm run fix:eslint-docs` -->
<!-- begin auto-generated rules list -->

💼 [Configurations](https://github.com/sindresorhus/eslint-cssicorn#recommended-config) enabled in.\
✅ Set in the `recommended` [configuration](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).\
☑️ Set in the `unopinionated` [configuration](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).\
💡 Manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

| Name                                                                                           | Description                                                                                                  | 💼   | 🔧 | 💡 |
| :--------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :--- | :- | :- |
| [consistent-compound-selector-order](docs/rules/consistent-compound-selector-order.md)         | Enforce consistent ordering of compound selector components.                                                 | ✅    | 🔧 |    |
| [consistent-layer-order](docs/rules/consistent-layer-order.md)                                 | Enforce consistent ordering of cascade layer statements.                                                     | ✅    | 🔧 |    |
| [lowercase](docs/rules/lowercase.md)                                                           | Enforce lowercase CSS syntax.                                                                                | ✅    | 🔧 |    |
| [no-clamped-values](docs/rules/no-clamped-values.md)                                           | Disallow CSS values that browsers silently clamp.                                                            | ✅    |    |    |
| [no-declarations-after-nested-rules](docs/rules/no-declarations-after-nested-rules.md)         | Disallow declarations after nested rules.                                                                    | ✅ ☑️ |    |    |
| [no-deprecated-features](docs/rules/no-deprecated-features.md)                                 | Disallow deprecated CSS features.                                                                            | ✅    | 🔧 | 💡 |
| [no-descending-specificity](docs/rules/no-descending-specificity.md)                           | Disallow lower-specificity selectors from following higher-specificity selectors that set the same property. |      |    |    |
| [no-disabled-pinch-zoom](docs/rules/no-disabled-pinch-zoom.md)                                 | Disallow `touch-action` values that disable browser pinch zoom.                                              | ✅    |    | 💡 |
| [no-duplicate-at-rule-definitions](docs/rules/no-duplicate-at-rule-definitions.md)             | Disallow duplicate named at-rule definitions.                                                                | ✅    |    |    |
| [no-duplicate-font-family-names](docs/rules/no-duplicate-font-family-names.md)                 | Disallow duplicate font family names.                                                                        | ✅ ☑️ | 🔧 |    |
| [no-duplicate-properties](docs/rules/no-duplicate-properties.md)                               | Disallow duplicate properties within CSS declaration blocks.                                                 | ✅    |    | 💡 |
| [no-duplicate-selectors](docs/rules/no-duplicate-selectors.md)                                 | Disallow duplicate CSS selectors.                                                                            | ✅    | 🔧 |    |
| [no-ineffective-keyframe-declarations](docs/rules/no-ineffective-keyframe-declarations.md)     | Disallow ineffective declarations in keyframes.                                                              | ✅ ☑️ | 🔧 |    |
| [no-ineffective-properties](docs/rules/no-ineffective-properties.md)                           | Disallow properties that have no effect given other declarations or shorthand defaults.                      | ✅ ☑️ |    |    |
| [no-ineffective-selector-properties](docs/rules/no-ineffective-selector-properties.md)         | Disallow properties that cannot affect their selected targets.                                               | ✅ ☑️ | 🔧 |    |
| [no-ineffective-supports-conditions](docs/rules/no-ineffective-supports-conditions.md)         | Disallow supports conditions that do not test their value functions.                                         | ✅    |    |    |
| [no-ineffective-transitions](docs/rules/no-ineffective-transitions.md)                         | Disallow transition targets that cannot transition under the declared behavior.                              | ✅ ☑️ |    | 💡 |
| [no-invalid-media-features](docs/rules/no-invalid-media-features.md)                           | Disallow unknown media features, invalid values, and invalid notation.                                       | ✅ ☑️ |    |    |
| [no-invalid-property-references](docs/rules/no-invalid-property-references.md)                 | Disallow invalid property references in transitions and will-change.                                         | ✅ ☑️ |    |    |
| [no-layout-animations](docs/rules/no-layout-animations.md)                                     | Disallow animating properties that can affect layout.                                                        |      |    |    |
| [no-nesting-with-mixed-specificity](docs/rules/no-nesting-with-mixed-specificity.md)           | Disallow mixed specificity in nesting parents and selector-list pseudo-classes.                              | ✅    |    |    |
| [no-overflow-axis-coercion](docs/rules/no-overflow-axis-coercion.md)                           | Disallow overflow values that are coerced by the other axis.                                                 | ✅ ☑️ |    |    |
| [no-redundant-functions](docs/rules/no-redundant-functions.md)                                 | Disallow redundant function calls and arguments.                                                             | ✅    | 🔧 |    |
| [no-redundant-longhand-properties](docs/rules/no-redundant-longhand-properties.md)             | Disallow longhand properties that can be combined into a shorthand.                                          | ✅    | 🔧 |    |
| [no-redundant-nested-style-rules](docs/rules/no-redundant-nested-style-rules.md)               | Disallow nested style rules that do not modify the parent selector.                                          | ✅    | 🔧 |    |
| [no-redundant-nesting-selector](docs/rules/no-redundant-nesting-selector.md)                   | Disallow redundant nesting selectors.                                                                        | ✅    | 🔧 |    |
| [no-redundant-shorthand-values](docs/rules/no-redundant-shorthand-values.md)                   | Disallow redundant values in CSS shorthand properties.                                                       | ✅    | 🔧 |    |
| [no-self-referencing-custom-properties](docs/rules/no-self-referencing-custom-properties.md)   | Disallow cyclic dependencies in CSS custom properties.                                                       | ✅ ☑️ |    |    |
| [no-unknown-animations](docs/rules/no-unknown-animations.md)                                   | Disallow unknown animations.                                                                                 |      |    |    |
| [no-unknown-annotations](docs/rules/no-unknown-annotations.md)                                 | Disallow unknown and noncanonical CSS annotations.                                                           | ✅ ☑️ |    | 💡 |
| [no-unknown-pseudo-selectors](docs/rules/no-unknown-pseudo-selectors.md)                       | Disallow unknown pseudo-class and pseudo-element selectors.                                                  | ✅ ☑️ |    |    |
| [no-unscoped-nesting-selector](docs/rules/no-unscoped-nesting-selector.md)                     | Disallow unscoped CSS nesting selectors.                                                                     | ✅ ☑️ |    |    |
| [no-useless-is](docs/rules/no-useless-is.md)                                                   | Disallow unnecessary `:is()` wrappers.                                                                       | ✅ ☑️ | 🔧 |    |
| [no-zero-length-unit](docs/rules/no-zero-length-unit.md)                                       | Disallow units on zero CSS lengths.                                                                          | ✅    | 🔧 |    |
| [prefer-aspect-ratio](docs/rules/prefer-aspect-ratio.md)                                       | Prefer `aspect-ratio` over zero-height percentage-padding workarounds.                                       | ✅    |    |    |
| [prefer-clamp](docs/rules/prefer-clamp.md)                                                     | Prefer `clamp()` over nested `min()` and `max()`.                                                            | ✅ ☑️ | 🔧 |    |
| [prefer-current-color](docs/rules/prefer-current-color.md)                                     | Prefer currentcolor over repeating the foreground color.                                                     | ✅    |    | 💡 |
| [prefer-existing-custom-properties](docs/rules/prefer-existing-custom-properties.md)           | Prefer existing custom properties over matching literal values.                                              | ✅    |    | 💡 |
| [prefer-explicit-viewport-units](docs/rules/prefer-explicit-viewport-units.md)                 | Prefer explicit viewport units.                                                                              | ✅    |    | 💡 |
| [prefer-individual-transform-properties](docs/rules/prefer-individual-transform-properties.md) | Prefer individual transform properties over transform functions.                                             | ✅    |    | 💡 |
| [prefer-light-dark](docs/rules/prefer-light-dark.md)                                           | Prefer `light-dark()` over paired light and dark color declarations.                                         | ✅    |    | 💡 |
| [prefer-media-feature-range-syntax](docs/rules/prefer-media-feature-range-syntax.md)           | Prefer modern media feature range syntax.                                                                    | ✅    | 🔧 | 💡 |
| [prefer-merged-rules](docs/rules/prefer-merged-rules.md)                                       | Prefer merging adjacent rules with identical declarations or conditions.                                     | ✅    | 🔧 |    |
| [prefer-modern-syntax](docs/rules/prefer-modern-syntax.md)                                     | Prefer modern CSS color and pseudo-element syntax.                                                           | ✅    | 🔧 |    |
| [prefer-nesting](docs/rules/prefer-nesting.md)                                                 | Prefer CSS nesting for related rules and selector groups.                                                    | ✅    | 🔧 |    |
| [prefer-relative-colors](docs/rules/prefer-relative-colors.md)                                 | Prefer relative colors for alpha variants of existing color custom properties.                               | ✅    |    | 💡 |
| [prefer-short-hex-color](docs/rules/prefer-short-hex-color.md)                                 | Prefer short hexadecimal color notation.                                                                     | ✅    | 🔧 |    |
| [require-prefers-reduced-motion](docs/rules/require-prefers-reduced-motion.md)                 | Require motion effects inside `prefers-reduced-motion: no-preference` media queries.                         |      |    |    |
| [require-property-descriptors](docs/rules/require-property-descriptors.md)                     | Require descriptors in CSS `@property` rules.                                                                | ✅ ☑️ |    |    |
| [require-selector-scope](docs/rules/require-selector-scope.md)                                 | Require a positive scoping boundary for every selector.                                                      |      |    |    |

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

This plugin exports an `unopinionated` config with bug checks and straightforward simplifications.

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
