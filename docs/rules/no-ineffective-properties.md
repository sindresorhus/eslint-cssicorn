# no-ineffective-properties

📝 Disallow properties that have no effect given other declarations or shorthand defaults.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- The examples pair each ineffective declaration with an effective alternative. -->

Catch declarations that have no effect given explicit declarations in the same block, such as leftovers from a layout refactor, and shorthands that omit the style or animation name needed for their intended effect.

## Examples

```css
/* ❌ */
a {
	display: flex;
	grid-template-columns: 1fr 1fr;
}

/* ✅ */
a {
	display: grid;
	grid-template-columns: 1fr 1fr;
}
```

```css
/* ❌ */
a {
	position: static;
	inset-inline-start: 20px;
}

/* ✅ */
a {
	position: relative;
	inset-inline-start: 20px;
}
```

```css
/* ❌ */
a {
	background-image: none;
	background-size: cover;
}

/* ✅ */
a {
	background-image: url("background.svg");
	background-size: cover;
}
```

```css
/* ❌ */
.card {
	border: 1px red;
}

/* ✅ */
.card {
	border: 1px solid red;
}
```

```css
/* ❌ */
.card {
	outline: 2px blue;
}

/* ✅ */
.card {
	outline: 2px auto blue;
}
```

```css
/* ❌ */
.card {
	animation: 2s ease;
}

/* ✅ */
.card {
	animation: 2s ease fade;
}
```

## Checks

The rule reports:

- `flex-direction`, `flex-wrap`, `flex-flow`, grid templates/auto-placement, and `table-layout` with an incompatible visible `display` mode.
- `columns`, `column-count`, `column-width`, and `column-fill` with flex or grid display.
- `align-content` on a flex container with explicit `nowrap` in `flex-wrap` or `flex-flow`; consider `align-items` or wrapping.
- Physical and logical insets with `position: static`.
- Non-`none` floats, clearance, and `column-span: all` with `position: absolute` or `fixed`.
- Ellipsis in `text-overflow` with flex/grid display or `overflow: visible` (including `visible visible`).
- `border-spacing` and padding on tables with `border-collapse: collapse`.
- `perspective-origin` with `perspective: none`.
- `offset-distance`, `offset-rotate`, and `offset-anchor` with `offset-path: none`.
- `shape-image-threshold` with `shape-outside: none`.
- `text-decoration-color`, `text-decoration-style`, and `text-decoration-thickness` with `text-decoration-line: none`.
- Related image controls, such as position, size, repeat, slice, and compositing, when `background-image`, `border-image-source`, or `mask-image` is `none`.
- Related animation or transition controls with `animation-name: none` or `transition-property: none`.
- Related timeline axis and inset controls with `scroll-timeline-name: none` or `view-timeline-name: none`.
- Omitted styles in `border`, physical and logical border side/axis shorthands, and `outline`, where the style defaults to `none`.
- Omitted animation names in `animation`, where the name defaults to `none`. A comma-separated list is reported only when every animation is nameless.

Ellipsis needs a block container with clipped inline overflow; `white-space: nowrap` and dimensions are not required. Strings and `fade` values are not checked.

`border-spacing` is inherited and can still affect descendant tables with separate borders. Disable the rule when intentionally supplying inherited spacing.

## Scope

Only unambiguous declarations in the same style block are checked, including nested rules and conditional blocks. Except for the shorthand defaults above, checks require explicit controls. Missing or unsupported controls, repeated controls (including shorthands and prefixed aliases), CSS-wide values, substitutions, and `random()` are skipped. Display checks ignore `none` and `contents`.

Disabled effects require a single `none` in the controlling longhand; visible overflow requires the `overflow` shorthand. Blocks containing `all`, keyframes, descriptors, and CSS Modules interop blocks are excluded.

Shorthand checks require a valid value and are suppressed by any competing declaration in the same block, regardless of order or `!important`. For borders, this includes any other physical or logical border shorthand, any border-style declaration, and `border-image` or `border-image-source`, since an image border can render without a border style. For outlines, it includes another `outline` or `outline-style`; for animations, another `animation` or `animation-name`. Vendor-prefixed counterparts also suppress reports, but prefixed shorthands are not reported. Width, color, radius, and border-image sizing declarations alone do not suppress reports.

Shorthand values with an explicit border/outline style are not reported. Literal zero widths are skipped as intentional resets. Expressions such as `calc(0px)` are not evaluated. Animation values containing an unquoted `none` keyword or any named animation are skipped. Quoted `"none"` is a name, and `animation: 2s ease ease` names the animation `ease`. Nameless easing-only values and zero-duration values are still reported.

Other selectors, states, parent layout, and browser adjustments are not inferred. Disable intentional reports. There are no fixes or suggestions, since changing declarations could affect other states. Use `css/no-invalid-properties` to validate CSS.

A shorthand may intentionally prepare a style or animation that another state enables. Suppress the report locally when using this pattern:

```css
.card {
	/* eslint-disable-next-line cssicorn/no-ineffective-properties */
	border: 1px red;
}

.card:hover {
	border-style: solid;
}
```

Animation controls inside keyframes and final-keyframe easing are covered by [`no-ineffective-keyframe-declarations`](./no-ineffective-keyframe-declarations.md).
