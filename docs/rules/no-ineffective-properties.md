# no-ineffective-properties

📝 Disallow properties that have no effect given other declarations or shorthand defaults.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports declarations that have no effect because of another declaration in the same block or an explicit nested parent layout, and shorthands that omit a component that defaults to `none`.

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

- Flex, grid, multicolumn, and table controls with an incompatible visible `display` mode.
- `vertical-align` on explicitly block-level boxes, except known flex and grid items. Inline-level boxes, including `inline-flex` and `inline-grid`, and table cells are allowed.
- `justify-self` and grid placement on known flex items; flex sizing on known grid items.
- Non-`none` floats, clearance, shape controls, and `column-span: all` on known flex or grid items.
- Flex sizing, grid placement, `order`, and `align-self` on known ordinary flow children.
- `z-index` other than `auto` on known ordinary flow children with explicit `position: static`.
- `justify-self`, `place-self`, and `column-span: all` on explicitly inline-level or floated flow children; `vertical-align` on floated flow children.
- `align-content`, `flex-line-count`, and cross-axis gaps on explicitly single-line flex containers. Gap checks also require a known direction; main-axis gaps and the `gap` shorthand are allowed.
- `row-gap` with explicit ordinary flow display and `column-wrap: nowrap`.
- Gaps and `justify-content` on table boxes. Gap checks include the `grid-*` aliases.
- Physical and logical insets with `position: static`.
- Anchor placement and position fallback controls with explicit static, relative, or sticky positioning. `position-anchor` is allowed because descendants can use it through `match-parent`.
- `position-try-order` with `position-try-fallbacks: none`.
- Non-`none` floats, clearance, `column-span: all`, flex sizing, `order`, `vertical-align`, and break controls with absolute or fixed positioning. Self-alignment and grid placement are allowed.
- `border-spacing` and padding with `border-collapse: collapse` on `display: table` or `inline-table`.
- `perspective-origin` with `perspective: none`; `offset-distance`, `offset-rotate`, and `offset-anchor` with `offset-path: none`.
- `offset-position` with a single coordinate-box path such as `offset-path: border-box`. Functions and combined path values are allowed.
- `shape-image-threshold` with `shape-outside: none`, a basic shape, or a shape box. Thresholds only affect image-based shapes.
- Decoration color, style, thickness, and inset with `text-decoration-line: none`, `spelling-error`, or `grammar-error`. Inherited underline and skip controls remain allowed.
- Outline color, width, and offset with `outline-style: none`; `column-rule-color` with `column-rule-style: none` or `hidden`. Column rule width can still affect crossing gap decorations.
- Related image controls when `background-image`, `border-image-source`, `mask-image`, or `mask-border-source` is `none`.
- `scroll-snap-stop: always` when `scroll-snap-align` disables snapping on both axes.
- `view-transition-class` and `view-transition-group` with `view-transition-name: none`. `view-transition-scope` remains allowed.
- Related animation or transition controls with `animation-name: none` or `transition-property: none`.
- Related timeline controls with `scroll-timeline-name`, `view-timeline-name`, or `timeline-trigger-name` set to `none`; trigger range controls with `timeline-trigger-source: none`.
- Omitted styles in border shorthands, `outline`, `column-rule`, and `text-emphasis`, omitted lines in `text-decoration`, and omitted names in `animation` lists where no item has a name.

## Layout applicability

Direction-only `flex-flow` values imply `nowrap`; `balance` enables wrapping even when `wrap` is omitted.

A flex or grid container can still be an inline-level box:

```css
/* ❌ */
.badge {
	display: flex;
	vertical-align: middle;
}

/* ✅ */
.badge {
	display: inline-flex;
	vertical-align: middle;
}
```

[`justify-self` does not apply to flex items](https://www.w3.org/TR/css-align-3/#justify-self-property), and grid placement requires a grid parent:

```css
/* ❌ */
.container {
	display: flex;

	> .item {
		justify-self: center;
		grid-column: 2;
	}
}

/* ✅ */
.container {
	display: grid;

	> .item {
		justify-self: center;
		grid-column: 2;
	}
}
```

An item's own display does not determine its parent's layout. Flex sizing requires a flex parent:

```css
/* ❌ */
.container {
	display: grid;

	> .item {
		display: flex;
		flex: 1;
	}
}

/* ✅ */
.container {
	display: flex;

	> .item {
		display: flex;
		flex: 1;
	}
}
```

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

- Only unambiguous declarations in the same style block are checked, including the blocks of nested rules and conditional at-rules, except for the explicit parent layout checks described below.
- Other selectors, states, stylesheets, and browser adjustments are not inferred.
- Blocks that contain `all`, keyframes, descriptor blocks, and CSS Modules interop blocks are not checked.
- Except for the shorthand defaults, each check needs an explicit controlling declaration, and is skipped when the control is unsupported or repeated (also through a shorthand or a prefixed alias), or when the control or the affected declaration uses a CSS-wide value, a substitution, or `random()`.

Display and disabled effects:

- Display checks ignore `display: none` and `display: contents`.
- A disabled effect needs a single `none` value in the controlling longhand, except that text decoration controls also check `spelling-error` and `grammar-error`, column rule colors also check `hidden`, `offset-position` checks coordinate-box keywords, and `shape-image-threshold` also checks basic shapes and shape boxes.
- The multicolumn row gap check skips competing `columns` shorthands because they reset `column-wrap`.
- The background image checks also treat the draft `background-tbd` image-layer shorthand as a competing controller.
- The scroll snap check also accepts `scroll-snap-align: none none`. Explicit `scroll-snap-stop: normal` and all-`normal` background blending lists are allowed as resets.
- Basic shapes and shape boxes must match the CSS grammar. The installed grammar does not currently recognize a single percentage radius such as `circle(50%)`, so that form is skipped.
- Text overflow is not checked because [native text input controls](https://www.w3.org/TR/css-ui-4/#input-text) can show ellipsis regardless of their outer display and overflow.

Parent layout:

- Only nested direct child selectors such as `> .item` and `&.active > .item` immediately inside an explicit flex, grid, or ordinary flow container are checked. Every selector in a list must select direct children; type, class, ID, attribute, and standard pseudo-class filters are supported.
- Separate rules, descendant selectors, pseudo-elements, framework pseudo-classes such as `:global()`, and relationships through intervening conditional blocks are skipped.
- Absolutely positioned and fixed children, ambiguous positioning, and hidden, boxless, or ambiguous child display are skipped. An omitted position is treated as in-flow; the `z-index` check additionally requires explicit `position: static`.
- Known flex and grid items are allowed to use `vertical-align` because its `alignment-baseline` component can apply to them.

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
