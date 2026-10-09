# prefer-current-color

📝 Prefer currentcolor over repeating the foreground color.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Suggest [`currentcolor`](https://www.w3.org/TR/css-color-4/#currentcolor-color) when a declaration repeats the same block's foreground color. Unlike [`prefer-existing-custom-properties`](./prefer-existing-custom-properties.md), which follows a configured token, this follows the element's `color`.

Uses suggestions because linking colors can change state, theme, and inheritance behavior. Inherited paint such as `fill` can follow descendants' foregrounds. Review suggestions when colors should change independently.

## Examples

```css
/* ❌ */
a {
	color: #6750a4;
	border: 1px solid #6750a4;
}

/* ✅ */
a {
	color: #6750a4;
	border: 1px solid currentcolor;
}
```

Checks all grammar-recognized color positions, including backgrounds, gradients, shadows, SVG paint fallbacks, color mixing, and relative-color origins.

```css
/* ❌ */
.button {
	color: red;
	background-color: color-mix(in srgb, red 25%, transparent);
}

/* ✅ */
.button {
	color: red;
	background-color: color-mix(in srgb, currentcolor 25%, transparent);
}
```

## Matching and limitations

- Compares direct declarations in each style block independently. Among `color` and `all`, `!important` takes priority, then source order. The winner must set `color` to one static named, hex, or absolute functional color.
- Matches equivalent named, hex, and RGB colors across representations without approximate comparisons. Other colors match structurally, allowing case, whitespace, some equivalent numeric spellings, and function aliases.
- Never replaces `color` or custom-property values. Skips keyframes, descriptors, CSS Modules interop blocks, winning resets, system colors, dynamic foregrounds, and foregrounds with missing components (`none`).
- Skips target declarations whose complete grammar cannot be matched, including values containing `var()` or unknown syntax.
- Preserves comments. A comment inside a matched color prevents the suggestion, but not the report.

Does not infer inherited foregrounds, inspect other blocks, resolve custom properties, or model browser-specific fallback support.
