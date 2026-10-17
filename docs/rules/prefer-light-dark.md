# prefer-light-dark

📝 Prefer `light-dark()` over paired light and dark color declarations.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports a color declaration that a `prefers-color-scheme` media query overrides, and suggests combining both colors with [the `light-dark()` function](https://drafts.csswg.org/css-color-5/#light-dark), which keeps related theme colors together and can remove duplicated declarations and selectors.

There is no autofix because `light-dark()` uses the element's color scheme, which can differ from the user's preference that `prefers-color-scheme` queries, but a suggestion is provided.

## Examples

```css
/* Setup */
:root {
	color-scheme: light dark;
}

/* ❌ */
.card {
	color: white;
}

@media (prefers-color-scheme: dark) {
	.card {
		color: black;
	}
}

/* ✅ */
.card {
	color: light-dark(white, black);
}
```

A nested media override at the end of a style rule, and a color in a shorthand, are also supported:

```css
/* ❌ */
.card {
	color-scheme: light dark;
	border: 1px solid white;

	@media (prefers-color-scheme: dark) {
		border: 1px solid black;
	}
}

/* ✅ */
.card {
	color-scheme: light dark;
	border: 1px solid light-dark(white, black);
}
```

So are custom properties with a color value:

```css
/* Setup */
:root {
	color-scheme: light dark;
}

/* ❌ */
.card {
	--surface: white;

	@media (prefers-color-scheme: dark) {
		--surface: black;
	}
}

/* ✅ */
.card {
	--surface: light-dark(white, black);
}
```

> [!IMPORTANT]
> An unregistered custom property's `light-dark()` resolves with the consuming element's color scheme, which can change inherited colors on descendants with a different scheme, or behavior in a non-color value.

## Supported patterns

Only the two forms above are matched, with the media query `(prefers-color-scheme: light)` or `(prefers-color-scheme: dark)`:

- In the adjacent form, the media override must immediately follow the style rule, both selector lists must serialize the same way, and the media block must contain only one rule.
- In the nested form, the media query must be the last item in the style rule.
- The blocks in a pair cannot contain other nested rules.

A literal `color-scheme: light dark` is required in the base rule, or in an unconditional rule in the same file, also inside `@layer`, whose selectors are all bare `:root` or `html`. The keywords can be in either order, and `only` is accepted.

The two values can differ only in top-level literal colors, and must have the same `!important`. A custom property must contain a single literal color.

## Limitations

The setup check does not guarantee the cascade, and color equivalence is best effort. Unsupported or conflicting patterns are skipped.

A comment in a paired declaration prevents the suggestion. If the wrapper of the override contains a comment, the suggestion keeps the wrapper and its comment.

Custom property registrations are not checked. For example, `<custom-ident>` accepts `red` and `blue`, but not `light-dark(red, blue)`.

## Related rules

- [`no-redundant-functions`](./no-redundant-functions.md) simplifies existing `light-dark()` calls, while this rule introduces them through suggestions.
- [`css/use-baseline`](https://github.com/eslint/css/blob/main/docs/rules/use-baseline.md) checks CSS browser support against your chosen Baseline target.
