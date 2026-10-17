# prefer-existing-custom-properties

📝 Prefer existing custom properties over matching literal values.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports literal values that match a configured custom property, and suggests the custom property instead.

There is no autofix because a replacement can affect theme, inheritance, or registration, but a suggestion is provided.

## Examples

These examples use the configuration in [Options](#options).

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

## Options

### customProperties

Type: `object`\
Default: `{}`

A map of custom property names to literal CSS values. The names are decoded and case-sensitive. With an empty map, the rule reports nothing.

```js
{
	customProperties: {
		'--brand-color': '#6750a4',
		'--space-small': '8px',
	},
}
```

The rule does not discover the definitions or analyze the cascade, so the custom properties must exist and fit where they are used. An empty or malformed value causes a configuration error, and unsupported values are skipped.

## Value matching

- A match of the whole value is preferred over matches of its components.
- A match that contains a comment, or a value that more than one configured custom property has, is not reported.
- Simple hex and RGB equivalents match, and so do equal times in milliseconds and seconds. Other values match structurally, without evaluating calculations.

## Limitations

The rule ignores:

- Custom property declarations.
- Substitution functions, such as `var()`.
- `random()`.
- Element reference functions, such as `element()`.
- Strings and URLs.
- Components of color functions.
