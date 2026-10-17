# prefer-short-hex-color

📝 Prefer short hexadecimal color notation.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A six or eight digit hex color can use three or four digits when each digit pair, like `aa` in `#aabbcc`, repeats one digit, regardless of letter case. This rule reports these colors in declaration values, including custom properties and unknown value syntax, and the autofix shortens them without changing the color, keeping the case of the retained digits.

## Examples

```css
/* ❌ */
a {
	color: #ffffff;
	background-color: #aabbccdd;
}

/* ✅ */
a {
	color: #fff;
	background-color: #abcd;
}
```

## Limitations

Selectors, strings, comments, URLs, and element references (`element()` and `-moz-element()`) are left unchanged. Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.

## Related rules

- [`lowercase`](./lowercase.md) can enforce lowercase hex colors.
