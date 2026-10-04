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

## Checked properties

- Flex containers: `flex-direction`, `flex-wrap`, and `flex-flow` require a flex display mode.
- Grid containers: `grid`, `grid-template`, `grid-template-columns`, `grid-template-rows`, `grid-template-areas`, `grid-auto-columns`, `grid-auto-rows`, and `grid-auto-flow` require a grid display mode.
- Multi-column layout: `columns`, `column-count`, and `column-width` have no effect on an element with its own explicit flex or grid display mode. Flex and grid items can still use multi-column layout for their contents.
- Flex alignment: `align-content` has no effect with explicit `nowrap` in `flex-wrap` or `flex-flow`. Use `align-items` to align items, or enable wrapping when you intend to align flex lines. Wrapping containers are allowed even when their content currently fits on one line. Omitted wrapping is not assumed to be `nowrap`, even in a `flex-flow` shorthand.
- Insets: `top`, `right`, `bottom`, `left`, `inset`, `inset-block`, `inset-inline`, and their logical longhands have no effect with explicit `position: static`.
- Floats: `float: left`, `right`, `inline-start`, or `inline-end` has no effect with explicit `position: absolute` or `fixed`. `float: none` is allowed.
- Text overflow: `text-overflow: ellipsis`, `clip ellipsis`, `ellipsis clip`, or `ellipsis ellipsis` has no effect with explicit `overflow: visible` or `overflow: visible visible`. Ellipsis needs clipped inline overflow; this rule does not require `white-space: nowrap`, a width, or a height. Strings, `fade`, and `fade()` are not checked.

## Scope

- Supported: Style declaration blocks, including nested style rules and conditional blocks, CSS escapes, ASCII casing, `!important`, and legacy and modern display notation, such as `inline-flex` and `inline flex`.
- Skipped controls: Missing, malformed, unknown, vendor-prefixed, CSS-wide, or unresolved values. Display checks also ignore `none` and `contents`.
- Skipped ambiguities: Duplicate `display` or `position` declarations, multiple wrapping declarations including `flex-flow`/`flex-wrap` combinations, and multiple overflow declarations including physical and logical longhands.
- Skipped declarations: Target values containing CSS-wide keywords or unresolved substitutions, custom properties, item properties, gaps, and other alignment properties that need additional context.
- Skipped blocks: Blocks containing `all`, plus keyframe, descriptor, and CSS Modules `:export`/`:import()` blocks.
- Local context: Only direct declarations in the same block are compared. Text overflow is checked only against the `overflow` shorthand, without inferring writing mode or cross-axis computed values. Another selector, condition, or state can override the local context; disable the rule on declarations intentionally retained for those contexts.

For example, repeated display declarations may be intentional fallbacks, so this rule skips the display check:

```css
a {
	display: block;
	display: flex;
	grid-template-columns: 1fr 1fr;
}
```

Invalid CSS is handled on a best-effort basis rather than validated by this rule. Use [`css/no-invalid-properties`](https://github.com/eslint/css/blob/main/docs/rules/no-invalid-properties.md) to check property names and value grammar. CSS Modules interop blocks contain literal values rather than styles.

Final-keyframe easing is covered separately by [`no-ineffective-keyframe-declarations`](./no-ineffective-keyframe-declarations.md).

## Resources

- [Flex container properties and alignment](https://drafts.csswg.org/css-flexbox-1/)
- [Grid container properties](https://drafts.csswg.org/css-grid-1/)
- [Multi-column layout](https://drafts.csswg.org/css-multicol-1/#the-multi-column-model)
- [Display notation](https://drafts.csswg.org/css-display-3/#the-display-properties)
- [Positioning and insets](https://drafts.csswg.org/css-position-3/#insets)
- [Floats and absolute positioning](https://drafts.csswg.org/css2/#floats)
- [Text overflow](https://drafts.csswg.org/css-overflow-3/#text-overflow)
- [Two-value text overflow](https://drafts.csswg.org/css-overflow-4/#text-overflow)
