# no-ineffective-transitions

📝 Disallow transition targets that cannot transition under the declared behavior.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports transition targets that cannot transition:

- Non-animatable properties, such as `will-change`, regardless of behavior.
- Discrete properties, such as `display`, whose behavior resolves to `normal` in the same style block.

A transition that is not reported can still fail to run, because the rule does not check timing, endpoint values, browser support, or custom-property registrations.

There is no autofix because adding `allow-discrete` can affect other targets that share the behavior entry, but a suggestion is provided. Reports caused by `initial` or `unset` on `transition` or `all` have no suggestion.

## Examples

```css
/* ❌ */
.panel {
	transition: display 200ms;
}

/* ✅ */
.panel {
	transition: allow-discrete display 200ms;
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

The `transition` shorthand resets an omitted behavior to `normal`, so put `transition-behavior` after it. The suggestion adds `allow-discrete` to the shorthand instead.

```css
/* ❌ */
.panel {
	transition-behavior: allow-discrete;
	transition: display 200ms;
}

/* ✅ */
.panel {
	transition: display 200ms;
	transition-behavior: allow-discrete;
}
```

> [!NOTE]
> Entry transitions from `display: none` can also require [`@starting-style`](https://www.w3.org/TR/css-transitions-2/#defining-before-change-style), because `allow-discrete` alone does not establish a starting style.

## Resolved targets

The rule also checks shorthands whose longhands all have the same known animation type, such as `overflow`, `background-repeat`, and `transition`. `initial` and `unset` on `transition-behavior`, `transition`, or `all` set the behavior to `normal`. Later matching targets, `all`, and known shorthand expansions override earlier entries.

The rule resolves `word-wrap` and known `-webkit-` aliases, such as `-webkit-backface-visibility`, most of which come from the [Compatibility Standard](https://compat.spec.whatwg.org/#css-property-aliases). It also checks `-webkit-transition` and `-webkit-transition-property`.

## Limitations

- The rule resolves declarations in one style block, in order and with `!important`. Separate rules, omitted longhands, substitutions such as `var()`, and unresolved CSS-wide values are unknown, so `transition-property: display` alone is not reported.
- The animation type of each property comes from [Webref](https://github.com/w3c/webref). The rule ignores custom properties, vendor-prefixed targets not in the alias list, shorthands with mixed or unknown animation types, and properties with special interpolation, such as `visibility` and image-source properties.
- Logical properties are not resolved to physical properties.

## Related rules

- [`no-invalid-property-references`](./no-invalid-property-references.md) reports unknown target names.
- [`no-ineffective-properties`](./no-ineffective-properties.md) reports transition controls that `transition-property: none` disables.
