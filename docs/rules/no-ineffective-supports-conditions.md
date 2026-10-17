# no-ineffective-supports-conditions

📝 Disallow supports conditions that do not test their value functions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Some supports conditions accept a value without establishing support for the functions in it, so a progressive-enhancement guard can admit browsers that lack the intended feature.

- A custom-property test only checks that the value is accepted as tokens, also when the custom property has a typed `@property` registration, as the [CSS Properties and Values API specification](https://www.w3.org/TR/css-properties-values-api-1/#conditional-rules) requires.
- For ordinary properties, substitutions such as `var()`, `env()`, and `attr()` defer value validation, so surrounding functions and functions in their fallbacks are not tested. Similarly, `first-valid()` can succeed through another alternative.

This rule reports these conditions in `@supports`, `@import supports()`, and direct declarations in `@supports-condition` blocks. It reports at most once per declaration condition, for the first affected function.

There is no autofix because choosing a replacement property or value requires the author's intent.

## Examples

```css
/* ❌ */
@supports (--brand: oklch(60% 0.2 20)) {}

/* ✅ */
@supports (color: oklch(60% 0.2 20)) {}
```

To test both substitution support and a value function, use separate declaration conditions joined with `and`.

```css
/* ❌ */
@supports (color: oklch(var(--lightness) 0.2 20)) {}

/* ✅ */
@supports (color: var(--brand)) and (color: oklch(60% 0.2 20)) {}
```

```css
/* ❌ */
@supports (color: var(--brand, oklch(60% 0.2 20))) {}

/* ✅ */
@supports (color: oklch(60% 0.2 20)) {}
```

```css
/* ❌ */
@import "theme.css" supports(--brand: oklch(60% 0.2 20));

/* ✅ */
@import "theme.css" supports(color: oklch(60% 0.2 20));
```

The draft [`@supports-condition` syntax](https://drafts.csswg.org/css-conditional-5/#at-supports-condition) defines named support queries. Direct declarations in its block are checked:

```css
/* ❌ */
@supports-condition --modern-color {
	--brand: oklch(60% 0.2 20);
}

/* ✅ */
@supports-condition --modern-color {
	color: oklch(60% 0.2 20);
}
```

## Deliberate support probes

To test custom-property or substitution support itself, use a simple value:

```css
/* ✅ */
@supports (--probe: red) {}
@supports (color: var(--probe)) {}
@supports (color: var(--probe, red)) {}
@supports (width: env(safe-area-inset-left, 0px)) {}
```

A custom-property probe with a function in its value can be intentional, but the rule cannot infer the intended feature and reports it. This is why the rule is in `recommended` but not `unopinionated`.

## Limitations

The rule only reports value functions that the CSS parser knows. For example, `repeat()` and `shape()` are not recognized.

Keywords, units, unknown functions and their contents, strings, comments, and URLs are ignored. For example, `(--probe: 1cqi)` is allowed but does not test the `cqi` unit.

Queries inside `if()`, including `supports()` queries, and typed `attr()` argument syntax are ignored:

```css
/* ✅ */
@supports (--probe: attr(data-width type(<length>))) {}
@supports (--probe: if(supports(color: oklch(60% 0.2 20)): red; else: blue)) {}
```

The rule does not resolve variables, inspect guarded declarations, or infer browser compatibility.
