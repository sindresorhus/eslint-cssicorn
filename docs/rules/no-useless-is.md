# no-useless-is

📝 Disallow unnecessary `:is()` wrappers.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule removes `:is()` around a single selector when doing so preserves matching and specificity.

## Examples

```css
/* ❌ */
a:is(.active) {}

/* ✅ */
a.active {}
```

```css
/* ❌ */
.foo:has(:is(.bar)) {}

/* ✅ */
.foo:has(.bar) {}
```

Complex arguments are only unwrapped when `:is()` is the entire selector of a style rule outside nested rules and `@scope`. Grouping at-rules such as `@media` are supported.

```css
/* ❌ */
:is(.foo > .bar) {}

/* ✅ */
.foo > .bar {}
```

## Limitations

Only style-rule selectors are checked. At-rule preludes and stylesheets containing `@namespace` are ignored. `:where()` is never removed.

Wrappers are kept for multiple, invalid, or unknown arguments; pseudo-elements; `&`; namespace-qualified selectors; attribute modifiers; page-only pseudo-classes; and type selectors that would require reordering. Functional arguments must be selectors or nth formulas without `of`; wrappers containing `:has()`, `:lang()`, or `:dir()` are also kept.

Wrappers containing comments are reported without a fix. Escapes are preserved, with a terminating space added when needed.

## Browser support

Fixes assume your target browsers support the inner selector. Removing a forgiving `:is()` wrapper around an unsupported selector can invalidate a surrounding selector list. Disable the rule for intentional browser fallbacks:

```css
/* eslint-disable-next-line cssicorn/no-useless-is */
.fallback, :is(:focus-visible) {}
```
