# no-ineffective-selector-properties

📝 Disallow properties that cannot affect their selected targets.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Catch ineffective styling of pseudo-elements and visited links.

## Examples

```css
/* ❌ */
::selection {
	padding: 1rem;
	background-color: yellow;
}

/* ✅ */
::selection {
	background-color: yellow;
}
```

```css
/* ❌ */
li::marker {
	margin-right: 0.5rem;
	color: red;
}

/* ✅ */
li::marker {
	color: red;
}
```

```css
/* ❌ */
a:visited {
	font-weight: bold;
	color: purple;
}

/* ✅ */
a:visited {
	color: purple;
}
```

## Checks

Checks a finite list of common ineffective properties on:

- [Highlights](https://www.w3.org/TR/css-pseudo-4/#highlight-styling): `::selection`, `::target-text`, `::spelling-error`, `::grammar-error`, `::search-text`, and `::highlight()`.
- [`::marker`](https://www.w3.org/TR/css-lists-3/#marker-properties), [`::cue`](https://www.w3.org/TR/webvtt1/#the-cue-pseudo-element), and [`::cue-region`](https://www.w3.org/TR/webvtt1/#the-cue-region-pseudo-element), including their functional forms where applicable.
- [`:visited`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:visited).

For [`::first-line`](https://www.w3.org/TR/css-pseudo-4/#first-line-styling) and [`::placeholder`](https://www.w3.org/TR/css-pseudo-4/#placeholder-pseudo), checks only `writing-mode`, `direction`, and `text-orientation`.

Ignores custom properties, vendor-prefixed properties, unlisted properties, and `all`. Preserves partially effective shorthands, such as `background` on highlights and visited links, and `border` on visited links.

## Scope and fixes

Reports only when every selector branch makes the declaration ineffective; unknown or preprocessing branches suppress reports. Checks final targets, including explicit nested targets. Visited inference supports parsed `:is()` and `:where()` with only visited branches, and final `&` with only visited parents, including inside these functions.

Declarations inherit selectors through `@media`, `@supports`, `@container`, `@layer`, and `@starting-style` only. Autofixes remove declarations unless they contain comments. Values, the cascade, and target browsers are not evaluated. Visited checks follow current browser privacy restrictions, which [may relax](https://drafts.csswg.org/selectors-4/#visited-privacy).

## Related rules

- [`no-ineffective-properties`](./no-ineffective-properties.md) checks declarations disabled by others in the same block.
- [`css/no-invalid-properties`](https://github.com/eslint/css/blob/main/docs/rules/no-invalid-properties.md) validates property names and values.
- Stylelint's [`rule-selector-property-disallowed-list`](https://stylelint.io/user-guide/rules/rule-selector-property-disallowed-list/) provides configurable selector/property restrictions.
