# prefer-light-dark

📝 Prefer `light-dark()` over paired light and dark color declarations.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[The `light-dark()` function](https://drafts.csswg.org/css-color-5/#light-dark) keeps related theme colors together and can remove duplicated declarations and selectors.

Suggestions require review: `light-dark()` uses the element's color scheme, which can differ from the user's preference queried by `prefers-color-scheme`. Check your theme behavior and browser support before applying them.

Use [`css/use-baseline`](https://github.com/eslint/css/blob/main/docs/rules/use-baseline.md) to check CSS browser support against your chosen Baseline target.

## Examples

An ordinary style rule immediately followed by a media override with the same serialized selector list:

```css
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

A direct nested media override at the end of a style rule, including a color component in a shorthand:

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

Color-valued custom properties are also supported:

```css
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
> An unregistered custom property's `light-dark()` resolves using the consuming element's color scheme. This can change inherited colors on descendants with a different scheme, or behavior when consumed as a non-color value.

Custom-property registrations are not checked. For example, `<custom-ident>` accepts `red` and `blue`, but not `light-dark(red, blue)`.

## Supported patterns

Matches the adjacent and final nested forms above, using only `(prefers-color-scheme: light)` or `(prefers-color-scheme: dark)`. Adjacent selectors must serialize identically, with one rule in the media block. Participating blocks cannot contain other nested rules.

Requires literal `color-scheme: light dark` in the base rule or an unconditional bare `:root`/`html` rule in this file, including inside `@layer`. Either order and optional `only` are accepted.

Values may differ only in top-level literal colors, with matching `!important`. Custom properties must contain a single literal color.

## Limitations

The setup check does not guarantee the cascade. Unsupported or conflicting patterns are skipped, and color equivalence is best effort. Comments in paired declarations prevent suggestions; commented wrappers are preserved.

[`no-redundant-functions`](./no-redundant-functions.md) simplifies existing calls; this rule introduces them through suggestions.
