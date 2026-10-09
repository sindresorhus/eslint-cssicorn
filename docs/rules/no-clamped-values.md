# no-clamped-values

📝 Disallow CSS values that browsers silently clamp.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

CSS accepts some values outside their effective range and silently clamps them. For example, `opacity: 50` produces fully opaque paint rather than 50% opacity. Syntax-validation rules generally accept these values.

This rule reports known clamping bounds for literal values and constant calculations. Diagnostics identify the affected component, its evaluated value before clamping, and the browser's bound.

## Supported values

| Context | Effective range |
| --- | --- |
| `opacity`, `fill-opacity`, `stroke-opacity`, `stop-opacity`, `flood-opacity`, `shape-image-threshold` | 0 to 1, or 0% to 100% |
| `grayscale()`, `invert()`, `opacity()`, `sepia()` filter amounts | Up to 1 or 100% |
| Calculated `blur()` filter lengths | At least 0 |
| Calculated `font-style: oblique` angles, including `@font-face` endpoints | −90deg to 90deg |
| Absolute `rgb()` and `rgba()` channels | 0 to 255, or 0% to 100% |
| Absolute `hsl()` and `hsla()` saturation | At least 0 |
| Absolute `lab()` and `lch()` lightness | 0 to 100 |
| Absolute `oklab()` and `oklch()` lightness | 0 to 1, or 0% to 100% |
| Absolute `lch()` and `oklch()` chroma | At least 0 |
| Color alpha, including relative colors | 0 to 1, or 0% to 100% |
| Modern space-separated `device-cmyk()` and absolute custom-profile `color()` channels | 0 to 1, or 0% to 100% |
| `perspective` and transform `perspective()` | At least 1px after resolving lengths |
| `border-image-slice`, `mask-border-slice`, and corresponding shorthand slice percentages | Up to 100% |
| `text-decoration-thickness` and corresponding shorthand thickness | At least one device pixel |

Filter checks also apply to `backdrop-filter` and vendor-prefixed properties. Brightness, contrast, and saturation above 100% are allowed. Negative direct filter amounts and blur lengths are invalid syntax and are skipped; negative calculated values can be clamped and are reported. [Filter blur](https://www.w3.org/TR/filter-effects-1/#funcdef-filter-blur)

Relative non-alpha color components and predefined `color()` channels retain out-of-range values and are allowed. HSL saturation has no upper bound; HWB normalization and gamut mapping are different behaviors and are not reported. These checks follow the current [CSS Color 4](https://www.w3.org/TR/css-color-4/) and [CSS Color 5](https://www.w3.org/TR/css-color-5/#relative-colors) specifications.

## Calculations

The rule evaluates constant CSS math functions, including `calc()`, comparisons, rounding, trigonometric functions, powers, and logarithms. It checks the complete calculation against its receiving property or recognized descriptor's numeric range. Integer results are rounded before checking integer bounds. Intermediate values that cancel into range are allowed. [CSS calculation range checking](https://www.w3.org/TR/css-values-4/#calc-range)

The table above lists explicit semantic checks. Additional calculation checks use numeric ranges in the bundled CSS-tree grammar metadata, such as those for `width`, `font-weight`, and `animation-duration`. Bounds absent from that metadata can be missed.

Calculated oblique angles are checked in `font-style` declarations and `@font-face` descriptors. The `font` shorthand is excluded because the bundled grammar does not reliably identify its angle component. Direct out-of-range angle literals are invalid syntax and are skipped. [Font-style bounds](https://www.w3.org/TR/css-fonts-4/#font-style-prop)

Numeric range checks allow calculated results within `1e-10 × max(1, |bound|)` of a bound to avoid diagnostics caused by floating-point rounding, such as `calc(1cm - 10mm)`. Literal values are checked exactly; intermediate arithmetic is not rounded.

Variables, environmental functions, unknown units, unresolved unit combinations, and context-dependent percentage calculations are skipped. Intrinsic percentages in opacity, filter amounts, and color components can be resolved. Final NaN and infinite results are skipped. Evaluation is limited to 128 nested nodes and 10,000 visited items per expression.

The rule does not infer limits that require layout, fonts, image dimensions, or device color capabilities. Numeric image slices have no statically known upper bound. Positive decoration thickness below 1 CSS pixel is allowed because the device pixel ratio determines its effective minimum. Custom property values, strings, URLs, and unknown descriptor contexts are ignored. Direct color checks apply to properties; recognized descriptors receive calculation-range checks.

## No automatic correction

There is no autofix or suggestion because the intended value is ambiguous. Over-range filter endpoints can also intentionally affect animation interpolation, even though their painted result is clamped. Use an ESLint disable comment for intentional clamping. [Filter interpolation](https://www.w3.org/TR/filter-effects-1/#interpolation-of-filters)

```css
.photo {
	/* eslint-disable-next-line cssicorn/no-clamped-values -- Preserve the transition interpolation endpoint. */
	filter: grayscale(2);
}
```

## Embedded CSS

The rule supports the `css/css` language. To lint fenced CSS blocks in Markdown, configure the [`@eslint/markdown` processor](https://github.com/eslint/markdown/blob/main/docs/processors/markdown.md). It extracts virtual `.css` files, which the ordinary CSS config matches. This processes the fenced CSS, while Markdown prose rules require a separate run.

```js
import markdown from '@eslint/markdown';
import cssicorn from 'eslint-cssicorn';

export default [
	{
		files: ['**/*.md'],
		plugins: {markdown},
		language: 'markdown/commonmark',
		processor: 'markdown/markdown',
	},
	cssicorn.configs.recommended,
];
```

## Examples

```css
/* ❌ */
.overlay {
	opacity: 50;
}

/* ✅ */
.overlay {
	opacity: 50%;
}
```

```css
/* ❌ */
.overlay {
	background: rgb(0 0 0 / 50);
}

/* ✅ */
.overlay {
	background: rgb(0 0 0 / 50%);
}
```

```css
/* ❌ */
.photo {
	filter: grayscale(50);
}

/* ✅ */
.photo {
	filter: grayscale(50%);
}
```

```css
/* ❌ */
.photo {
	filter: blur(calc(1px - 2px));
}

/* ✅ */
.photo {
	filter: blur(calc(2px - 1px));
}
```

```css
/* ❌ */
.card {
	width: calc(1px - 2px);
}

/* ✅ */
.card {
	width: calc(2px - 1px);
}
```

```css
/* ❌ */
.heading {
	font-style: oblique calc(6 * 20deg);
}

/* ✅ */
.heading {
	font-style: oblique 20deg;
}
```

```css
/* ❌ */
.card {
	color: rgb(300 0 0);
}

/* ✅ */
.card {
	color: rgb(255 0 0);
}
```
