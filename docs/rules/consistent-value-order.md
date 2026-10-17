# consistent-value-order

📝 Enforce consistent ordering of CSS value components.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Supported properties and exclusions are intentionally explicit rather than inferred from every CSS grammar. -->

This rule enforces this order for interchangeable value components:

- `border` and its physical and logical side or axis shorthands: width, style, color.
- `outline` and `column-rule`: width, style, color.
- `flex-flow`: direction, wrap.
- `box-shadow`: inset, lengths, color.
- `text-shadow`: lengths, color.
- `columns`: width, count. A `/ height` suffix stays in place.
- `text-decoration`: lines, thickness, style, color.
- `text-emphasis`: style, color.
- `text-wrap`: mode, style.
- `white-space`: collapse, wrapping, trimming.

Each shadow layer is checked on its own, and the order of lengths, layers, and keywords within a component is kept. Values with a single keyword are not changed.

It supports any casing, CSS escapes, vendor prefixes, and recognized math and color functions (including `random()`), also with substitutions inside them, such as `rgb(var(--channels))`.

The autofix keeps the original spelling and whitespace, and adds spaces where tokens need to be separated.

## Examples

```css
/* ❌ */
a {
	border: red /* keep */ solid 1px;
}

/* ✅ */
a {
	border: 1px /* keep */ solid red;
}
```

```css
/* ❌ */
a {
	box-shadow: red 1px 2px 3px inset, blue 4px 5px;
}

/* ✅ */
a {
	box-shadow: inset 1px 2px 3px red, 4px 5px blue;
}
```

```css
/* ❌ */
a {
	text-decoration: red wavy underline 2px;
}

/* ✅ */
a {
	text-decoration: underline 2px wavy red;
}
```

## Limitations

- Substitutions are not resolved, so the rule can report declarations that browsers reject.
- The whitespace trimming component of `white-space` can require `languageOptions.customSyntax`.
- Custom properties and CSS Modules interop declarations are ignored.
- A value or shadow layer is ignored when it has substitutions outside known color or math functions, or when the reorder would exchange components that contain substitutions or random functions.
- There is no autofix when a component that must move contains a comment, because the fix would move the comment. Comments between components and inside unchanged components are kept.
- For `columns`, unitless zero is ignored, so use `0px` for a zero width.
- Math functions with an ambiguous component role can go unreported.
