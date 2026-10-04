# no-ineffective-properties

📝 Disallow properties that have no effect given other declarations in the same block.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- The examples pair each explicit contradiction with an effective alternative. -->

Catch declarations that have no effect given explicit declarations in the same block. This helps find incomplete layout refactors and explains why a property does not work.

This rule reports problems without automatic fixes or editor suggestions. Removing a declaration or changing its controlling property could affect other selectors or states.

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
	display: flex;
	flex-wrap: nowrap;
	align-content: center;
}

/* ✅ */
a {
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
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
	text-overflow: ellipsis;
	overflow: visible;
}

/* ✅ */
a {
	text-overflow: ellipsis;
	overflow: hidden;
}
```

```css
/* ❌ */
a {
	display: flex;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* ✅ */
a {
	display: flex;
}

a > span {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
}
```

Flex and grid containers are not block containers. Apply ellipsis to the block container holding the text, which can still be a flex or grid item.

```css
/* ❌ */
a {
	display: flex;
	column-count: 3;
}

/* ✅ */
a {
	display: block;
	column-count: 3;
}
```

```css
/* ❌ */
a {
	display: grid;
	columns: 15rem 3;
}

/* ✅ */
a {
	display: block;
	columns: 15rem 3;
}
```

```css
/* ❌ */
a {
	position: absolute;
	float: left;
}

/* ✅ */
a {
	position: static;
	float: left;
}
```

```css
/* ❌ */
a {
	position: fixed;
	float: inline-start;
}

/* ✅ */
a {
	position: static;
	float: inline-start;
}
```

```css
/* ❌ */
a {
	text-overflow: clip ellipsis;
	overflow: visible;
}

/* ✅ */
a {
	text-overflow: clip ellipsis;
	overflow: hidden;
}
```

```css
/* ❌ */
a {
	display: table;
	border-collapse: collapse;
	border-spacing: 8px;
}

/* ✅ */
a {
	display: table;
	border-collapse: separate;
	border-spacing: 8px;
}
```

```css
/* ❌ */
a {
	position: absolute;
	clear: both;
}

/* ✅ */
a {
	position: static;
	clear: both;
}
```

```css
/* ❌ */
a {
	display: table;
	border-collapse: collapse;
	padding-inline: 8px;
}

/* ✅ */
a {
	display: table;
	border-collapse: collapse;
}

a > tbody > tr > td {
	padding-inline: 8px;
}
```

```css
/* ❌ */
a {
	perspective: none;
	perspective-origin: left top;
}

/* ✅ */
a {
	perspective: 400px;
	perspective-origin: left top;
}
```

```css
/* ❌ */
a {
	display: grid;
	table-layout: fixed;
}

/* ✅ */
a {
	display: table;
	table-layout: fixed;
}
```

```css
/* ❌ */
a {
	position: absolute;
	column-span: all;
}

/* ✅ */
a {
	position: relative;
	column-span: all;
}
```

```css
/* ❌ */
a {
	offset-path: none;
	offset-distance: 50%;
}

/* ✅ */
a {
	offset-path: path("M 0 0 L 100 100");
	offset-distance: 50%;
}
```

```css
/* ❌ */
a {
	shape-outside: none;
	shape-image-threshold: 0.5;
}

/* ✅ */
a {
	float: left;
	shape-outside: url("shape.png");
	shape-image-threshold: 0.5;
}
```

```css
/* ❌ */
a {
	text-decoration-line: none;
	text-decoration-color: red;
}

/* ✅ */
a {
	text-decoration-line: underline;
	text-decoration-color: red;
}
```

## Checked properties

- Flex containers: `flex-direction`, `flex-wrap`, and `flex-flow` require a flex display mode.
- Grid containers: `grid`, `grid-template`, `grid-template-columns`, `grid-template-rows`, `grid-template-areas`, `grid-auto-columns`, `grid-auto-rows`, and `grid-auto-flow` require a grid display mode.
- Multi-column layout: `columns`, `column-count`, `column-width`, and `column-fill` have no effect on an element with its own explicit flex or grid display mode. Flex and grid items can still use multi-column layout for their contents.
- Column spanning: `column-span: all` has no effect with explicit `position: absolute` or `fixed`. Only in-flow block-level elements can span columns. The rule does not infer whether an element has a multi-column ancestor.
- Flex alignment: `align-content` has no effect with explicit `nowrap` in `flex-wrap` or `flex-flow`. Use `align-items` to align items, or enable wrapping when you intend to align flex lines. Wrapping containers are allowed even when their content currently fits on one line. Omitted wrapping is not assumed to be `nowrap`, even in a `flex-flow` shorthand.
- Insets: `top`, `right`, `bottom`, `left`, `inset`, `inset-block`, `inset-inline`, and their logical longhands have no effect with explicit `position: static`.
- Floats: `float: left`, `right`, `inline-start`, or `inline-end` has no effect with explicit `position: absolute` or `fixed`. `float: none` is allowed.
- Clearance: `clear: left`, `right`, `both`, `inline-start`, or `inline-end` has no effect with explicit `position: absolute` or `fixed`. Absolutely positioned elements do not participate in normal flow. `clear: none` is allowed.
- Perspective origin: `perspective-origin` has no effect with explicit `perspective: none`. A `perspective()` transform function does not use this property. An explicit perspective distance, including `0px`, is allowed.
- Motion paths: `offset-distance`, `offset-rotate`, and `offset-anchor` have no effect with explicit `offset-path: none`. Omitted paths and paths implied by the `offset` shorthand are not checked. `offset-position` is not checked.
- Shape image threshold: `shape-image-threshold` has no effect with explicit `shape-outside: none`. It extracts a shape from an image’s alpha channel. `shape-margin` is allowed because it can still expand an initial-letter outline when `shape-outside` is `none`.
- Text decoration: `text-decoration-color`, `text-decoration-style`, and `text-decoration-thickness` have no effect with explicit `text-decoration-line: none`. These properties style decorations originating on the element, and do not restyle lines propagated from ancestors. Inherited underline controls such as `text-underline-offset` and `text-decoration-skip-ink` are allowed. Omitted lines and lines implied by the `text-decoration` shorthand are not checked.
- Table layout: `table-layout` has no effect with an explicit non-table display mode. Other table controls such as `border-collapse` and `caption-side` are allowed because they can inherit into descendant tables.
- Text overflow: `text-overflow: ellipsis`, `clip ellipsis`, `ellipsis clip`, or `ellipsis ellipsis` has no effect with an element's own explicit flex or grid display mode, or with explicit `overflow: visible` or `overflow: visible visible`. Ellipsis needs a block container and clipped inline overflow; this rule does not require `white-space: nowrap`, a width, or a height. Strings, `fade`, and `fade()` are not checked.
- Table spacing: `border-spacing` has no effect on a table with explicit table display and `border-collapse: collapse`. Use `border-collapse: separate` for spacing between cells. Both legacy and modern display notation are supported, such as `inline-table` and `inline table`. `border-spacing` is inherited and can still affect a descendant table with separate borders; disable the rule when intentionally supplying inherited spacing. Rounded borders are not checked because browsers can still apply them to backgrounds or clipping in collapsed mode.
- Table padding: `padding`, its physical and logical longhands, `padding-block`, and `padding-inline` have no effect on a table with explicit table display and `border-collapse: collapse`. Apply padding to cells or use separate borders. Padding on table cells is allowed, including in collapsed tables.

## Scope

- Supported: Style declaration blocks, including nested style rules and conditional blocks, CSS escapes, ASCII casing, `!important`, and legacy and modern display notation, such as `inline-flex` and `inline flex`.
- Skipped controls: Missing, malformed, unknown, vendor-prefixed, CSS-wide, or unresolved values. Display checks also ignore `none` and `contents`.
- Skipped ambiguities: Duplicate `display`, `position`, `perspective`, `border-collapse`, `offset-path`, `shape-outside`, or `text-decoration-line` declarations, `offset`/`offset-path` or `text-decoration`/`text-decoration-line` combinations, multiple wrapping declarations including `flex-flow`/`flex-wrap` combinations, and multiple overflow declarations including physical and logical longhands. Ambiguity skips only the check that depends on that controller.
- Skipped declarations: Target values containing CSS-wide keywords or unresolved substitutions, custom properties, item properties, gaps, and other alignment properties that need additional context.
- Skipped blocks: Blocks containing `all`, plus keyframe, descriptor, and CSS Modules `:export`/`:import()` blocks.
- Local context: Only direct declarations in the same block are compared. Overflow checks use only the `overflow` shorthand, without inferring writing mode or cross-axis computed values. Another selector, condition, or state can override the local context; disable the rule on declarations intentionally retained for those contexts.

For example, repeated display declarations may be intentional fallbacks, so this rule skips the display check:

```css
a {
	display: block;
	display: flex;
	grid-template-columns: 1fr 1fr;
}
```

Invalid CSS is handled on a best-effort basis rather than validated by this rule. Use [`css/no-invalid-properties`](https://github.com/eslint/css/blob/main/docs/rules/no-invalid-properties.md) to check property names and value grammar. CSS Modules interop blocks contain literal values rather than styles.

Ignored animation controls and final-keyframe easing are covered separately by [`no-ineffective-keyframe-declarations`](./no-ineffective-keyframe-declarations.md).

Scroll-container controls and `resize` are not checked because root-element propagation and replaced-element exceptions require context beyond these declarations. The rule also does not analyze layer order, excess list values, or missing sticky-position insets. Padding and margins on internal table boxes are not checked because a flex or grid parent can blockify those boxes and make the properties effective.

## Resources

- [Flex container properties and alignment](https://drafts.csswg.org/css-flexbox-1/)
- [Grid container properties](https://drafts.csswg.org/css-grid-1/)
- [Multi-column layout](https://drafts.csswg.org/css-multicol-1/#the-multi-column-model)
- [Display notation](https://drafts.csswg.org/css-display-3/#the-display-properties)
- [Positioning and insets](https://drafts.csswg.org/css-position-3/#insets)
- [Floats and absolute positioning](https://drafts.csswg.org/css2/#floats)
- [Text overflow](https://drafts.csswg.org/css-overflow-3/#text-overflow)
- [Two-value text overflow](https://drafts.csswg.org/css-overflow-4/#text-overflow)
- [Clearance and normal flow](https://drafts.csswg.org/css2/#flow-control)
- [Perspective origin](https://drafts.csswg.org/css-transforms-2/#perspective-origin-property)
- [Collapsed table spacing and padding](https://drafts.csswg.org/css-tables-3/#collapsed-style-overrides)
- [Column spanning and filling](https://www.w3.org/TR/css-multicol-1/#column-span)
- [Table layout](https://drafts.csswg.org/css-tables-3/#table-layout-property)
- [Motion paths](https://drafts.csswg.org/motion-1/#offset-path-property)
- [Shape image threshold](https://drafts.csswg.org/css-shapes-1/#shape-image-threshold-property)
- [Initial-letter wrapping](https://drafts.csswg.org/css-inline-3/#initial-letter-wrap)
- [Text decoration color and style](https://drafts.csswg.org/css-text-decor-3/#text-decoration-color-property)
- [Text decoration thickness](https://drafts.csswg.org/css-text-decor-4/#text-decoration-thickness-property)
