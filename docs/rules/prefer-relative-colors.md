# prefer-relative-colors

📝 Prefer relative colors for alpha variants of existing color custom properties.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Suggest deriving alpha variants from an existing full-color custom property instead of assembling them from its channel representation. This lets consumers keep using the same token if its color representation changes. See [Chrome's relative color guidance](https://developer.chrome.com/blog/css-relative-color-syntax).

This rule provides suggestions because changing token dependencies can affect inheritance, overrides, registration, and browser compatibility.

## Examples

A direct RGB relationship in an unconditional root rule:

```css
:root {
	--brand: rgb(var(--brand-channels));
}

/* ❌ */
.button {
	background: rgba(var(--brand-channels), var(--opacity));
}

/* ✅ */
.button {
	background: rgb(from var(--brand) r g b / var(--opacity));
}
```

HSL relationships and custom-property variants are also supported:

```css
:root {
	--brand: hsl(var(--brand-channels));
	/* ❌ */
	--translucent-brand: hsl(var(--brand-channels) / 50%);
	/* ✅ */
	--translucent-brand: hsl(from var(--brand) h s l / 50%);
}
```

Component definitions qualify within their own declaration block:

```css
.card {
	--accent: rgb(var(--accent-channels));
	/* ❌ */
	border-color: rgb(var(--accent-channels) / calc(var(--opacity) * .5));
	/* ✅ */
	border-color: rgb(from var(--accent) r g b / calc(var(--opacity) * .5));
}
```

## Matching

- Requires a complete direct definition of `rgb(var(--channels))` or `hsl(var(--channels))`, including their `rgba()` and `hsla()` aliases. The channel reference must have no fallback, and the definition must have no alpha or additional components.
- Unconditional bare `:root` and `html` rules qualify throughout the file, including inside `@layer`. Other definitions qualify only within their own declaration block.
- Prefers a unique same-block relationship over a root relationship. Ambiguous relationships are skipped. Repeated identical definitions are accepted; a conflicting or unsupported definition of the destination token anywhere in the file disqualifies it.
- Handles comma- and slash-separated alpha variants, including functions such as `var()` and `calc()` for alpha. Preserves the alpha expression verbatim and uses relative RGB or HSL syntax matching the relationship.
- Checks ordinary and custom-property declaration values, including colors in gradients and shadows. Definitions may appear after consumers. Custom-property names are decoded and case-sensitive.

## Limitations

The rule does not discover imported definitions, guess token names, compare literal colors, or analyze the cascade. Suggestions require review: an inherited full-color token can retain its original channels when a descendant overrides only the channel token, so the suggested expression may produce a different color. See [custom-property inheritance](https://www.w3.org/TR/css-variables-1/#defining-variables).

Only the exact declaration block establishes a local relationship; nested blocks do not inherit discovery from an outer component block. Conditional root definitions do not establish a file-wide relationship.

Existing relative colors, channel references with fallbacks, commented replacements, self-references, substitution fallbacks, strings, URLs, at-rule preludes, descriptor blocks, and CSS Modules `:export`/`:import()` declarations are ignored.

`color-mix()` is not rewritten. Mixing with transparent scales a color's existing alpha, while an explicit alpha in relative color syntax replaces it. Channel-based colors nested inside a mix can still receive suggestions.
