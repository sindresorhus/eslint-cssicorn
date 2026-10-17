# consistent-property-order

📝 Enforce consistent ordering of CSS properties.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces a consistent property order within declaration groups. The default is [Concentric CSS](https://github.com/brandon-rhodes/Concentric-CSS), which goes from layout and positioning through the box model to typography.

The rule autofixes the order when this cannot change the cascade, and otherwise provides a suggestion. See [Autofixes and suggestions](#autofixes-and-suggestions).

This rule is not in the recommended configs, because property order is a team preference.

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

Moving `margin` before `margin-left` changes which value wins for the left margin, so the rule provides a suggestion instead of an autofix:

```css
/* ❌ */
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

## Options

### order

Type: `'concentric-css' | 'alphabetical' | string[]`\
Default: `'concentric-css'`

#### concentric-css

Use the Concentric CSS order from a [fixed property list](https://github.com/Siilwyn/css-declaration-sorter/blob/v7.4.0/src/orders/concentric-css.mjs).

`font-width` shares the position of its legacy alias `font-stretch`, so their relative order is kept. Properties that are not in the list, such as `interpolate-size`, stay in place and separate declaration groups. Alphabetical and custom ordering can include other supported properties.

#### alphabetical

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

Provide a nonempty array of unique property names, matched case-insensitively. Listed properties come first, in the given order, and other supported properties follow in their original relative order. When differently written names normalize to the same property, the first occurrence determines its position.

```js
{
	order: [
		'display',
		'position',
	],
}
```

```css
/* ❌ */
a {
	color: red;
	position: absolute;
	display: flex;
}

/* ✅ */
a {
	display: flex;
	position: absolute;
	color: red;
}
```

A custom order does not enable sorting of unsupported properties.

## Autofixes and suggestions

The rule autofixes a group only when the reordered declaration pairs do not affect overlapping properties. Reordering shorthands, aliases, or logical and physical properties, or moving `all` across another declaration, can change the cascade, so these get a suggestion. Review suggestions before you apply them, and disable the rule when the original order is intentional.

The safety check is conservative: properties in the same logical-property group, such as `width` and `height`, can get suggestions even when their physical declarations are independent.

Fixes and suggestions keep the relative order of repeated declarations (including value fallbacks), the formatting, and the semicolons.

## Declaration groups

Comments, blank lines, nested constructs, custom properties, and unsupported properties (most vendor-prefixed properties and some legacy aliases) separate groups. Declarations that contain a comment, or that are followed by a comment on the same line, stay in place.

The rule applies to style rules, keyframes, nested grouping at-rules, `@position-try`, `@page`, and the direct page-margin boxes of `@page`.

## Tailwind CSS

With the [Tailwind parser extension](https://github.com/eslint/css#configuring-tailwind-syntax), the rule supports `@utility` definitions, and `@variant` blocks inside style rules or utilities. `@apply` separates groups. Other Tailwind at-rule blocks are skipped.

## Limitations

- Descriptor blocks other than `@position-try`, `@page`, and page-margin boxes, and CSS Modules interop blocks, are not checked.
- Blocks that contain the target line of an `eslint-disable-line` or `eslint-disable-next-line` comment are skipped, so that the comment keeps its target.
