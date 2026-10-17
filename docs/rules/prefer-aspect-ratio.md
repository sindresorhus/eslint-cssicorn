# prefer-aspect-ratio

📝 Prefer `aspect-ratio` over zero-height percentage-padding workarounds.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports the zero-height padding workaround for fixed-ratio boxes, and recommends native [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/aspect-ratio) instead. It reports once per style block that has both of these:

- A `height` of unitless zero or a zero length. Percentage and calculated heights are ignored.
- A positive percentage `padding-top`, `padding-bottom`, or top or bottom component of `padding`. A constant `calc()` value also counts. The other `padding` components must be nonnegative literal lengths or percentages, unitless zero, or supported nonnegative percentage calculations.

There is no autofix because percentage padding uses the containing block's inline size, while `aspect-ratio` sizes the element's own box.

To migrate, replace the zero height and the ratio padding with `aspect-ratio`, and leave at least one dimension automatic (`height: auto` if needed). The examples are not guaranteed to be equivalent, so review content, positioning, box sizing, and markup. See [the browser comparison](https://web.dev/articles/aspect-ratio).

## Examples

```css
/* ❌ */
.video {
	height: 0;
	padding-bottom: 56.25%;
}

/* ✅ */
.video {
	aspect-ratio: 16 / 9;
}
```

```css
/* ❌ */
.card {
	height: 0;
	padding: 75% 0 0;
}

/* ✅ */
.card {
	aspect-ratio: 4 / 3;
}
```

```css
/* ❌ */
.embed {
	height: 0;
	padding-top: calc(9 / 16 * 100%);
}

/* ✅ */
.embed {
	aspect-ratio: 16 / 9;
}
```

## Calculations

A constant `calc()` must produce a finite, nonnegative percentage. It can use numbers, percentages, `+`, `-`, `*`, `/`, parentheses, nested `calc()`, and negative intermediate values. Lengths, named constants, substitutions (`var()` or `env()`), other functions, invalid arithmetic, and division by zero are ignored.

## Limitations

The rule ignores:

- Padding-only patterns, or height and padding in separate blocks.
- Blocks containing `aspect-ratio`, `all`, or logical padding.
- Duplicate `height`, `padding`, `padding-top`, or `padding-bottom` declarations.
- Shorthands mixed with vertical longhands, except a literal zero reset before all vertical longhands with matching `!important` usage.
- Keyframes, descriptor blocks, and CSS Modules `:export` and `:import()` blocks.
- Blocks inside any `@supports` condition that tests `aspect-ratio`, regardless of polarity.

```css
/* ✅ */
@supports not (aspect-ratio: 16 / 9) {
	.video {
		height: 0;
		padding-bottom: 56.25%;
	}
}
```

Other intentional compatibility fallbacks may need an ESLint disable comment.
