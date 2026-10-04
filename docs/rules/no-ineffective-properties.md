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

## Checked properties

- Flex containers: `flex-direction`, `flex-wrap`, and `flex-flow` require a flex display mode.
- Grid containers: `grid`, `grid-template`, `grid-template-columns`, `grid-template-rows`, `grid-template-areas`, `grid-auto-columns`, `grid-auto-rows`, and `grid-auto-flow` require a grid display mode.
- Flex alignment: `align-content` has no effect with explicit `nowrap` in `flex-wrap` or `flex-flow`. Use `align-items` to align items, or enable wrapping when you intend to align flex lines. Wrapping containers are allowed even when their content currently fits on one line.
- Insets: `top`, `right`, `bottom`, `left`, `inset`, `inset-block`, `inset-inline`, and their logical longhands have no effect with explicit `position: static`.
- Text overflow: `text-overflow: ellipsis` has no effect with explicit `overflow: visible` or `overflow: visible visible`. Ellipsis needs clipped inline overflow; this rule does not require `white-space: nowrap`, a width, or a height.

## Scope

Only declarations in the same block are compared. Supports nested style rules and nested conditional blocks, CSS escapes, ASCII casing, `!important`, and both legacy and modern display notation, such as `inline-flex` and `inline flex`. Another selector, condition, or state can override the local context; disable the rule on declarations intentionally retained for those contexts.

Each check is skipped when its controlling declarations are ambiguous: multiple `display` or `position` declarations, multiple wrapping declarations including `flex-flow`/`flex-wrap` combinations, or multiple overflow declarations including physical and logical longhands. Text overflow is only checked against the `overflow` shorthand, so writing mode and cross-axis computed values do not need to be inferred. A block containing `all` is skipped entirely.

Missing, malformed, or unresolved controlling values do not trigger checks. Display checks ignore unknown or vendor-prefixed modes and `display: none` or `contents`. Target declarations containing CSS-wide keywords or unresolved substitutions are skipped. Invalid CSS is handled on a best-effort basis rather than validated by this rule.

Omitted wrapping is not assumed to be `nowrap`, even in a `flex-flow` shorthand. Item properties, gaps, and other alignment properties are not checked, since their behavior needs additional context. Custom properties, keyframes, and descriptor blocks are excluded. CSS Modules `:export` and `:import()` blocks contain literal values rather than styles and are also excluded.

Final-keyframe easing is covered separately by [`no-ineffective-keyframe-declarations`](./no-ineffective-keyframe-declarations.md).

## Resources

- [Flex container properties and alignment](https://drafts.csswg.org/css-flexbox-1/)
- [Grid container properties](https://drafts.csswg.org/css-grid-1/)
- [Display notation](https://drafts.csswg.org/css-display-3/#the-display-properties)
- [Positioning and insets](https://drafts.csswg.org/css-position-3/#insets)
- [Text overflow](https://drafts.csswg.org/css-overflow-3/#text-overflow)
