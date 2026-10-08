# no-layout-animations

📝 Disallow animating properties that can affect layout.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow explicit transition targets and keyframe declarations for common properties that can affect layout. Animating these properties can cause repeated layout work, depending on the element, stylesheet, and browser.

This is an opt-in performance policy. Layout animations are legitimate for patterns such as expanding accordions, including [transitions to intrinsic sizes](https://developer.chrome.com/docs/css-ui/animate-to-height-auto). A report does not establish that an animation causes jank. [Measure actual rendering work](https://web.dev/articles/animations-guide) before changing an intentional animation.

There are no fixes or suggestions. Transforms do not generally replace geometry changes: scaling an accordion, for example, does not move the surrounding content as changing its height does.

## Checked properties

The rule checks the following longhands and any shorthand that includes one of them:

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

This includes `inset`, `margin`, `padding`, their logical axis shorthands, `gap`, `flex`, `grid`, `grid-template`, `font`, and the border side, axis, and width shorthands. A shorthand target is reported even if only a component that does not affect geometry changes, such as the color in `border`.

The list is deliberately limited. Other properties, including paint properties, aspect ratio, columns, border spacing, placement and alignment, other font properties, scroll margins and padding, and legacy `grid-gap` aliases, are outside this policy. It does not classify every property that might affect layout.

## Examples

```css
/* ❌ */
a {
	transition: height 200ms ease;
}

/* ✅ */
a {
	transition: opacity 200ms ease;
}
```

```css
/* ❌ */
a {
	transition-property: padding-inline;
}

/* ✅ */
a {
	transition-property: transform;
}
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

- Only literal top-level targets in `transition` and `transition-property` are checked. Targets supplied through variables or other functions are not resolved. An explicit target such as `transition: width var(--duration)` still reports.
- Keyframe declaration names are checked regardless of their values, whether the keyframes are used, or whether the values change. `height: var(--height)` and constant geometry declarations still report. Ignored `!important` declarations do not report.
- Duration and cascade behavior are not inferred. Zero-duration transitions and declarations overridden later still report.
- Standard property names are matched ASCII case-insensitively, including escaped spellings. Vendor-prefixed transition declarations and keyframes are supported.
- Custom property declarations and targets, descriptor blocks, and CSS Modules interop declarations are not checked.
- Explicit `all` and shorthand transitions with omitted targets, such as `transition: 200ms`, are not checked. Enable [`unicorn/no-transition-all`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-transition-all.md) alongside this rule to disallow explicit `all`. That rule also permits omitted targets.

For intentional layout animations, leave this rule disabled or use an ESLint disable comment for the relevant declaration.
