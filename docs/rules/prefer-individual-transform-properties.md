# prefer-individual-transform-properties

📝 Prefer individual transform properties over transform functions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports `transform` declarations that can use the individual `translate`, `rotate`, and `scale` properties, so that a state can change one component without repeating the whole `transform` list. See [CSS individual transform properties](https://web.dev/articles/css-individual-transform-properties) and the [CSS Transforms Level 2 specification](https://drafts.csswg.org/css-transforms-2/#individual-transforms).

There is no autofix because the conversion can change behavior, but a suggestion is provided. Review related styles, transitions, animations, and scripts before you apply it.

## Examples

```css
/* ❌ */
.button {
	transform: translateY(-2px);

	&:hover {
		transform: translateY(-2px) scale(1.05);
	}
}

/* ✅ */
.button {
	translate: 0 -2px;

	&:hover {
		translate: 0 -2px;
		scale: 1.05;
	}
}
```

After you apply both suggestions, you can remove the repeated `translate` from the hover state.

```css
/* ❌ */
.card {
	transform: translate3d(10px, 20px, 30px) rotateX(45deg) scale(2) !important;
}

/* ✅ */
.card {
	translate: 10px 20px 30px !important;
	rotate: x 45deg !important;
	scale: 2 !important;
}
```

## Checked declarations

The rule checks single transform functions, including the 3D forms, and lists with at most one translation, one rotation, and one scale, in that order.

## Limitations

The rule ignores:

- Other transform functions.
- Values that contain substitution functions, such as `var()`, or `random()`.
- Declarations in blocks that also have fallback transforms, individual transform properties, or motion paths.
- Declarations in keyframes, and in CSS Modules `:export` and `:import()` blocks.
- Vendor-prefixed declarations.

Declarations that contain comments are reported without suggestions.
