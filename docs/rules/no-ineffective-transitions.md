# no-ineffective-transitions

📝 Disallow transition targets that cannot transition under the declared behavior.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports:

- Non-animatable properties, such as `will-change`, regardless of behavior.
- Discrete properties, such as `display`, whose behavior resolves to `normal` in the same style block.

Checks target eligibility without guaranteeing a transition will run. Timing, endpoint values, browser support, and custom-property registrations are outside its scope.

Suggestions enable `allow-discrete`. They can affect multiple targets sharing a behavior entry, so they are not autofixes. Reports based on `transition` or `all` resets have no suggestions.

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

Also checks shorthands whose longhands all have the same known animation type, such as `overflow`, `background-repeat`, and `transition`. Explicit `initial` and `unset` on `transition-behavior`, `transition`, or `all` establish `normal` behavior.

Later matching targets, `all`, and known shorthand expansions override earlier entries. Resolves `word-wrap` as an alias of `overflow-wrap`.

## Limitations

- Resolves declarations within one style block, respecting order and `!important`. Separate rules, omitted longhands, substitutions such as `var()`, and unresolved CSS-wide values remain unknown. `transition-property: display` alone is not reported.
- Uses conservative Webref coverage. Skips custom properties, vendor-prefixed targets, mixed or unknown shorthand types, and special interpolation cases such as `visibility` and image-source properties. Logical-to-physical relationships remain unresolved.

> [!NOTE]
> Entry transitions from `display: none` can also require [`@starting-style`](https://www.w3.org/TR/css-transitions-2/#defining-before-change-style). `allow-discrete` alone does not establish a starting style.

For unknown target names, use [`no-invalid-property-references`](./no-invalid-property-references.md). For controls disabled by `transition-property: none`, use [`no-ineffective-properties`](./no-ineffective-properties.md).
