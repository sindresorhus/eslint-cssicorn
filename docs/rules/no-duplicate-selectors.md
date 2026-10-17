# no-duplicate-selectors

📝 Disallow duplicate CSS selectors.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports duplicate selectors within a selector list, and duplicate selector lists in the same at-rule and nesting context. Duplicates often come from merges, copying, or incomplete refactors, and split related declarations so that later ones can unexpectedly override earlier ones.

Insignificant whitespace and comments are ignored when comparing selectors, and the legacy single-colon pseudo-elements `:before`, `:after`, `:first-line`, and `:first-letter` equal their double-colon forms.

The autofix removes a repeated selector within one selector list, for example `.button, .button` becomes `.button`. It is skipped when a comment is next to the repeated selector. There is no autofix for duplicate selector lists in separate rules, because the right way to merge their declarations depends on intent.

## Examples

```css
/* ❌ */
.button,
.button {
	padding: 8px;
}

/* ✅ */
.button {
	padding: 8px;
}
```

```css
/* ❌ */
.card {
	color: red;
}

.card {
	color: blue;
}

/* ✅ */
.card {
	color: blue;
}
```

Matching conditional contexts are compared even in separate blocks:

```css
/* ❌ */
@media (width > 40rem) {
	.card {
		color: red;
	}
}

@media (width > 40rem) {
	.card {
		color: blue;
	}
}

/* ✅ */
@media (width > 40rem) {
	.card {
		color: blue;
	}
}
```

Selectors in different contexts are allowed:

```css
/* ✅ */
@media (width > 40rem) {
	.card {
		color: red;
	}
}

@media (width > 60rem) {
	.card {
		color: blue;
	}
}
```

## Limitations

Only complete selector lists in their original order are compared.

Partially overlapping lists are not reported:

```css
/* ✅ */
.card,
.featured {}

.card {}
```

Reordered lists are not reported:

```css
/* ✅ */
.card,
.featured {}

.featured,
.card {}
```

Selectors that are only equivalent after resolving nesting are not reported:

```css
/* ✅ */
.parent .child {}

.parent {
	& .child {}
}
```

Keyframe selectors are ignored. Use [`css/no-duplicate-keyframe-selectors`](https://github.com/eslint/css/blob/main/docs/rules/no-duplicate-keyframe-selectors.md) to check them.
