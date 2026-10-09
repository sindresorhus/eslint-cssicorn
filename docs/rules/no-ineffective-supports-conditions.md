# no-ineffective-supports-conditions

📝 Disallow supports conditions that do not test their value functions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Some supports conditions accept a value without establishing support for the functions it contains. This can make a progressive-enhancement guard admit browsers that do not support the intended feature.

Custom-property tests check whether the value is accepted as tokens. They do not check whether functions in the value are supported. This remains true when the custom property has a typed `@property` registration, as required by the [CSS Properties and Values API specification](https://www.w3.org/TR/css-properties-values-api-1/#conditional-rules).

For ordinary properties, substitutions such as `var()`, `env()`, and `attr()` defer value validation. A condition containing them does not establish support for surrounding functions or functions in their fallbacks. Similarly, `first-valid()` can succeed through another alternative without establishing support for each function in its arguments.

This rule reports these conditions in `@supports`, `@import supports()`, and direct declarations in `@supports-condition` blocks. It reports at most once per declaration condition, identifying the first affected function.

## Examples

```css
/* ❌ */
@supports (--brand: oklch(60% 0.2 20)) {}

/* ✅ */
@supports (color: oklch(60% 0.2 20)) {}
```

```css
/* ❌ */
@supports (color: oklch(var(--lightness) 0.2 20)) {}

/* ✅ */
@supports (color: var(--brand)) and (color: oklch(60% 0.2 20)) {}
```

To test both substitution support and a value function, use separate declaration conditions joined with `and`.

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

Use a simple value when testing custom-property or substitution support itself. These probes are allowed:

```css
@supports (--probe: red) {}
@supports (color: var(--probe)) {}
@supports (color: var(--probe, red)) {}
@supports (width: env(safe-area-inset-left, 0px)) {}
```

A function-bearing custom-property probe can be intentional. The rule still reports it because it cannot infer the intended feature. This is why the rule is enabled in `recommended` but not `unopinionated`.

## Detection limits

Detection is conservative and uses the parser's existing catalogue of known value functions. The catalogue is not exhaustive; for example, `repeat()` and `shape()` are currently not recognized.

Keywords, units, unknown functions and their contents, strings, comments, and URLs are ignored. For example, `(--probe: 1cqi)` is allowed even though it does not test support for the `cqi` unit.

Queries inside `if()`, including `supports()` queries, are outside this rule's scope. Typed `attr()` argument syntax is also ignored:

```css
@supports (--probe: attr(data-width type(<length>))) {}
@supports (--probe: if(supports(color: oklch(60% 0.2 20)): red; else: blue)) {}
```

The rule does not resolve variables, inspect guarded declarations, or infer browser compatibility. It provides no fixes or suggestions because choosing a replacement property or value requires the author's intent.
