# prefer-current-color

📝 Prefer currentcolor over repeating the foreground color.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports a color that repeats the foreground `color` of the same block, and suggests [`currentcolor`](https://www.w3.org/TR/css-color-4/#currentcolor-color) instead.

There is no autofix because linking colors can change state, theme, and inheritance behavior, but a suggestion is provided. For example, inherited paint such as `fill` can follow the foreground colors of descendants, so review the suggestion when colors should change independently.

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

Every color position that the property grammar recognizes is checked, including backgrounds, gradients, shadows, SVG paint fallbacks, color mixing, and relative color origins.

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

## Color matching

- Each style block is compared independently, using only its direct declarations. Among `color` and `all` declarations, the last one with the highest importance wins. The winner must set `color` to one static named, hex, or absolute functional color.
- Named, hex, and RGB colors match exactly across representations. Other colors match structurally, allowing differences in case, whitespace, some equivalent numeric spellings, and function aliases.
- A comment inside a matched color prevents the suggestion, but not the report. Other comments are kept.

## Limitations

The rule:

- Never replaces `color` or custom property values.
- Ignores keyframes, descriptors, and CSS Modules interop blocks.
- Ignores a block when the foreground is a system color or has missing components (`none`).
- Ignores declarations whose complete grammar it cannot match, including values with `var()` or unknown syntax.
- Does not infer inherited foregrounds, inspect other blocks, resolve custom properties, or model browser-specific fallback support.

## Related rules

- [`prefer-existing-custom-properties`](./prefer-existing-custom-properties.md) suggests a configured custom property for a matching value, while this rule follows the element's `color`.
