# no-clamped-values

📝 Disallow CSS values that browsers silently clamp.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Reports CSS values that browsers silently clamp, including constant calculations. For example, `opacity: 50` renders fully opaque paint. Diagnostics show the affected component, its evaluated value, and the bound.

## Checked values

- Opacity (`opacity`, `fill-opacity`, `stroke-opacity`, `stop-opacity`, `flood-opacity`, `shape-image-threshold`): 0 to 1, or 0% to 100%.
- `grayscale()`, `invert()`, `opacity()`, `sepia()` filter amounts: up to 1 or 100%.
- Calculated `blur()` lengths: at least 0.
- Calculated `font-style: oblique` angles, including `@font-face` endpoints: −90deg to 90deg.
- Absolute RGB channels: 0 to 255, or 0% to 100%.
- Absolute Lab/LCH lightness: 0 to 100; OKLab/OKLCH lightness: 0 to 1, or 0% to 100%.
- Absolute HSL saturation and LCH/OKLCH chroma: at least 0.
- Color alpha (including relative colors), space-separated `device-cmyk()` channels, and absolute custom-profile `color()` channels: 0 to 1, or 0% to 100%.
- `perspective` and `perspective()`: at least 1px when statically resolvable.
- `border-image-slice`, `mask-border-slice`, and shorthand slice percentages: up to 100%.
- `text-decoration-thickness` and shorthand thickness: at least one device pixel.

Filter checks include `backdrop-filter` and vendor-prefixed properties. Direct negative filter amounts and blur lengths are invalid syntax and skipped; negative calculated values are checked. Brightness, contrast, and saturation above 100% are allowed. [Filter semantics](https://www.w3.org/TR/filter-effects-1/#FilterFunctions)

Relative non-alpha channels, predefined `color()` channels, and HSL saturation above 100% are allowed. Hue wrapping, HWB normalization, and gamut mapping are not reported. [Color 4](https://www.w3.org/TR/css-color-4/), [Color 5](https://www.w3.org/TR/css-color-5/#relative-colors)

## Calculations and limits

Other calculations use property or known descriptor bounds from the bundled CSS-tree grammar; missing bounds can mean missed diagnostics. Only the final result is checked, with integer rounding and tolerance for floating-point errors. [Calculation ranges](https://www.w3.org/TR/css-values-4/#calc-range)

Unresolved variables, environmental functions, unknown units, context-dependent percentages, and nonfinite results are skipped. Intrinsic percentages in opacity, filter amounts, and color components can be resolved. Custom properties, strings, URLs, and unknown descriptor contexts are ignored. Direct color checks apply only to properties.

Bounds requiring layout, fonts, images, or device information are not inferred. Positive decoration thickness below 1 CSS pixel is therefore allowed. Oblique angles in the `font` shorthand are skipped, as are invalid direct angle literals. [Font-style bounds](https://www.w3.org/TR/css-fonts-4/#font-style-prop)

## No automatic correction

No autofix or suggestion is offered because the intended value is ambiguous. Over-range filter endpoints can intentionally affect animation interpolation. Suppress intentional clamping with an ESLint disable comment. [Filter interpolation](https://www.w3.org/TR/filter-effects-1/#interpolation-of-filters)

```css
.photo {
	/* eslint-disable-next-line cssicorn/no-clamped-values -- Preserve the transition interpolation endpoint. */
	filter: grayscale(2);
}
```

## Examples

```css
/* ❌ */
.overlay { opacity: 50; }

/* ✅ */
.overlay { opacity: 50%; }
```

```css
/* ❌ */
.overlay { background: rgb(0 0 0 / 50); }

/* ✅ */
.overlay { background: rgb(0 0 0 / 50%); }
```

```css
/* ❌ */
.photo { filter: grayscale(50); }

/* ✅ */
.photo { filter: grayscale(50%); }
```

```css
/* ❌ */
.photo { filter: blur(calc(1px - 2px)); }

/* ✅ */
.photo { filter: blur(calc(2px - 1px)); }
```

```css
/* ❌ */
.card { width: calc(1px - 2px); }

/* ✅ */
.card { width: calc(2px - 1px); }
```

```css
/* ❌ */
.heading { font-style: oblique calc(6 * 20deg); }

/* ✅ */
.heading { font-style: oblique 20deg; }
```

```css
/* ❌ */
.card { color: rgb(300 0 0); }

/* ✅ */
.card { color: rgb(255 0 0); }
```
