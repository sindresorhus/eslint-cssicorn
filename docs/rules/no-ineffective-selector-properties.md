# no-ineffective-selector-properties

📝 Disallow properties that cannot affect their selected targets.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports properties that have no effect on pseudo-elements and visited links.

The autofix removes the declaration. It is skipped when the declaration contains a comment.

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

The rule checks a list of common ineffective properties on:

- [Highlights](https://www.w3.org/TR/css-pseudo-4/#highlight-styling): `::selection`, `::target-text`, `::spelling-error`, `::grammar-error`, `::search-text`, and `::highlight()`.
- [`::marker`](https://www.w3.org/TR/css-lists-3/#marker-properties), [`::cue`](https://www.w3.org/TR/webvtt1/#the-cue-pseudo-element), and [`::cue-region`](https://www.w3.org/TR/webvtt1/#the-cue-region-pseudo-element), including their functional forms where applicable.
- [`:visited`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:visited).

For [`::first-line`](https://www.w3.org/TR/css-pseudo-4/#first-line-styling) and [`::placeholder`](https://www.w3.org/TR/css-pseudo-4/#placeholder-pseudo), the rule only checks `writing-mode`, `direction`, and `text-orientation`.

Partially effective shorthands, such as `background` on highlights and visited links, and `border` on visited links, are not reported.

The rule checks the final target of each selector, also when a nested rule has an explicit target, and only reports a declaration when every selector in the list makes it ineffective. An unknown selector or preprocessor syntax in any selector prevents the report.

`:visited` is also detected in parsed `:is()` and `:where()` when all their selectors are visited, and in a final `&` when all the parent selectors are visited, also inside these functions.

Declarations in `@media`, `@supports`, `@container`, `@layer`, and `@starting-style` blocks use the selector of the enclosing style rule. Other at-rules are not traversed.

## Limitations

- Custom properties, vendor-prefixed properties, unlisted properties, and `all` are ignored.
- Values, the cascade, and target browsers are not evaluated.
- The `:visited` checks follow the current browser privacy restrictions, which [may relax](https://drafts.csswg.org/selectors-4/#visited-privacy) in the future.

## Related rules

- [`no-ineffective-properties`](./no-ineffective-properties.md) checks declarations disabled by others in the same block.
- [`css/no-invalid-properties`](https://github.com/eslint/css/blob/main/docs/rules/no-invalid-properties.md) validates property names and values.
- Stylelint's [`rule-selector-property-disallowed-list`](https://stylelint.io/user-guide/rules/rule-selector-property-disallowed-list/) restricts configurable combinations of selectors and properties.
