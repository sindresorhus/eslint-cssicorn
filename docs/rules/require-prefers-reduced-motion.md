# require-prefers-reduced-motion

📝 Require motion effects inside `prefers-reduced-motion: no-preference` media queries.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports motion effects outside `@media (prefers-reduced-motion: no-preference)`, following [W3C technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39). A later override in `@media (prefers-reduced-motion: reduce)` does not count.

There is no autofix because only the author can decide which motion to keep and how to guard it.

## Examples

```css
/* ❌ */
.card {
	animation: slide-in 300ms;
}

/* ✅ */
@media (prefers-reduced-motion: no-preference) {
	.card {
		animation: slide-in 300ms;
	}
}
```

Transitions of color and opacity do not need a guard:

```css
/* ❌ */
.card {
	transition: transform 300ms;
}

/* ✅ */
.card {
	transition: opacity 300ms;
}
```

## Media query guard

An ancestor `@media` rule guards a declaration when every comma-separated query and every `or` branch requires `prefers-reduced-motion: no-preference`. A query without a value, such as `(prefers-reduced-motion)`, and a negated query do not count.

## Checked properties

The rule checks these properties, including their vendor-prefixed forms:

- `animation` and `animation-name`
- `transition`, `transition-property`, and `transition-duration`
- `scroll-behavior`, when the value is not `auto`, including unresolved values such as `var()`

Transitions and animations are reported unless they affect only `color`, `opacity`, or known properties that end in `-color` or `-opacity`. For example, `transition: all 300ms` and transitions of unknown properties are reported. An animation is reported unless every `@keyframes` rule with its name in the same file changes only these properties (and `animation-timing-function`).

The rule does not report:

- Custom property definitions.
- Declarations in `@keyframes`, and in CSS Modules `:export` and `:import()` blocks.
- Values that disable motion, such as `animation: none` and `transition: none`.
- `initial` and `unset`.

## Durations

A `transition` layer with an omitted or a literal zero duration, such as `transition: transform 0s`, is not reported. `animation`, `animation-name`, and `transition-property` are checked regardless of the duration.

A `transition-duration` declaration is not reported when all its durations are a literal zero, or when the same block has exactly one `transition` or `transition-property` declaration (standard or `-webkit-`) that selects only color or opacity properties, or `none`.

## Limitations

The rule does not analyze the cascade or expand variables, which can hide more moving layers, as in `transition: opacity var(--rest)`.

Keyframes from other files are unknown, so animations that use them are reported. Guarding a `@keyframes` rule does not guard the declarations that use it. For essential motion, or for harmless fades with keyframes in another file, use an ESLint disable comment with a reason.

The rule does not analyze motion from JavaScript or view transitions, and it does not guarantee WCAG compliance.
