# require-prefers-reduced-motion

📝 Require motion effects inside `prefers-reduced-motion: no-preference` media queries.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Require motion inside `@media (prefers-reduced-motion: no-preference)`, following [W3C C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39). Later `reduce` overrides do not count.

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

Every comma-separated or `or` branch must require `no-preference`. Qualifying ancestors protect nested declarations; bare or negated preference queries do not qualify.

## Coverage

Checks animations, transition shorthands and property/duration longhands, and smooth or unresolved scrolling, including prefixed forms. Unknown effects require a guard.

Known color/opacity properties are exempt; animations must qualify in every same-file definition. Static styles, custom-property definitions, animation timing modifiers, disabling values, and `initial`/`unset` resets are ignored.

Transition shorthands with omitted or literal zero duration are exempt. Moving animation and `transition-property` selections remain checked regardless of duration. Nonzero or unresolved `transition-duration` is exempt with exactly one same-block `transition`/`transition-property` declaration (standard or `-webkit-`) selecting only non-motion targets or `none`.

## Limitations

No cascade analysis or variable expansion; variables can hide additional moving layers. Imported keyframes remain unknown, and guarding definitions does not protect references.

Use ESLint disable comments with reasons for essential motion or harmless external fades. No automatic fixes, JavaScript/view-transition analysis, or WCAG compliance guarantee.
