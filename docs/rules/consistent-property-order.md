# consistent-property-order

📝 Enforce consistent ordering of CSS properties.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces consistent property ordering within declaration groups. By default, it uses [Concentric CSS](https://github.com/brandon-rhodes/Concentric-CSS), which orders properties from layout and positioning through the box model to typography.

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

The modern `font-width` property shares the position of its legacy alias, `font-stretch`. Their relative order is preserved in this mode. Other properties absent from the list, such as `interpolate-size`, remain in place and separate declaration groups. Alphabetical and custom ordering can include other supported properties.

#### `'alphabetical'`

Order properties alphabetically, comparing normalized CSS property names.

```js
{
	order: 'alphabetical',
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

Provide a nonempty array of unique property names. Listed properties come first in the specified order; other supported properties follow in their original relative order. Property names are matched case-insensitively; when differently written names normalize to the same property, the first occurrence determines its position.

```js
{
	order: [
		'display',
		'position',
	],
}
```

You only need to list properties you want first. A custom order does not enable sorting unsupported properties.

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

Comments, blank lines, nested constructs, custom properties, and unsupported properties separate groups. Concentric ordering also treats unlisted properties as boundaries. Declarations containing comments, or followed by a comment on the same line, stay in place. Unsupported properties include most vendor-prefixed properties and some legacy aliases.

The rule applies to style rules, keyframes, nested grouping at-rules, `@position-try`, `@page`, and its direct page-margin boxes. Other descriptor blocks and CSS Modules interop blocks are excluded.

Formatting and semicolons are preserved. Blocks containing target lines of `eslint-disable-line` or `eslint-disable-next-line` are skipped to preserve suppression targets.

## Tailwind CSS

Supports `@utility` definitions and `@variant` blocks inside style rules or utilities with the [Tailwind parser extension](https://github.com/eslint/css#configuring-tailwind-syntax). `@apply` separates groups; other Tailwind at-rule blocks are skipped.
