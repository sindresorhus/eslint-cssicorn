# no-zero-length-unit

📝 Disallow units on zero CSS lengths.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A zero length usually does not need a unit. This rule reports zero lengths with a unit, such as `0px` or `0rem`, in declarations and in media and container queries when it can validate their context. The autofix removes the unit and adds a space when needed to keep adjacent lengths separate.

## Examples

```css
/* ❌ */
.item {
	margin: 0px;
	transform: translateX(0rem);
}

/* ✅ */
.item {
	margin: 0;
	transform: translateX(0);
}
```

Ignored contexts:

```css
/* ✅ */
.item {
	transition-duration: 0s;
	width: calc(0px + 1px);
	flex: 0px;
}
```

## Limitations

Unresolved values, such as `translate(0px, var(--space))`, are skipped.

These values are ignored, because a unit may be required there:

- Angles, times, percentages, and `fr` values.
- Unknown or escaped units.
- Custom and vendor-prefixed properties and functions.
- Math functions such as `calc()`.
- Properties that accept both lengths and unitless numbers, such as `line-height`, `columns`, and the `flex` shorthand, and registered custom property `initial-value` descriptors, where removing the unit can change the meaning.
- `overflow-clip-margin`, because Chrome rejects a bare unitless zero there.

Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.

## Related rules

- [`unicorn/no-zero-fractions`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-zero-fractions.md) removes zero fractions. Use it with this rule to turn `0.0px` into `0`.
