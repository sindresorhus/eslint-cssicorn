# no-layout-animations

📝 Disallow animating properties that can affect layout.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Flags explicit targets in `transition` and `transition-property`, and keyframe declarations, for properties that can affect layout. Animating them can cause repeated layout work.

This opt-in policy permits intentional exceptions, such as accordions and [intrinsic-size transitions](https://developer.chrome.com/docs/css-ui/animate-to-height-auto). Reports do not prove jank; [measure rendering work](https://web.dev/articles/animations-guide) before making changes. Transforms cannot universally replace layout animations.

No autofix or suggestions. Use an ESLint disable comment for intentional exceptions.

## Checked properties

Checks these longhands and their shorthands:

| Category | Longhands |
| --- | --- |
| Dimensions | `width`, `height`, `inline-size`, `block-size`, and their `min-` and `max-` variants |
| Insets | `top`, `right`, `bottom`, `left`, `inset-block-start`, `inset-block-end`, `inset-inline-start`, `inset-inline-end` |
| Margins and padding | `margin-` and `padding-` followed by `top`, `right`, `bottom`, `left`, `block-start`, `block-end`, `inline-start`, or `inline-end` |
| Border thickness | `border-` followed by the same physical or logical sides, then `-width` |
| Gaps | `row-gap`, `column-gap` |
| Flex sizing | `flex-basis`, `flex-grow`, `flex-shrink` |
| Grid sizing | `grid-template-columns`, `grid-template-rows`, `grid-auto-columns`, `grid-auto-rows` |
| Text geometry | `font-size`, `line-height`, `letter-spacing`, `word-spacing` |

Shorthands include `inset`, `margin`, `padding`, their logical variants, `gap`, `flex`, `grid`, `grid-template`, `font`, and border side, axis, and width shorthands. They report even when only a component such as border color changes.

This is not an exhaustive layout classifier. Paint properties, aspect ratio, columns, border spacing, placement and alignment, other font properties, scroll margins and padding, and legacy `grid-gap` aliases are excluded.

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

## Limitations

- Checks only top-level transition identifiers. Functions and variables are not resolved; explicit targets such as `width var(--duration)` still report.
- Keyframe values and usage are not evaluated. Variable values, constant keyframes, zero-duration transitions, and overridden declarations still report. Ignored keyframe `!important` declarations do not.
- Supports ASCII casing, CSS escapes, vendor-prefixed transition declarations, and prefixed keyframes.
- Skips custom properties, descriptor blocks, and CSS Modules interop declarations.
- Ignores explicit `all` and omitted targets, such as `transition: 200ms`. Use [`unicorn/no-transition-all`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-transition-all.md) to disallow explicit `all`; it also permits omitted targets.
