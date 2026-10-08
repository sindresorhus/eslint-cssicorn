# no-ineffective-properties

📝 Disallow properties that have no effect given other declarations or shorthand defaults.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Catch ineffective declarations in the same block and omitted shorthand components that default to `none`.

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
- Omitted styles in border shorthands, `outline`, `column-rule`, and `text-emphasis`; omitted lines in `text-decoration`; omitted names in wholly nameless `animation` lists.

Ellipsis needs a block container with clipped inline overflow; `white-space: nowrap` and dimensions are not required. Strings and `fade` values are not checked.

`border-spacing` is inherited and can still affect descendant tables with separate borders. Disable the rule when intentionally supplying inherited spacing.

## Scope

Only unambiguous declarations in the same style block are checked, including nested rules and conditional blocks. Except for the shorthand defaults above, checks require explicit controls. Missing or unsupported controls, repeated controls (including shorthands and prefixed aliases), CSS-wide values, substitutions, and `random()` are skipped. Display checks ignore `none` and `contents`.

Disabled effects require a single `none` in the controlling longhand; visible overflow requires the `overflow` shorthand. Blocks containing `all`, keyframes, descriptors, and CSS Modules interop blocks are excluded.

Shorthand checks require a grammar match. Explicit styles or lines (including `none`) and literal zero border, outline, or column-rule widths pass. Expressions are not evaluated; numeric ranges are not validated. Animation checks skip named values, unquoted `none` or `auto`, and matched timelines; nameless easing-only and zero-duration values still report.

Another corresponding shorthand or style, line, or name longhand in the same block suppresses the check, regardless of value, order, or `!important`. Borders also accept controls for any physical or logical side, `border-image`, and `border-image-source`; `column-rule` also accepts `rule` and `rule-style`. Prefixed counterparts suppress reports but are not checked. Width, color, thickness, radius, and border-image sizing alone do not suppress reports.

Other selectors, states, stylesheets, parent layout, and browser adjustments are not inferred. For intentional preparation for another state, use `/* eslint-disable-next-line cssicorn/no-ineffective-properties */`. There are no fixes or suggestions. Use `css/no-invalid-properties` to validate CSS.

Animation controls inside keyframes and final-keyframe easing are covered by [`no-ineffective-keyframe-declarations`](./no-ineffective-keyframe-declarations.md).
