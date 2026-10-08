# consistent-value-order

📝 Enforce consistent ordering of CSS value components.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Supported properties and exclusions are intentionally explicit rather than inferred from every CSS grammar. -->

Enforces a fixed order for interchangeable value components. It preserves shadow length order and the order of comma-separated shadows, which both affect rendering.

| Properties | Order |
| --- | --- |
| `border` and its physical and logical side or axis shorthands | Width, style, color |
| `outline`, `column-rule` | Width, style, color |
| `flex-flow` | Direction, wrap |
| `box-shadow` | Inset, lengths, color |
| `text-shadow` | Lengths, color |
| `columns` | Width, count |

The border shorthands are `border`, `border-top`, `border-right`, `border-bottom`, `border-left`, `border-block`, `border-inline`, `border-block-start`, `border-block-end`, `border-inline-start`, and `border-inline-end`.

These orders are authoring conventions, not specification serialization orders. There are no options.

## Examples

```css
/* ❌ */
a {
	border: red solid 1px;
}

/* ✅ */
a {
	border: 1px solid red;
}
```

```css
/* ❌ */
a {
	flex-flow: wrap column;
}

/* ✅ */
a {
	flex-flow: column wrap;
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
	text-shadow: red 1px 2px;
}

/* ✅ */
a {
	text-shadow: 1px 2px red;
}
```

```css
/* ❌ */
a {
	columns: 3 20em;
}

/* ✅ */
a {
	columns: 20em 3;
}
```

## Limitations

- Only checks values recognized by the CSS lexer. Invalid values and unsupported newer syntax are left unchanged.
- Supports ASCII casing, CSS escapes, and vendor-prefixed spellings. Fixes retain the original spelling, spacing, indentation, and line endings, adding spaces where needed to keep component tokens separate.
- Reports out-of-order groups containing comments without fixing them, including comments inside functions.
- Ignores custom properties, CSS Modules `:export` and `:import()` declarations, substitutions such as `var()`, `env()`, and `attr()`, and random functions. Ordinary math and color functions are supported when their component roles are known.
- Only checks literal `columns` values containing dimensions, `auto`, and positive safe integers. Functions, slash syntax, and unitless zero are ignored because their roles can be ambiguous in the lexer. Use a length such as `0px` for an eligible zero width.
- Does not check other properties, including `list-style`, animation, transition, background, font, and grid shorthands. Reordering them requires additional interpretation that can change their meaning.
