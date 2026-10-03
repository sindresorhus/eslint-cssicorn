# no-duplicate-font-family-names

📝 Disallow duplicate font family names.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Duplicate font family names do not provide another fallback and usually indicate an editing mistake.

This rule checks `font-family` and grammar-valid `font` shorthands in style and keyframe rules. Comparison is case-insensitive, decodes CSS escapes, and joins unquoted identifiers with one space. For example, `Times New Roman`, `"times new roman"`, and `Times\20 New\20 Roman` are equivalent. Whitespace in quoted names and escaped identifiers remains significant.

Quoted names remain distinct from generic family keywords. For example, `"serif"` is a named family, while `serif` is generic.

Duplicates of the unquoted generic `monospace` are allowed. Browsers render a lone `monospace` at a smaller default font size, and `monospace, monospace` is a common workaround for this (used by normalize.css).

Static `font-family` entries are checked around dynamic values such as `var(--fonts)`. Unmatchable `font` shorthands are ignored. Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.

The autofix removes the duplicate and its preceding comma. It still reports without fixing when a comment could be removed or relocated.

## Examples

```css
/* ❌ */
.heading {
	font-family: Inter, "inter", sans-serif;
}

/* ✅ */
.heading {
	font-family: Inter, sans-serif;
}
```

```css
/* ❌ */
.article {
	font: italic 1rem Times New Roman, "Times New Roman", serif;
}

/* ✅ */
.article {
	font: italic 1rem Times New Roman, serif;
}
```

```css
/* ✅ */
.example {
	font-family: "serif", serif;
}
```

```css
/* ✅ */
pre {
	font-family: monospace, monospace;
}
```
