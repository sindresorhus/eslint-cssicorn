# no-ineffective-transitions

📝 Disallow transition targets that cannot transition under the declared behavior.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports:

- Non-animatable properties, such as `will-change`, regardless of behavior.
- Discrete properties, such as `display`, whose behavior resolves to `normal` in the same style block.

Suggestions enable `allow-discrete`. They change behavior and can affect multiple targets sharing a behavior entry, so they are not autofixes.

## Examples

```css
/* ❌ */
.panel {
	transition: display 200ms;
}

/* ✅ */
.panel {
	transition: display 200ms allow-discrete;
}
```

```css
/* ❌ */
.panel {
	transition: will-change 200ms allow-discrete;
}

/* ✅ */
.panel {
	transition: opacity 200ms;
}
```

The `transition` shorthand defaults omitted behavior to `normal`. Put a separate `transition-behavior` override after it.

Also checks shorthands whose longhands all have the same known animation type, such as `overflow` and `transition`. Explicit `transition-behavior: initial` and `unset` resolve to `normal`.

## Limitations

- Resolves literal declarations within one style block, respecting order and `!important`. Separate rules and omitted longhands remain unknown, so `transition-property: display` alone is not reported.
- Substitutions such as `var()`, other CSS-wide keywords, and unresolved values make the affected controls unknown.
- Skips custom properties, vendor-prefixed targets, and shorthands with mixed or unknown animation types. Coverage uses bundled Webref data and skips ambiguous types and special cases such as `visibility` and image-source properties.
- Later matching targets, `all`, and known shorthand expansions override earlier entries. Resolves `word-wrap` as an alias of `overflow-wrap`; logical-to-physical relationships remain unknown.
- Does not check timing, endpoint values, browser support, or custom-property registrations. Excludes keyframes, descriptor blocks, and CSS Modules interoperability blocks.

> [!NOTE]
> Entry transitions from `display: none` can also require [`@starting-style`](https://www.w3.org/TR/css-transitions-2/#defining-before-change-style). `allow-discrete` alone does not establish a starting style.

For unknown target names, use [`no-invalid-property-references`](./no-invalid-property-references.md). For controls disabled by `transition-property: none`, use [`no-ineffective-properties`](./no-ineffective-properties.md).
