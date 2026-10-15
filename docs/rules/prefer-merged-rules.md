# prefer-merged-rules

📝 Prefer merging adjacent rules with identical declarations or conditions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Unlike [`prefer-nesting`](./prefer-nesting.md), this rule can merge unrelated selectors.

## Examples

```css
/* ❌ */
.button { padding: 1rem; border-radius: 0.5rem; }
.badge { padding: 1rem; border-radius: 0.5rem; }

/* ✅ */
.button,
.badge { padding: 1rem; border-radius: 0.5rem; }
```

Also merges adjacent `@media`, `@supports`, and `@container` wrappers with identical parsed conditions, preserving content order:

```css
/* ❌ */
@media (width > 600px) {
	.button { padding: 1rem; }
}
@media (width > 600px) {
	.badge { border-radius: 0.5rem; }
}

/* ✅ */
@media (width > 600px) {
	.button { padding: 1rem; }
	.badge { border-radius: 0.5rem; }
}
```

## Details

Works inside nested and grouping rules. Selector bodies must contain only declarations matching in order, value, and importance. Custom property names are case-sensitive; raw values must match exactly, apart from leading and trailing whitespace.

Empty or malformed blocks and keyframe steps are skipped. Conditional rules are not merged when that would put a declaration after a nested rule, which [`no-declarations-after-nested-rules`](./no-declarations-after-nested-rules.md) reports. Selector merging targets current stable Chrome, Firefox, and Safari, skipping uncertain selectors and random functions.

Intervening comments prevent merging; comments inside matching rules prevent autofixing. The autofix is also skipped when the parser would misread the merged nested selector list as a declaration, as with a long list like `a:hover, button:focus, …` inside a style rule.
