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
	background-blend-mode: multiply;
}

/* ✅ */
a {
	background-image: url("background.svg");
	background-size: cover;
	background-blend-mode: multiply;
}
```

```css
/* ❌ */
.button {
	outline-style: none;
	outline-offset: 3px;
}

/* ✅ */
.button {
	outline-style: solid;
	outline-offset: 3px;
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

```css
/* ❌ */
.shape {
	float: left;
	shape-outside: circle(10px);
	shape-image-threshold: 0.5;
}

/* ✅ */
.shape {
	float: left;
	shape-outside: url("shape.png");
	shape-image-threshold: 0.5;
}
```

```css
/* ❌ */
.article {
	columns: 2;
	column-rule-style: none;
	column-rule-color: red;
}

/* ✅ */
.article {
	columns: 2;
	column-rule-style: solid;
	column-rule-color: red;
}
```

```css
/* ❌ */
.slide {
	scroll-snap-align: none;
	scroll-snap-stop: always;
}

/* ✅ */
.slide {
	scroll-snap-align: start;
	scroll-snap-stop: always;
}
```

```css
/* ❌ */
.card {
	mask-border-source: none;
	mask-border-slice: 25 fill;
}

/* ✅ */
.card {
	mask-border-source: url("mask.png");
	mask-border-slice: 25 fill;
}
```

```css
/* ❌ */
.card {
	view-transition-name: none;
	view-transition-class: card;
}

/* ✅ */
.card {
	view-transition-name: card;
	view-transition-class: card;
}
```

```css
/* ❌ */
.card {
	animation-name: none;
	animation-trigger: --reveal play;
}

/* ✅ */
.card {
	animation-name: reveal;
	animation-trigger: --reveal play;
}
```

```css
/* ❌ */
.link {
	text-decoration-line: none;
	text-decoration-inset: 2px;
}

/* ✅ */
.link {
	text-decoration-line: underline;
	text-decoration-inset: 2px;
}
```

```css
/* ❌ */
.card {
	timeline-trigger-name: none;
	timeline-trigger-source: view();
	timeline-trigger-activation-range: entry 10% exit 80%;
}

/* ✅ */
.card {
	timeline-trigger-name: --reveal;
	timeline-trigger-source: view();
	timeline-trigger-activation-range: entry 10% exit 80%;
}
```

## Checks

The rule reports:

- `flex-direction`, `flex-wrap`, `flex-flow`, `flex-line-count`, grid templates and auto-placement, and `table-layout` with an incompatible visible `display` mode.
- `vertical-align` with an explicitly block-level `display`, such as `block`, `flow-root`, `flex`, `grid`, or `table-caption`. Inline-level modes, including `inline-flex` and `inline-grid`, and table cells are allowed.
- `justify-self`, `grid-area`, `grid-row`, `grid-column`, `grid-row-start`, `grid-row-end`, `grid-column-start`, and `grid-column-end` on a known ordinary flex item selected by a nested child selector.
- `flex`, `flex-basis`, `flex-grow`, and `flex-shrink` on a known ordinary grid item selected by a nested child selector.
- Floats other than `none`, clearance, and `column-span: all` on known ordinary flex or grid items selected by a nested child selector.
- `shape-outside`, `shape-margin`, and `shape-image-threshold` on known ordinary flex or grid items selected by a nested child selector.
- Flex sizing, grid placement, `order`, and `align-self` on known children of an ordinary flow container, such as `display: block`, `flow-root`, or `inline-block`, selected by a nested child selector.
- `z-index` other than `auto` with explicit `position: static` on known children of an ordinary flow container selected by a nested child selector. Static flex and grid items are allowed.
- `justify-self`, `place-self`, and `column-span: all` on explicitly inline-level children of a known ordinary flow container selected by a nested child selector.
- `justify-self`, `place-self`, `vertical-align`, and `column-span: all` on floated children of a known ordinary flow container selected by a nested child selector.
- `columns`, `column-count`, `column-width`, `column-fill`, `column-height`, and `column-wrap` with flex, grid, or table display. Table cells and captions can still contain columns.
- `align-content` on a flex container with `nowrap` in `flex-wrap` or `flex-flow`, including the implicit `nowrap` in direction-only shorthands such as `flex-flow: column`. Use `align-items` or wrapping instead.
- `flex-line-count` on a flex container with explicit `nowrap`, including direction-only `flex-flow` shorthands. Ordinary wrapping containers are allowed, even without `balance`.
- `justify-content` on table boxes. Table cells and captions can still use it with multicolumn layout.
- `gap`, `row-gap`, and `column-gap`, including their `grid-*` aliases, on table boxes. Use `border-spacing` for spacing between cells.
- Cross-axis gaps on explicitly single-line flex containers with a known direction: `row-gap` for rows and `column-gap` for columns. Main-axis gaps and the `gap` shorthand are allowed.
- Physical and logical insets with `position: static`.
- `position-area`, `position-try`, `position-try-fallbacks`, `position-try-order`, and `position-visibility` with explicit `position: static`, `relative`, or `sticky`. These controls require absolute or fixed positioning.
- Floats other than `none`, clearance, and `column-span: all` with `position: absolute` or `fixed`.
- `flex`, `flex-basis`, `flex-grow`, `flex-shrink`, `order`, and `vertical-align` with `position: absolute` or `fixed`.
- `break-before`, `break-after`, `break-inside`, and their `page-break-*` aliases with `position: absolute` or `fixed`.
- Ellipsis in `text-overflow` with flex, grid, or table display, or with `overflow: visible` (including `visible visible`).
- `border-spacing` and padding with `border-collapse: collapse` on `display: table` or `inline-table`.
- `perspective-origin` with `perspective: none`.
- `offset-distance`, `offset-rotate`, and `offset-anchor` with `offset-path: none`.
- `shape-image-threshold` with `shape-outside: none`, a basic shape such as `circle()` or `polygon()`, or a shape box such as `margin-box`. Thresholds only affect image-based shapes, including gradients.
- `text-decoration-color`, `text-decoration-style`, `text-decoration-thickness`, and `text-decoration-inset` with `text-decoration-line: none`, `spelling-error`, or `grammar-error`. Error decorations use browser-defined styling.
- `outline-color`, `outline-width`, and `outline-offset` with `outline-style: none`.
- `column-rule-color` with `column-rule-style: none`. Column rule width is allowed because it can affect crossing gap decorations.
- Related image controls, such as position, size, repeat, slice, and compositing, when `background-image`, `border-image-source`, or `mask-image` is `none`.
- `mask-border-mode`, `mask-border-slice`, `mask-border-width`, `mask-border-outset`, and `mask-border-repeat` with `mask-border-source: none`.
- `view-transition-class` with `view-transition-name: none`.
- Non-`normal` background blending with `background-image: none`.
- `scroll-snap-stop: always` with `scroll-snap-align: none` or `none none`. Mixed values such as `none start` are allowed because they still define a snap position on one axis.
- Related animation controls, including `animation-trigger`, with `animation-name: none`, and transition controls with `transition-property: none`.
- Related timeline axis and inset controls with `scroll-timeline-name: none` or `view-timeline-name: none`.
- `timeline-trigger-source`, `timeline-trigger-activation-range`, and `timeline-trigger-active-range`, including range start and end longhands, with `timeline-trigger-name: none`.
- Omitted styles in border shorthands, `outline`, `column-rule`, and `text-emphasis`, omitted lines in `text-decoration`, and omitted names in `animation` lists where no item has a name.

Ellipsis needs a block container with clipped inline overflow. `white-space: nowrap` and dimensions are not required.

## Layout applicability

`vertical-align` aligns inline-level boxes or table cells. A flex or grid container can still be an inline-level box:

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

[`justify-self` does not apply to flex items](https://www.w3.org/TR/css-align-3/#justify-self-property). Use `align-self` for cross-axis alignment, or the parent's `justify-content` for main-axis alignment:

```css
/* ❌ */
.container {
	display: flex;

	& > .item {
		justify-self: center;
	}
}

/* ✅ */
.container {
	display: flex;

	& > .item {
		align-self: center;
	}
}
```

Grid placement requires a grid parent:

```css
/* ❌ */
.container {
	display: flex;

	> .item {
		grid-column: 2;
	}
}

/* ✅ */
.container {
	display: grid;

	> .item {
		grid-column: 2;
	}
}
```

Flex sizing requires a flex parent, even if the item itself has flex display. An explicit ordinary flow parent, such as `display: block`, `flow-root`, or `inline-block`, also makes flex sizing, grid placement, `order`, and `align-self` ineffective on its ordinary direct children. `justify-self` and `place-self` are allowed on non-floating block-level flow items. Floats and clearance are also allowed in flow layout.

```css
/* ❌ */
.container {
	display: grid;

	> .item:not(.hidden) {
		display: flex;
		flex: 1;
	}
}

/* ✅ */
.container {
	display: flex;

	> .item:not(.hidden) {
		display: flex;
		flex: 1;
	}
}
```

Inline-level boxes in ordinary flow cannot use `justify-self`, `place-self`, or `column-span: all`. Changing the box to a block-level box enables inline-axis self-alignment and column spanning:

```css
/* ❌ */
.container {
	display: block;
	columns: 2;

	> .item {
		display: inline-flex;
		justify-self: center;
		column-span: all;
	}
}

/* ✅ */
.container {
	display: block;
	columns: 2;

	> .item {
		display: flex;
		justify-self: center;
		column-span: all;
	}
}
```

Inline display on a flex or grid item is blockified, so the ordinary flow check does not apply to these items. Absolutely positioned and fixed boxes can also use self-alignment.

Shape controls require a float or an initial-letter box. An ordinary flex or grid item is neither, and adding `float` does not change this because flex and grid items ignore it:

```css
/* ❌ */
.container {
	display: flex;

	> .item {
		float: left;
		shape-outside: circle();
		shape-margin: 8px;
	}
}

/* ✅ */
.container {
	display: block;

	> .item {
		float: left;
		shape-outside: circle();
		shape-margin: 8px;
	}
}
```

Multicolumn layout requires a block container other than a table wrapper. A table cannot itself be a multicolumn container:

```css
/* ❌ */
.article {
	display: table;
	columns: 2;
	column-height: 20rem;
	column-wrap: wrap;
}

/* ✅ */
.article {
	display: block;
	columns: 2;
	column-height: 20rem;
	column-wrap: wrap;
}
```

`grid-gap`, `grid-row-gap`, and `grid-column-gap` are standard aliases for `gap`, `row-gap`, and `column-gap`. The table and single-line flex gap checks also cover these aliases.

Table boxes use `border-spacing` instead of gaps between cells:

```css
/* ❌ */
.table {
	display: table;
	gap: 1rem;
}

/* ✅ */
.table {
	display: table;
	border-spacing: 1rem;
}
```

`justify-content` aligns items or columns inside flex, grid, or multicolumn containers. It cannot align a table's cells:

```css
/* ❌ */
.layout {
	display: table;
	justify-content: center;
}

/* ✅ */
.layout {
	display: grid;
	justify-content: center;
}
```

Cross-axis flex gaps separate flex lines. A container with `nowrap` has only one line, so only its main-axis gap can add spacing:

```css
/* ❌ */
.toolbar {
	display: flex;
	flex-flow: row nowrap;
	row-gap: 1rem;
}

/* ✅ */
.toolbar {
	display: flex;
	flex-flow: row nowrap;
	column-gap: 1rem;
}
```

`balance` enables wrapping, including when `wrap` is omitted in `flex-wrap: balance` or `flex-flow: row balance`. Alignment and cross-axis gaps are allowed in these containers.

The gap check requires explicit direction and wrapping controls. An explicit `flex-wrap: nowrap` also needs an explicit `flex-direction`. The `flex-flow` shorthand supplies omitted defaults, so `flex-flow: column` and `flex-flow: nowrap` establish both controls. The `gap` shorthand is allowed because it can still space items along the main axis.

`flex-line-count` needs a wrapping flex container:

```css
/* ❌ */
.cards {
	display: flex;
	flex-wrap: nowrap;
	flex-line-count: 3;
}

/* ✅ */
.cards {
	display: flex;
	flex-wrap: wrap;
	flex-line-count: 3;
}
```

`column-span: all` cannot make a flex or grid item span columns. Flex and grid containers establish their own formatting contexts, so their items cannot span an outer multicolumn container. A flex or grid container can itself span columns when it participates in ordinary flow layout.

Floated children of an ordinary flow container cannot use `justify-self`, `place-self`, `vertical-align`, or `column-span: all`. The parent layout must be explicit because flex and grid items ignore `float`, so their alignment can still apply:

```css
/* ❌ */
.container {
	display: block;

	> .item {
		float: left;
		justify-self: center;
		vertical-align: middle;
	}
}

/* ✅ */
.container {
	display: block;

	> .item {
		float: none;
		justify-self: center;
		vertical-align: middle;
	}
}
```

A table box does not directly hold inline text for ellipsis. Apply `text-overflow` to a table cell or another block container holding the text:

```css
/* ❌ */
.label {
	display: table;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* ✅ */
.label {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
}
```

Absolute and fixed positioning take a box out of flow. Flex sizing, item ordering, and inline vertical alignment no longer apply:

```css
/* ❌ */
.container {
	display: flex;

	> .item {
		position: absolute;
		flex: 1;
	}
}

/* ✅ */
.container {
	display: flex;

	> .item {
		position: relative;
		flex: 1;
	}
}
```

`justify-self`, `align-self`, and grid placement can affect positioned boxes and are allowed with absolute or fixed positioning.

Break controls do not apply to absolutely positioned or fixed boxes. Their contents can still fragment, so break controls on in-flow descendants and inherited `widows` and `orphans` remain allowed:

```css
/* ❌ */
.chapter {
	position: absolute;
	break-before: page;
}

/* ✅ */
.chapter {
	position: relative;
	break-before: page;
}
```

Anchor placement and position fallback controls require absolute or fixed positioning. Relative and sticky positioning do not enable them:

```css
/* ❌ */
.tooltip {
	position: relative;
	position-anchor: --button;
	position-area: top;
	position-try-fallbacks: flip-block;
}

/* ✅ */
.tooltip {
	position: absolute;
	position-anchor: --button;
	position-area: top;
	position-try-fallbacks: flip-block;
}
```

These checks include reset values, just like the static inset checks. An omitted position is not inferred because elements such as popovers can have absolute or fixed positioning supplied by the browser. `position-anchor` is not checked because its value can be used by descendants through `match-parent`.

`z-index` applies to positioned boxes and to flex and grid items. An explicitly static child of an ordinary flow container cannot use it, even when the child itself has grid or flex display:

```css
/* ❌ */
.container {
	display: block;

	> .item {
		position: static;
		z-index: 1;
	}
}

/* ✅ */
.container {
	display: block;

	> .item {
		position: relative;
		z-index: 1;
	}
}
```

## Error decorations

The browser controls the appearance of `spelling-error` and `grammar-error` decorations. Use an ordinary decoration line when you want to customize its appearance:

```css
/* ❌ */
.annotation {
	text-decoration-line: spelling-error;
	text-decoration-color: blue;
}

/* ✅ */
.annotation {
	text-decoration-line: underline;
	text-decoration-color: blue;
}
```

Inherited underline and skip controls are allowed because they can affect decorations on descendants. Properties such as `color`, `fill`, and `stroke` can still style the text itself.

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

Display, disabled effects, and overflow:

- Display checks ignore `display: none` and `display: contents`.
- A disabled effect needs a single `none` value in the controlling longhand, except that text decoration controls also check `spelling-error` and `grammar-error`, and `shape-image-threshold` also checks basic shapes and shape boxes.
- The scroll snap check also accepts `scroll-snap-align: none none`. Explicit `scroll-snap-stop: normal` and all-`normal` background blending lists are allowed as resets.
- Basic shapes and shape boxes must match the CSS grammar. The installed grammar does not currently recognize a single percentage radius such as `circle(50%)`, so that form is skipped.
- Visible overflow is only detected from the `overflow` shorthand.
- For `text-overflow`, strings and `fade` values are not checked.

Parent layout:

- Only nested direct child selectors such as `& > .item` and `> .item` immediately inside a block with explicit flex, grid, or ordinary flow display are checked. Every selector in a list must select direct children. The child compound may contain type, class, ID, attribute, and standard pseudo-class selectors, including `:is()`, `:not()`, and `:nth-child()`.
- The parent may be filtered in the same compound after a leading `&`, as in `&.active > .item`, `&:hover > .item`, or `&[data-layout] > .item`. These filters still select children of the known container.
- Separate parent and child rules, descendant selectors, pseudo-elements, framework pseudo-classes such as `:global()`, and relationships through intervening conditional blocks are not checked.
- Parent layout checks skip absolutely positioned and fixed children. An explicit position must be unambiguously `static`, `relative`, or `sticky`; an omitted position is treated as in-flow.
- The `z-index` check additionally requires explicit `position: static`; an omitted position is not inferred.
- Children with explicit hidden, boxless, or ambiguous display are skipped. A child may itself be a flex or grid container; its own display does not determine its parent's layout.

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
