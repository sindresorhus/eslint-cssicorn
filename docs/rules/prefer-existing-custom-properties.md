# prefer-existing-custom-properties

📝 Prefer existing custom properties over matching literal values.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Suggest configured custom properties for matching literal values. Uses suggestions because replacements can affect theme, inheritance, or registration.

## Options

### `customProperties`

Type: `object`\
Default: `{}`

Map decoded, case-sensitive custom-property names to literal CSS values. An empty catalog produces no reports.

```js
'cssicorn/prefer-existing-custom-properties': [
	'warn',
	{
		customProperties: {
			'--brand-color': '#6750a4',
			'--space-small': '8px',
		},
	},
],
```

Tokens must exist and be appropriate where used; the rule does not discover definitions or analyze the cascade. Empty or malformed values cause configuration errors; unsupported values are skipped.

## Examples

```css
/* ❌ */
a {
	border: 8px solid #6750a4;
}

/* ✅ */
a {
	border: var(--space-small) solid var(--brand-color);
}
```

## Matching and limitations

- Prefers whole-value matches over literal components. Skips ambiguous or commented matches.
- Recognizes simple hex/RGB equivalents and milliseconds/seconds. Other values match structurally; calculations are not evaluated.
- Ignores custom-property declarations, substitution/random/element-reference functions, strings, URLs, and color-function components.
