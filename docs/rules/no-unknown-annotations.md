# no-unknown-annotations

📝 Disallow unknown and noncanonical CSS annotations.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Standard CSS currently defines only the [`!important`](https://drafts.csswg.org/css-cascade/#important) annotation. Unknown annotations are accepted by the parser but invalidate the declaration, so a typo can silently prevent a style from applying.

This rule only allows the canonical `!important` form. Other spellings that CSS accepts, with different casing, escapes, or whitespace or comments between `!` and `important`, are also reported. A different spelling, like `!IMPORTANT`, `! important`, or `!\69mportant`, is autofixed, because the browser already applies it as `!important`. For an unknown annotation, like `!imprtant`, there is no autofix because the browser drops the declaration and the fix would make it apply, but a suggestion is provided.

## Examples

```css
/* ❌ */
.button {
	color: red !IMPORTANT;
}

/* ✅ */
.button {
	color: red !important;
}
```

```css
/* ❌ */
.button {
	color: red ! important;
}

/* ✅ */
.button {
	color: red !important;
}
```

```css
/* ❌ */
.button {
	color: red !\69mportant;
}

/* ✅ */
.button {
	color: red !important;
}
```

```css
/* ❌ */
.button {
	color: red !imprtant;
}

/* ✅ */
.button {
	color: red !important;
}
```

Custom properties are checked too. Their values can contain almost anything except a top-level `!`, so browsers also drop a custom property with an unknown annotation:

```css
/* ❌ */
.button {
	--accent: red !imprtant;
}

/* ✅ */
.button {
	--accent: red !important;
}
```

## Limitations

There is no autofix or suggestion when a comment is between `!` and the annotation name, like `!/* comment */important`, because the fix would remove the comment.
