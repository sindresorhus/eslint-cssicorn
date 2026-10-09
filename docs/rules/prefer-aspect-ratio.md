# prefer-aspect-ratio

📝 Prefer `aspect-ratio` over zero-height percentage-padding workarounds.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule recommends native [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/aspect-ratio) for boxes with literal zero `height` and positive percentage `padding-top` or `padding-bottom`, including constant `calc()` values. It reports once per style block and also recognizes `padding` shorthands with positive percentage top or bottom padding. Shorthand components may be nonnegative literal lengths or percentages, including unitless zero, or supported nonnegative percentage calculations. Zero height may be unitless or a valid length; percentage and calculated heights are ignored.

No autofix or editor suggestions are provided: percentage padding uses the containing block's inline size, while `aspect-ratio` sizes the element's own box. Remove the zero height and ratio padding, leaving at least one dimension automatic (`height: auto` if needed). Review content, positioning, box sizing, and markup; the examples are not guaranteed equivalent. See [the browser comparison](https://web.dev/articles/aspect-ratio).

## Examples

```css
/* ❌ */
.video {
	height: 0;
	padding: 0;
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

Constant `calc()` expressions must produce a finite, nonnegative percentage, with a positive vertical percentage required to report. Numbers, percentages, `+`, `-`, `*`, `/`, parentheses, nested `calc()`, and negative intermediate values are supported. Lengths, named constants, substitutions (`var()` or `env()`), other functions, invalid arithmetic, and division by zero are ignored.

## Detection boundaries

The rule intentionally ignores:

- Padding-only patterns, or height and padding declared in separate blocks.
- Blocks containing `aspect-ratio`, `all`, or logical padding.
- Duplicate `height`, `padding`, `padding-top`, or `padding-bottom` declarations.
- Shorthands mixed with vertical longhands, except a literal zero reset before all vertical longhands with matching `!important` usage.
- Shorthands with negative or unsupported components.
- Keyframes, descriptor blocks, and CSS Modules `:export` and `:import()` blocks.
- Any enclosing `@supports` condition testing `aspect-ratio`, regardless of polarity.

Explicit feature-query fallbacks are left alone:

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
