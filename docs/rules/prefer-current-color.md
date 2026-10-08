# prefer-current-color

📝 Prefer currentcolor over repeating the foreground color.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Suggest `currentcolor` when another declaration repeats the block's foreground color. This expresses a relationship to `color`, so borders, decorations, backgrounds, and SVG paint can follow foreground changes in states and themes.

This rule provides suggestions instead of autofixes because matching literals do not prove that the author wants those colors to stay linked.

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

The rule checks all color positions recognized by the CSS grammar, including gradients, shadows, SVG paint fallbacks, color mixing, and relative-color origins.

```css
/* ❌ */
.icon {
	color: red;
	fill: red;
}

/* ✅ */
.icon {
	color: red;
	fill: currentcolor;
}
```

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

## Matching

Only direct declarations within the same style block are compared. Among `color` and `all` declarations, `!important` takes priority, then source order. The winning declaration must set `color` to one static named, hexadecimal, or absolute functional color. Nested style rules and grouping blocks are checked independently.

Colors are compared conservatively within the same representation. Case, whitespace, numeric spellings, and function aliases can match, but equivalent colors written in different representations do not: `red` does not match `#f00`, and `#fff` does not match `#ffffff`.

The rule never replaces `color` declarations or custom-property values. It skips keyframes, descriptors, CSS Modules interop blocks, winning resets, system colors, dynamic foreground values, and foreground functions with missing components (`none`). Target declarations are skipped when their complete CSS grammar cannot be matched, including values containing `var()` or unknown syntax.

Comments surrounding a replaced color are preserved. If a comment is inside the color being replaced, the rule reports it without a suggestion.

## Relationship changes

Accepting a suggestion makes the target follow the element's foreground color. Another rule, a state, or a theme can change that foreground independently of the original literal. For inherited properties such as `fill` and `text-shadow`, descendants can start following their own foreground color instead of inheriting the fixed literal.

The rule does not infer inherited foregrounds, inspect other blocks, resolve custom properties, or model browser-specific fallback support. Review each suggestion when the colors are intended to change independently.

See [the `currentcolor` specification](https://www.w3.org/TR/css-color-4/#currentcolor-color). Unlike `prefer-existing-custom-properties`, which suggests configured tokens, this rule suggests following the element's foreground.
