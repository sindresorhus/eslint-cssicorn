# prefer-aspect-ratio

📝 Prefer `aspect-ratio` over zero-height percentage-padding workarounds.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Percentage padding paired with `height: 0` is a common workaround for maintaining an aspect ratio in responsive videos, embeds, and cards. Prefer reviewing these layouts for migration to the native [`aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/aspect-ratio) property, which expresses the intent directly.

This rule reports one problem per style declaration block containing an explicit literal zero `height` and positive percentage `padding-top` or `padding-bottom`. It also recognizes `padding` shorthands with literal zero horizontal padding and vertical components that are either literal zero or positive percentages. Zero height may be unitless or use a valid length unit, such as `0px`; percentage and calculated heights are excluded.

The rule does not provide an autofix or editor suggestion. Percentage padding depends on the containing block's inline size, while `aspect-ratio` uses the element's own box dimensions. Migration usually requires removing both the zero height and ratio padding, and may require reviewing positioning, content, box sizing, or markup. The examples below illustrate possible migrations, not guaranteed equivalent replacements. See [the browser comparison](https://web.dev/articles/aspect-ratio).

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

Constant `calc()` expressions are recognized when they evaluate to a finite, positive percentage. Supported expressions can use numbers, percentages, addition, subtraction, multiplication, division, parentheses, and nested `calc()`, including negative intermediate values. For example, `calc(100% - 43.75%)`, `calc(100% / (16 / 9))`, and `calc(-50% * -1)` are recognized.

Calculations with lengths, named constants, substitutions such as `var()` or `env()`, or other math functions are ignored. Invalid arithmetic, division by zero, non-finite results, and nonpositive results are also ignored. The rule does not derive or recommend a particular replacement ratio.

## Detection boundaries

The rule intentionally ignores:

- Padding-only spacers, including pseudo-element techniques without explicit zero height.
- Patterns with height and padding declared in separate blocks or selectors.
- Blocks containing `aspect-ratio`, `all`, or logical padding properties.
- Duplicate relevant declarations, or a `padding` shorthand mixed with `padding-top` or `padding-bottom`.
- Padding shorthands with nonzero horizontal components or nonzero lengths in vertical components.
- Keyframes, descriptor blocks, and CSS Modules `:export` and `:import()` blocks.
- Blocks enclosed by an `@supports` condition testing `aspect-ratio`, including positive, negative, and compound conditions.

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

This rule identifies a likely layout workaround without resolving markup or the cascade across blocks. Intentional compatibility fallbacks outside an `aspect-ratio` feature query may need an ESLint disable comment.
