# no-clamped-values

📝 Disallow CSS values that browsers silently clamp.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

CSS accepts some values outside their effective range and silently clamps them. For example, `opacity: 50` produces fully opaque paint rather than 50% opacity. Syntax-validation rules generally accept these values.

This rule reports known clamping bounds for literal values and constant calculations. Diagnostics identify the affected component, its effective value, and the browser's bound.

## Supported values

| Context | Effective range |
| --- | --- |
| `opacity`, `fill-opacity`, `stroke-opacity`, `stop-opacity`, `flood-opacity`, `shape-image-threshold` | 0 to 1, or 0% to 100% |
| `grayscale()`, `invert()`, `opacity()`, `sepia()` filter amounts | Up to 1 or 100% |
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

Filter checks also apply to `backdrop-filter` and vendor-prefixed properties. Brightness, contrast, and saturation above 100% are allowed. Negative direct filter amounts are invalid syntax; negative calculated amounts can be clamped and are reported.

Relative non-alpha color components and predefined `color()` channels retain out-of-range values and are allowed. HSL saturation has no upper bound; HWB normalization and gamut mapping are different behaviors and are not reported. These checks follow the current [CSS Color 4](https://www.w3.org/TR/css-color-4/) and [CSS Color 5](https://www.w3.org/TR/css-color-5/#relative-colors) specifications.

## Calculations

The rule evaluates constant CSS math functions, including `calc()`, comparisons, rounding, trigonometric functions, powers, and logarithms. It checks the complete calculation against its receiving property or recognized descriptor's numeric range. General range coverage depends on the bundled CSS-tree grammar metadata; bounds absent from that metadata can be missed. Integer results are rounded before checking integer bounds. Intermediate values that cancel into range are allowed. [CSS calculation range checking](https://www.w3.org/TR/css-values-4/#calc-range)

Numeric range checks allow calculated results within `1e-10 × max(1, |bound|)` of a bound to avoid diagnostics caused by floating-point rounding, such as `calc(1cm - 10mm)`. Literal values are checked exactly; intermediate arithmetic is not rounded.

Variables, environmental functions, unknown units, unresolved unit combinations, and context-dependent percentage calculations are skipped. Intrinsic percentages in opacity, filter amounts, and color components can be resolved. Final NaN and infinite results are skipped. Evaluation is limited to 128 nested nodes and 10,000 visited items per expression.

The rule does not infer limits that require layout, fonts, image dimensions, or device color capabilities. Numeric image slices have no statically known upper bound. Positive decoration thickness below 1 CSS pixel is allowed because the device pixel ratio determines its effective minimum. Custom property values, strings, URLs, and unknown descriptor contexts are ignored. Direct color checks apply to properties; recognized descriptors receive calculation-range checks.

## No automatic correction

There is no autofix or suggestion because the intended value is ambiguous. Over-range filter endpoints can also intentionally affect animation interpolation, even though their painted result is clamped. Use an ESLint disable comment for intentional clamping. [Filter interpolation](https://www.w3.org/TR/filter-effects-1/#interpolation-of-filters)

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
.card {
	color: rgb(300 0 0);
}

/* ✅ */
.card {
	color: rgb(255 0 0);
}
```
