# no-clamped-values

📝 Disallow CSS values that browsers silently clamp.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports CSS values that browsers silently clamp, including constant calculations. For example, `opacity: 50` is fully opaque. The error message shows the affected component, its evaluated value, and the bound.

There is no autofix because the intended value is ambiguous.

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

## Checked values

- Opacity (`opacity`, `fill-opacity`, `stroke-opacity`, `stop-opacity`, `flood-opacity`, `shape-image-threshold`): 0 to 1, or 0% to 100%.
- `grayscale()`, `invert()`, `opacity()`, and `sepia()` filter amounts: up to 1 or 100%.
- Calculated `blur()` lengths: at least 0.
- Calculated `font-style: oblique` angles, including `@font-face` endpoints: `-90deg` to `90deg`.
- Absolute RGB channels: 0 to 255, or 0% to 100%.
- Absolute Lab and LCH lightness: 0 to 100. Absolute OKLab and OKLCH lightness: 0 to 1, or 0% to 100%.
- Absolute HSL saturation, and LCH and OKLCH chroma: at least 0.
- Color alpha (including relative colors), space-separated `device-cmyk()` channels, and absolute custom-profile `color()` channels: 0 to 1, or 0% to 100%.
- `perspective` and `perspective()`: at least 1px when statically resolvable.
- `border-image-slice`, `mask-border-slice`, and shorthand slice percentages: up to 100%.
- `text-decoration-thickness` and shorthand thickness: greater than 0 (browsers floor it to one device pixel).

The [filter](https://www.w3.org/TR/filter-effects-1/#FilterFunctions) checks include `backdrop-filter` and vendor-prefixed properties. Direct negative filter amounts and blur lengths are invalid syntax, so they are skipped, but negative calculated values are checked. Brightness, contrast, and saturation above 100% are allowed.

In [Color 4](https://www.w3.org/TR/css-color-4/) and [Color 5](https://www.w3.org/TR/css-color-5/#relative-colors), relative non-alpha channels, predefined `color()` channels, and HSL saturation above 100% are allowed. Hue wrapping, HWB normalization, and gamut mapping are not reported.

## Calculations

Other calculations use the bounds of the property or known descriptor from the bundled CSS-tree grammar. Only the final result is checked, with integer rounding and tolerance for floating-point errors (see [calculation ranges](https://www.w3.org/TR/css-values-4/#calc-range)).

Intrinsic percentages in opacity, filter amounts, and color components can be resolved.

## Intentional clamping

Over-range filter endpoints can intentionally affect [filter interpolation](https://www.w3.org/TR/filter-effects-1/#interpolation-of-filters) in animations. Use a disable comment for them:

```css
/* ✅ */
.photo {
	/* eslint-disable-next-line cssicorn/no-clamped-values -- Preserve the transition interpolation endpoint. */
	filter: grayscale(2);
}
```

## Limitations

- When the bundled grammar has no bound for a property or descriptor, calculations for it are not checked.
- Unresolved variables, environmental functions, unknown units, context-dependent percentages, and nonfinite results are skipped.
- Custom properties, strings, URLs, and unknown descriptor contexts are ignored.
- Direct color checks apply only to properties.
- Bounds that require layout, fonts, images, or device information are not inferred, so a positive decoration thickness below 1 CSS pixel is allowed.
- [Oblique angles](https://www.w3.org/TR/css-fonts-4/#font-style-prop) in the `font` shorthand are skipped, as are invalid direct angle literals.
