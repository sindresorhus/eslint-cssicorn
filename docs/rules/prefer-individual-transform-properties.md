# prefer-individual-transform-properties

📝 Prefer individual transform properties over transform functions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The individual `translate`, `rotate`, and `scale` properties let styles change one transform component without repeating a whole `transform` list. For example, a hover scale can compose with a positioning translation.

This rule offers editor suggestions to replace directly convertible `transform` declarations with individual properties. It does not provide an automatic fix because conversion can change behavior across selectors, animations, scripts, and transitions.

## Examples

After converting both declarations, remove the repeated hover translation so the hover state only changes scale.

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
		scale: 1.05;
	}
}
```

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

The rule checks single transform functions and lists containing at most one translation, one rotation, and one scale, in that order. Any ordered subset is supported. It checks ordinary style declarations, including nested rules and conditional blocks.

| Function | Individual declaration |
|---|---|
| `translate(x)` / `translateX(x)` | `translate: x` |
| `translate(x, y)` | `translate: x y` |
| `translateY(y)` | `translate: 0 y` |
| `translateZ(z)` | `translate: 0 0 z` |
| `translate3d(x, y, z)` | `translate: x y z` |
| `rotate(angle)` / `rotateZ(angle)` | `rotate: angle` |
| `rotateX(angle)` | `rotate: x angle` |
| `rotateY(angle)` | `rotate: y angle` |
| `rotate3d(x, y, z, angle)` | `rotate: x y z angle` |
| `scale(x)` | `scale: x` |
| `scale(x, y)` | `scale: x y` |
| `scaleX(x)` | `scale: x 1` |
| `scaleY(y)` | `scale: 1 y` |
| `scaleZ(z)` | `scale: 1 1 z` |
| `scale3d(x, y, z)` | `scale: x y z` |

Unitless rotation zero becomes an angle, for example `rotate(0)` becomes `rotate: 0deg`. Identity transforms remain identity transforms; they are not replaced with `none`, which would remove their stacking context and containing block.

Scalar literals and substitution-free math functions such as `calc()` and `min()` are supported. Argument spelling, colon spacing, `!important`, indentation, and line endings are preserved. Declarations containing comments are reported without suggestions to avoid removing or relocating comments.

The following are intentionally ignored:

- Reordered or repeated operation categories, and lists containing unsupported functions such as `skew()`, `perspective()`, or `matrix()`.
- Values containing substitution functions such as `var()`, `env()`, `attr()`, or custom functions, and values containing `random()`. A substitution can expand to multiple arguments, and moving random values between properties can change their result.
- Blocks containing another unprefixed or vendor-prefixed `transform`, an individual transform property, or `offset`/`offset-path`.
- Vendor-prefixed and custom properties, keyframes, feature-query tests, descriptors, and CSS Modules `:export`/`:import()` declarations.

For example, these legitimate uses of `transform` are not reported:

```css
/* ✅ */
.card {
	transform: scale(2) translateX(10px);
}

.button {
	translate: 0 -2px;
	transform: scale(1.05);
}
```

## Review before accepting a suggestion

Individual transform properties supplement `transform`; they are not its longhands. They apply in the fixed order `translate`, `rotate`, `scale`, motion-path offset, then `transform`. The rule does not analyze the cascade across selectors or files.

Before accepting a suggestion, review:

- Other selectors and states, including `transform: none` resets. These do not reset individual properties.
- `transition: transform`, `transition-property`, `will-change`, keyframes, and animations. Changing the property changes which transitions or animations target it and can change interpolation.
- Scripts that read or write `transform`.
- Motion paths, which apply between individual properties and `transform`.
- SVG `transform` presentation attributes, which may become active when a CSS `transform` declaration is removed.
- 3D rendering and SVG behavior. An explicit 3D function can become an individual property classified as 2D when its Z component is neutral or its rotation axis is Z.
- Browser support required by the project.

Grammar checking assumes otherwise valid CSS. The rule does not evaluate calculations or prove their result types.

See [CSS individual transform properties](https://web.dev/articles/css-individual-transform-properties) and the [CSS Transforms Level 2 specification](https://drafts.csswg.org/css-transforms-2/#individual-transforms).
