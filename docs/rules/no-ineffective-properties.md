# no-ineffective-properties

📝 Disallow properties that have no effect given other declarations or shorthand defaults.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports declarations that have no effect because of another declaration in the same block, and shorthands that omit a component that defaults to `none`.

There is no autofix because the rule cannot know whether the ineffective declaration or the declaration that disables it is wrong.

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

- `flex-direction`, `flex-wrap`, `flex-flow`, grid templates and auto-placement, and `table-layout` with an incompatible visible `display` mode.
- `columns`, `column-count`, `column-width`, and `column-fill` with flex or grid display.
- `align-content` on a flex container with explicit `nowrap` in `flex-wrap` or `flex-flow`. Use `align-items` or wrapping instead.
- Physical and logical insets with `position: static`.
- Floats other than `none`, clearance, and `column-span: all` with `position: absolute` or `fixed`.
- `border-spacing` and padding with `border-collapse: collapse` on `display: table` or `inline-table`.
- `perspective-origin` with `perspective: none`.
- `offset-distance`, `offset-rotate`, and `offset-anchor` with `offset-path: none`.
- `shape-image-threshold` with `shape-outside: none`.
- `text-decoration-color`, `text-decoration-style`, and `text-decoration-thickness` with `text-decoration-line: none`.
- Related image controls, such as position, size, repeat, slice, and compositing, when `background-image`, `border-image-source`, or `mask-image` is `none`.
- Related animation or transition controls with `animation-name: none` or `transition-property: none`.
- Related timeline axis and inset controls with `scroll-timeline-name: none` or `view-timeline-name: none`.
- Omitted styles in border shorthands, `outline`, `column-rule`, and `text-emphasis`, omitted lines in `text-decoration`, and omitted names in `animation` lists where no item has a name.

## Intentional declarations

`border-spacing` is inherited and can still affect descendant tables with separate borders, so disable the rule when you intentionally supply inherited spacing.

For a declaration that prepares for another state, use a disable comment:

```css
/* ✅ */
.menu {
	position: static;
	/* eslint-disable-next-line cssicorn/no-ineffective-properties -- The open state sets an absolute position. */
	inset-inline-start: 0;
}

.menu.open {
	position: absolute;
}
```

## Limitations

General:

- Only unambiguous declarations in the same style block are checked, including the blocks of nested rules and conditional at-rules.
- Other selectors, states, stylesheets, parent layout, and browser adjustments are not inferred.
- Blocks that contain `all`, keyframes, descriptor blocks, and CSS Modules interop blocks are not checked.
- Except for the shorthand defaults, each check needs an explicit controlling declaration, and is skipped when the control is unsupported or repeated (also through a shorthand or a prefixed alias), or when the control or the affected declaration uses a CSS-wide value, a substitution, or `random()`.

Display and disabled effects:

- Display checks ignore `display: none` and `display: contents`.
- A disabled effect needs a single `none` value in the controlling longhand.
- Text overflow is not checked because [native text input controls](https://www.w3.org/TR/css-ui-4/#input-text) can show ellipsis regardless of their outer display and overflow.

Shorthand defaults:

- A shorthand is only checked when it matches the grammar.
- Explicit styles or lines, including `none`, and literal zero widths for `border`, `outline`, and `column-rule` are not reported.
- Expressions are not evaluated, and numeric ranges are not validated.
- Another corresponding shorthand, or a style, line, or name longhand, in the same block turns off the check, regardless of its value, order, or `!important`. For borders, this also includes the controls for any physical or logical side, `border-image`, and `border-image-source`. For `column-rule`, it also includes `rule` and `rule-style`.
- Width, color, thickness, radius, and border-image sizing alone do not turn off the check.
- Prefixed counterparts turn off the check, but are not checked.

Animations:

- Animation checks skip named values, unquoted `none` or `auto`, and matched timelines.
- A nameless value with only easing, such as `animation: ease`, and a nameless value with zero duration, such as `animation: 0s`, are still reported.

## Related rules

- [`css/no-invalid-properties`](https://github.com/eslint/css/blob/main/docs/rules/no-invalid-properties.md) validates property names and values.
- [`no-ineffective-keyframe-declarations`](./no-ineffective-keyframe-declarations.md) reports animation controls inside keyframes and easing on the final keyframe.
- [`no-ineffective-selector-properties`](./no-ineffective-selector-properties.md) reports properties that have no effect on pseudo-elements and visited links.
