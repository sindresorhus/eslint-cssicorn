# no-invalid-media-features

📝 Disallow unknown media features, invalid values, and invalid notation.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Media query parsers accept unknown feature names and values so that future additions do not invalidate an entire query. A typo therefore silently makes the affected query fail to match.

This rule checks media feature names and validates values and notation for known features. It supports boolean, plain, and range notation, including deprecated standard `device-*` features and features defined in current drafts. Vendor-prefixed features (including the old Firefox form, like `min--moz-device-pixel-ratio`) and custom media queries are ignored.

Values that contain an unknown function, like Tailwind CSS `theme()`, are not validated, because such functions are usually replaced at build time. Feature names and notation are still checked. Values with known functions, like `calc()`, are still validated.

Range notation is only allowed for unprefixed range features, like `width` and `resolution`. Discrete features, like `orientation` and `grid`, cannot use range notation. Features prefixed with `min-` or `max-` require plain notation with a value, like `(min-width: 40rem)`.

Chained comparisons must place the feature between two values and use the same comparison direction. Both ascending and descending chains are allowed, including combinations of strict and inclusive comparisons. Other media query grammar errors are handled by the CSS parser.

## Examples

```css
/* ❌ */
@media (unknown-feature: 10px) {}

/* ✅ */
@media (width: 10px) {}
```

```css
/* ❌ */
@media (width: red) {}

/* ✅ */
@media (width >= 40rem) {}
```

```css
/* ❌ */
@media (orientation > portrait) {}

/* ✅ */
@media (orientation: portrait) {}
```

```css
/* ❌ */
@media (min-width) {}

/* ✅ */
@media (min-width: 40rem) {}
```

```css
/* ❌ */
@media (max-width <= 60rem) {}

/* ✅ */
@media (width <= 60rem) {}
```

```css
/* ❌ */
@media (40rem < width > 60rem) {}

/* ✅ */
@media (40rem < width <= 60rem) {}
```

```css
/* ❌ */
@media (width < 40rem < 60rem) {}

/* ✅ */
@media (60rem > width >= 40rem) {}
```

## Standards

The known feature names and value grammars follow [Media Queries Level 5](https://drafts.csswg.org/mediaqueries-5/), the [Device Posture API](https://w3c.github.io/device-posture/), [CSS Round Display](https://drafts.csswg.org/css-round-display/), [Window Management](https://w3c.github.io/window-management/), and the [Window Controls Overlay draft](https://wicg.github.io/window-controls-overlay/).
