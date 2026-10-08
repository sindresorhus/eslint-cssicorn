# prefer-merged-rules

📝 Prefer merging adjacent rules with identical declarations or conditions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer a single editing location for adjacent rules with the same declarations, or adjacent conditional rules with the same condition.

Unlike [`prefer-nesting`](./prefer-nesting.md), selectors do not need to share a parent or other structure.

<!-- The declaration-only boundary avoids changing the specificity of nested selectors. -->

## Examples

```css
/* ❌ */
.button { padding: 1rem; border-radius: 0.5rem; }
.badge { padding: 1rem; border-radius: 0.5rem; }

/* ✅ */
.button,
.badge { padding: 1rem; border-radius: 0.5rem; }
```

Adjacent `@media`, `@supports`, and `@container` rules with matching conditions can share one wrapper. Their contents are kept in their original order:

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

Both transformations also work inside nested style rules and grouping rules such as `@layer` and `@scope`.

## Matching

Declaration blocks must contain only declarations, in the same order, with matching values and `!important` flags. Standard property names are compared case-insensitively and CSS escapes are decoded. Custom property names remain case-sensitive, and their raw values are compared exactly. The rule does not equate different colors, numbers, or value keyword spellings.

Conditional names are compared case-insensitively with escapes decoded. Conditions are compared using their parsed serialization, without rearranging queries or treating different query syntax as equivalent. Wrapper contents do not need to match.

Only adjacent siblings are considered. Intervening comments or other nodes prevent merging. Exact duplicate selectors are removed from the combined selector list. Declaration order, fallbacks, original spelling, indentation, and line endings are preserved.

## Limitations

Selector merging targets current stable Chrome, Firefox, and Safari. It supports common selectors and parsed functions such as `:has()`, `:is()`, `:where()`, `:not()`, and `:nth-child(... of ...)`. Unknown, vendor-specific, unsupported, or uncertain selectors are skipped, including opaque functional arguments, named namespaces, and the attribute `s` modifier. An invalid selector could otherwise invalidate the entire combined selector list.

Empty blocks, keyframe steps, malformed candidates, declaration blocks containing nested rules, and declarations containing explicit `random()` or `random-item()` functions are skipped. Only `@media`, `@supports`, and `@container` wrappers are merged; `@layer`, `@scope`, and other wrappers remain separate.

Comments inside matching rules prevent autofixing, but the rule still reports them. A conditional wrapper whose final blockless at-rule lacks a semicolon can also be reported without a fix. Missing final declaration semicolons are inserted when needed to separate merged wrapper contents.
