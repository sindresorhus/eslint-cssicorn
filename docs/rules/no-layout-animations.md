# no-layout-animations

📝 Disallow animating properties that can affect layout.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports explicit targets in `transition` and `transition-property`, and declarations in `@keyframes`, for properties that can affect layout. Animating them can cause repeated layout work, but a report does not prove jank, so [measure rendering work](https://web.dev/articles/animations-guide) before making changes. Transforms cannot always replace layout animations.

There is no autofix because a replacement depends on the intended effect. The rule is opt-in, and intentional exceptions, such as accordions and [intrinsic-size transitions](https://developer.chrome.com/docs/css-ui/animate-to-height-auto), can use an ESLint disable comment.

## Examples

```css
/* ❌ */
a { transition: height 200ms ease; }

/* ✅ */
a { transition: opacity 200ms ease; }
```

```css
/* ❌ */
a { transition-property: padding-inline; }

/* ✅ */
a { transition-property: transform; }
```

```css
/* ❌ */
@keyframes resize {
	from { width: 0; }
	to { width: 100px; }
}

/* ✅ */
@keyframes fade {
	from { opacity: 0; }
	to { opacity: 1; }
}
```

## Checked properties

The rule checks these longhands and their shorthands:

- Dimensions: `width`, `height`, `inline-size`, `block-size`, and their `min-` and `max-` variants.
- Insets: `top`, `right`, `bottom`, `left`, `inset-block-start`, `inset-block-end`, `inset-inline-start`, `inset-inline-end`.
- Margins and padding: `margin-` and `padding-` followed by `top`, `right`, `bottom`, `left`, `block-start`, `block-end`, `inline-start`, or `inline-end`.
- Border thickness: `border-` followed by the same physical or logical sides, then `-width`.
- Gaps: `row-gap`, `column-gap`.
- Flex sizing: `flex-basis`, `flex-grow`, `flex-shrink`.
- Grid sizing: `grid-template-columns`, `grid-template-rows`, `grid-auto-columns`, `grid-auto-rows`.
- Text geometry: `font-size`, `line-height`, `letter-spacing`, `word-spacing`.

Shorthands include `inset`, `margin`, `padding`, their logical variants, `gap`, `flex`, `grid`, `grid-template`, `font`, and border side, axis, and width shorthands. They report even when only a component such as border color changes.

Property names are matched ASCII case-insensitively, also with CSS escapes. Vendor-prefixed transition declarations and prefixed `@keyframes` are also checked. Known aliases of the checked properties, such as `-webkit-flex-basis`, are recognized in transition targets and keyframe declarations.

## Limitations

- The list of checked properties is not complete. Paint properties, aspect ratio, columns, border spacing, placement and alignment, other font properties, scroll margins and padding, and legacy `grid-gap` aliases are not checked.
- Only top-level transition identifiers are checked. Functions and variables are not resolved, so explicit targets such as `width var(--duration)` are still reported.
- Keyframe values and usage are not evaluated. Variable values, constant keyframes, zero-duration transitions, and overridden declarations are still reported. `!important` declarations in keyframes are not reported, because browsers ignore them.
- Custom properties, descriptor blocks, and CSS Modules interop declarations are ignored.
- Explicit `all` and omitted targets, such as `transition: 200ms`, are ignored.

## Related rules

- [`unicorn/no-transition-all`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-transition-all.md) disallows explicit `all`, but permits omitted targets.
