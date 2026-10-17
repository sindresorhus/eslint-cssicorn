# prefer-relative-colors

📝 Prefer relative colors for alpha variants of existing color custom properties.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports alpha variants assembled from the channels of a color custom property, and suggests deriving them from the full color custom property with relative color syntax, so that they keep working if its color representation changes. See [Chrome's relative color guidance](https://developer.chrome.com/blog/css-relative-color-syntax).

There is no autofix because changing the dependencies between custom properties can affect inheritance, overrides, registration, and browser compatibility, but a suggestion is provided.

## Examples

```css
/* Setup */
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

HSL relationships and custom property variants are also supported:

```css
/* Setup */
:root {
	--brand: hsl(var(--brand-channels));
}

/* ❌ */
.button {
	--translucent-brand: hsl(var(--brand-channels) / 50%);
}

/* ✅ */
.button {
	--translucent-brand: hsl(from var(--brand) h s l / 50%);
}
```

A definition in a component applies in its own block and its nested grouping rules, such as `@media` and `@supports`:

```css
/* ❌ */
.card {
	--accent: rgb(var(--accent-channels));
	border-color: rgb(var(--accent-channels) / calc(var(--opacity) * .5));
}

/* ✅ */
.card {
	--accent: rgb(var(--accent-channels));
	border-color: rgb(from var(--accent) r g b / calc(var(--opacity) * .5));
}
```

## Supported patterns

- The full color custom property must be `rgb(var(--channels))` or `hsl(var(--channels))`, or the `rgba()` or `hsla()` alias, with no fallback, no extra components, and an alpha that is omitted, `1`, or `100%`.
- A definition in an unconditional rule whose selectors are all bare `:root` or `html`, also inside `@layer`, applies to the whole file. Other definitions do not apply in nested style rules or outside their block.
- The nearest block with a matching definition is used, or else the root definitions. Ambiguous matches are skipped. Equivalent definitions are allowed, but a conflicting or unsupported definition anywhere in the file disqualifies the custom property.
- Alpha variants can use a comma or a slash, in ordinary and custom property values, including gradients and shadows. The suggestion keeps all text after the separator, and uses the matching RGB or HSL function.
- Definitions can come after their uses. Custom property names are decoded and case-sensitive.

## Limitations

The rule finds only explicit relationships in the same file, and does not check the cascade: overriding the channels in a descendant can leave an inherited full color custom property unchanged. Review the suggestions for [custom property inheritance](https://www.w3.org/TR/css-variables-1/#defining-variables).

The rule ignores:

- Existing relative colors, including `alpha(from …)`.
- Self-references.
- Substitution fallbacks.
- Strings and URLs.
- At-rule preludes and descriptor blocks.
- CSS Modules interop declarations.
- Colors with a comment between the start of the function and the alpha separator.

`color-mix()` itself is not rewritten, because mixing with `transparent` scales the alpha instead of replacing it, but channel-based colors inside a mix can still get suggestions.
