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

Component definitions qualify within their own declaration block and its nested grouping rules, such as `@media` and `@supports`:

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

- Requires `rgb(var(--channels))` or `hsl(var(--channels))`, including `rgba()`/`hsla()` aliases, with no fallback or extra components. Alpha must be omitted, `1`, or `100%`.
- Unconditional rules containing only bare `:root`/`html` selectors qualify file-wide, including inside `@layer`. Other definitions qualify in their block and nested grouping rules, stopping at nested selectors.
- Uses the nearest block with a matching relationship, or roots if none. Ambiguous matches are skipped. Equivalent definitions are allowed; conflicting or unsupported definitions anywhere in the file disqualify a token.
- Supports comma/slash alpha variants in ordinary and custom-property values, including gradients and shadows. Preserves all text after the separator and uses the matching RGB/HSL family.
- Definitions may follow consumers. Token names are decoded and case-sensitive.

## Limitations

Only explicit, same-file relationships are discovered. Cascade equivalence is not checked: overriding channels in a descendant can leave an inherited full-color token unchanged. Review suggestions for [custom-property inheritance](https://www.w3.org/TR/css-variables-1/#defining-variables).

Conditional definitions do not qualify outside their block.

Skips existing relative colors (including `alpha(from …)`), self-references, substitution fallbacks, strings, URLs, at-rule preludes, descriptor blocks, and CSS Modules interop declarations. Comments in the function prefix through the alpha separator prevent a suggestion.

`color-mix()` itself is not rewritten: mixing with transparent scales alpha rather than replacing it. Channel-based colors inside a mix can still receive suggestions.
