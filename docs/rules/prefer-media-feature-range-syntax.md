# prefer-media-feature-range-syntax

📝 Prefer modern media feature range syntax.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports standardized range media features with a `min-` or `max-` prefix, and prefers the [Media Queries Level 4 range syntax](https://www.w3.org/TR/mediaqueries-4/#mq-range-context), which is easier to read because it puts the feature and its value in mathematical order. It is [supported in modern browsers](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries#creating_complex_media_queries).

The autofix converts a single bound, and a suggestion combines a lower and an upper bound.

## Examples

Single bounds are fixed without changing their meaning:

```css
/* ❌ */
@media (min-width: 500px) {}

/* ✅ */
@media (width >= 500px) {}
```

```css
/* ❌ */
@media (max-width: 999px) {}

/* ✅ */
@media (width <= 999px) {}
```

Directly adjacent lower and upper bounds for the same feature are combined by a suggestion, not by `--fix`:

```css
/* ❌ */
@media (min-width: 30em) and (max-width: 50em) {}

/* ✅ */
@media (30em <= width <= 50em) {}
```

When the maximum is a nonnegative safe integer written in decimal notation with a pixel unit, the suggestion uses the common half-open breakpoint form:

```css
/* ❌ */
@media (min-width: 500px) and (max-width: 999px) {}

/* ✅ */
@media (500px <= width < 1000px) {}
```

This intentionally includes fractional values between `999px` and `1000px`, which is why it is only a suggestion. Other values use an exact inclusive range.

## Limitations

Only `@media` rules are checked, not media queries in other contexts, such as `@container`, `@import`, and `@custom-media`.

Features that contain comments are reported without a fix or suggestion.
