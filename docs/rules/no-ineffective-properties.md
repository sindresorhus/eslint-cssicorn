# no-ineffective-properties

📝 Disallow properties that have no effect given other declarations in the same block.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Catch declarations that have no effect given explicit declarations in the same block, such as leftovers from a layout refactor.

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

Ellipsis needs a block container with clipped inline overflow; `white-space: nowrap` and dimensions are not required. Strings and `fade` values are not checked.

`border-spacing` is inherited and can still affect descendant tables with separate borders. Disable the rule when intentionally supplying inherited spacing.

## Scope

Only explicit, unambiguous declarations in the same style block are compared, including nested rules and conditional blocks. Missing or unsupported controls, repeated controls (including shorthands and prefixed aliases), CSS-wide values, substitutions, and `random()` are skipped. Display checks ignore `none` and `contents`.

Disabled effects require a single `none` in the controlling longhand; visible overflow requires the `overflow` shorthand. Blocks containing `all`, keyframes, descriptors, and CSS Modules interop blocks are excluded.

Other selectors, states, parent layout, and browser adjustments are not inferred. Disable intentional reports. There are no fixes or suggestions, since changing declarations could affect other states. Use `css/no-invalid-properties` to validate CSS.

Animation controls inside keyframes and final-keyframe easing are covered by [`no-ineffective-keyframe-declarations`](./no-ineffective-keyframe-declarations.md).
