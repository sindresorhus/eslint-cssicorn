# consistent-property-order

📝 Enforce consistent ordering of CSS properties.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces consistent property ordering within declaration groups. By default, it uses [Concentric CSS](https://github.com/brandon-rhodes/Concentric-CSS), which orders properties from layout and positioning through the box model to typography. The property order is adapted from [`css-declaration-sorter`](https://github.com/Siilwyn/css-declaration-sorter).

## Examples

```css
/* ❌ */
a {
	color: #fff;
	display: flex;
}

/* ✅ */
a {
	display: flex;
	color: #fff;
}
```

## Options

### `order`

Type: `'concentric-css' | 'alphabetical' | string[]`\
Default: `'concentric-css'`

#### `'concentric-css'`

Use the Concentric CSS property order, as shown above. The preset uses a [fixed property list](https://github.com/Siilwyn/css-declaration-sorter/blob/v7.4.0/src/orders/concentric-css.mjs).

The modern `font-width` property shares the position of its legacy alias, `font-stretch`. Their relative order is preserved in this mode. Other properties absent from the list, such as `interpolate-size`, remain in place and separate declaration groups. Alphabetical and custom ordering can include them when their interaction metadata is supported.

#### `'alphabetical'`

Order properties alphabetically, comparing normalized CSS property names.

```js
{
	rules: {
		'cssicorn/consistent-property-order': ['error', {order: 'alphabetical'}],
	},
}
```

```css
/* ❌ */
a {
	display: flex;
	color: red;
}

/* ✅ */
a {
	color: red;
	display: flex;
}
```

#### Custom order

Provide a nonempty array of unique property names. The array replaces the default order. Property names are matched case-insensitively; when differently written names normalize to the same property, the first occurrence determines its position.

```js
{
	rules: {
		'cssicorn/consistent-property-order': ['error', {
			order: ['display', 'position', 'margin', 'padding', 'color'],
		}],
	},
}
```

Properties not listed in the array separate declaration groups and are left in place. A custom order does not enable sorting unsupported properties.

## Autofixes and suggestions

The rule autofixes a group only when the changed declaration pairs do not affect overlapping properties. It preserves the relative order of repeated declarations, including value fallbacks.

Reordering shorthands, aliases, or logical and physical properties can change the cascade. These cases receive a suggestion instead of an autofix. Moving `all` across another declaration also requires a suggestion. Review these suggestions before applying them; disable the rule when the original order is intentional.

```css
/* ❌: Suggestion only, because reordering changes the margin override. */
a {
	margin-left: 2px;
	margin: 1px;
}

/* ✅ */
a {
	margin: 1px;
	margin-left: 2px;
}
```

The safety check is conservative. Properties in the same logical-property group, such as `width` and `height`, can receive suggestions even when their physical declarations are independent.

## Declaration groups

Comments, blank lines, nested rules, and nested at-rules separate declaration groups. Declarations containing comments remain in place. The rule preserves semicolons, indentation, and line endings, including when the final declaration has no semicolon.

Custom properties, unknown properties, legacy `page-break-*` and `glyph-orientation-vertical` properties, and properties missing from the selected order also separate groups. The `rule-inset-cap`, `rule-inset-junction`, and `rule-visibility-items` shorthands are also excluded because their interaction metadata is incomplete.

The standardized `-webkit-text-fill-color`, `-webkit-text-stroke`, `-webkit-text-stroke-width`, and `-webkit-text-stroke-color` properties are supported. Other vendor-prefixed properties separate groups.

Style declarations inside keyframes and nested grouping at-rules are supported, as are declarations in `@position-try`, `@page`, and page-margin boxes directly inside `@page`. Unsupported page descriptors, such as `page-orientation`, remain in place and separate groups. Other descriptor blocks, such as `@font-face` and `@property`, and CSS Modules interop blocks are excluded.

Blocks spanning a line targeted by `eslint-disable-line` or `eslint-disable-next-line` are skipped so sorting cannot change the directive's target.
