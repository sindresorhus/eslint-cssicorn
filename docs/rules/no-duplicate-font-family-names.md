# no-duplicate-font-family-names

📝 Disallow duplicate font family names.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports duplicate font family names, which add no fallback and usually indicate an editing mistake.

It checks `font-family` and grammar-valid `font` shorthands in style and keyframe rules. Comparison is case-insensitive, decodes CSS escapes, and joins unquoted identifiers with one space, so `Times New Roman`, `"times new roman"`, and `Times\20 New\20 Roman` are equivalent. Whitespace in quoted names and escaped identifiers remains significant.

Quoted names, such as `"serif"`, are distinct from generic family keywords, such as `serif`.

Duplicates of the unquoted generic `monospace` are allowed, because browsers render a lone `monospace` at a smaller default font size, and `monospace, monospace` (used by normalize.css) is a common workaround.

Static `font-family` entries are checked around dynamic values such as `var(--fonts)`. Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.

The autofix removes the duplicate and its preceding comma. It is skipped when it could remove or move a comment.

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
