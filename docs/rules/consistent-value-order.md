# consistent-value-order

📝 Enforce consistent ordering of CSS value components.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Supported properties and exclusions are intentionally explicit rather than inferred from every CSS grammar. -->

Enforces these authoring orders for interchangeable value components:

- `border` and its physical and logical side or axis shorthands: width, style, color.
- `outline` and `column-rule`: width, style, color.
- `flex-flow`: direction, wrap.
- `box-shadow`: inset, lengths, color.
- `text-shadow`: lengths, color.
- `columns`: width, count; preserves any `/ height` suffix.
- `text-decoration`: lines, thickness, style, color.
- `text-emphasis`: style, color.
- `text-wrap`: mode, style.
- `white-space`: collapse, wrapping, trimming.

Checks shadow layers independently, preserving length order, layer order, and keyword order within each component. Single-keyword values remain unchanged.

Supports casing, CSS escapes, vendor prefixes, recognized math and color functions (including `random()`), and substitutions inside them, such as `rgb(var(--channels))`. Fixes preserve original spelling and whitespace, adding spaces where needed to separate tokens.

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

- Checks component structure without resolving substitutions; it may report declarations browsers reject. White space trimming may require `languageOptions.customSyntax`.
- Ignores custom properties and CSS Modules interop declarations. Skips groups with substitutions outside known color or math functions, or reordering that would exchange components containing substitutions or random functions.
- Reports without fixing when a component that must move contains comments. Comments between components and inside unchanged components are preserved.
- For `columns`, unitless zero is ignored; use `0px` for zero width. Ambiguous math component roles may go unreported.
