# prefer-merged-rules

📝 Prefer merging adjacent rules with identical declarations or conditions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports adjacent rules with identical declarations, and adjacent `@media`, `@supports`, and `@container` rules with identical parsed conditions. The autofix merges them into one rule, with a selector list for style rules, and keeps the order of the content of conditional rules.

## Examples

```css
/* ❌ */
.button { padding: 1rem; border-radius: 0.5rem; }
.badge { padding: 1rem; border-radius: 0.5rem; }

/* ✅ */
.button,
.badge { padding: 1rem; border-radius: 0.5rem; }
```

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

## Matching rules

The rule also works inside nested and grouping rules. Style rule bodies must contain only declarations, with the same order, values, and importance. Custom property names are case-sensitive, and their raw values must match exactly, apart from leading and trailing whitespace.

## Nested selector lists

When the parser would read a merged nested selector list as a declaration, as with a long list like `a:hover, button:focus, …` inside a style rule, the autofix adds a leading `&`, as in `& a:hover, button:focus, …`, which matches the same elements. When the first selector already contains `&`, or the rules are inside `@scope`, the autofix is skipped.

## Limitations

- Empty or malformed blocks and keyframe steps are skipped.
- Conditional rules are not merged when that would put a declaration after a nested rule, which [`no-declarations-after-nested-rules`](./no-declarations-after-nested-rules.md) reports.
- Selectors are merged only when the rule is sure that current stable Chrome, Firefox, and Safari support them, because one unsupported selector invalidates the whole merged selector list.
- Style rules with `random()` or `random-item()` in a declaration are not merged.
- Comments between the rules prevent merging, and comments inside them prevent the autofix.

## Related rules

- [`prefer-nesting`](./prefer-nesting.md) nests related selectors. Unlike `prefer-nesting`, this rule can merge unrelated selectors.
