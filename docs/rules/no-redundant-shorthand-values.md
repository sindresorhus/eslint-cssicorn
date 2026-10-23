# no-redundant-shorthand-values

📝 Disallow redundant values in CSS shorthand properties.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule removes repeated values and default components from shorthands when their complete expansion stays equivalent.

## Examples

```css
/* ❌ */
.button {
	margin: 1px 1px 1px 1px;
	border-radius: 4px 4px 4px 4px;
	place-items: center center;
	contain-intrinsic-size: auto 100px auto 100px;
	background-repeat: round round, space space;
}

/* ✅ */
.button {
	margin: 1px;
	border-radius: 4px;
	place-items: center;
	contain-intrinsic-size: auto 100px;
	background-repeat: round, space;
}
```

```css
/* ❌ */
.example {
	border: 1px solid currentColor;
	font: normal normal 16px/normal sans-serif;
	flex-flow: row nowrap;
}

/* ✅ */
.example {
	border: 1px solid;
	font: 16px sans-serif;
	flex-flow: row;
}
```

```css
/* ❌ */
.example {
	background: 0% 0% / auto repeat scroll padding-box border-box red;
	animation: 1s ease 0s 1 normal none running slide;
	transition: opacity 1s ease 0s normal;
}

/* ✅ */
.example {
	background: red;
	animation: 1s slide;
	transition: opacity 1s;
}
```

These are not reported:

```css
/* ✅ */
.button {
	margin: 1px 2px 3px 2px;
	border-radius: 4px / 4px;
	padding: var(--padding) var(--padding);
}
```

## Repeated values

- Physical edges: `margin`, `padding`, `border-color`, `border-style`, `border-width`, `scroll-margin`, `scroll-padding`, and `inset`, including their logical variants.
- `gap`, `grid-gap`, `overflow`, `overscroll-behavior`, `border-spacing`, `scroll-snap-align`, and `interest-delay`.
- `border-radius`, individual physical and logical corner radii, and `corner-shape` and its side shorthands.
- `place-content`, `place-items`, `place-self`, and `contain-intrinsic-size`, including repeated `auto` and size groups.
- `background-repeat` and `mask-repeat`, independently in each comma-separated layer.
- `border-image-repeat`, `border-image-slice`, `border-image-width`, and `border-image-outset`. Slice values containing `fill` are retained.

Four-value edges are reduced to one or two values, but not three. This exception does not apply to `border-radius` or `corner-shape`.

Slash-separated `border-radius` values are shortened independently. `-webkit-border-radius` without a slash is never shortened to two values, because WebKit and Blink interpret those as separate horizontal and vertical radii.

## Default components

Default omission supports these unprefixed shorthands:

- Borders: `border` and its side shorthands, `border-image`, `outline`, and `column-rule`.
- Layout: `offset`, `flex-flow`, `flex`, `columns`, `container`, `position-try`, `scroll-timeline`, and `view-timeline`.
- Text: `font`, `list-style`, `text-decoration`, `text-emphasis`, `text-box`, `text-wrap`, and `white-space`.
- Layers: `background`, `mask`, `animation`, and `transition`.

Equivalent defaults include constant numeric expressions, transparent-black hexadecimal and RGB colors, and `cubic-bezier(.25, .1, .25, 1)` for `ease`. Comparisons are exact and respect CSS types.

Names, nondefault components, and layer counts are preserved. Components needed to disambiguate other values are retained, as in `animation: 1s ease ease` and `transition: opacity 0s 1s`.

Explicit animation duration `0s` is retained because omitted duration defaults to `auto`, which can behave differently with scroll timelines. For `flex`, omitted grow and shrink factors are `1`; explicit bases are retained. For `text-box`, omitted trimming defaults to `trim-both`, rather than the longhand's initial `none`.

## Limitations

- Invalid or unsupported syntax is ignored, including `border-image` with two slashes and `mask` with `no-clip`.
- `flex` with functions or unitless zeros, `offset` with calculated positions, distances, or angles, and `animation` with ambiguous calculation types are ignored.
- Multiple `border-image` slice and width values, explicit outline colors, and mask origin and clip boxes are retained.
- Declarations containing `random()` or substitution functions such as `var()`, `attr()`, `env()`, and custom functions are ignored.
- Repeated positional values are compared without evaluation. Numeric spellings such as `1px` and `1.0px` remain distinct.
- Default components in query conditions such as `@supports`, `@import supports()`, and `@container style()` are retained.
- CSS Modules `:export` and `:import()` declarations are ignored because JavaScript reads them as exact strings.
- The autofix is skipped if it would remove a comment.
