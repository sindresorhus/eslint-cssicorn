# no-useless-is

📝 Disallow unnecessary `:is()` wrappers.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports `:is()` around a single selector when removing it keeps the same matching and specificity, and the autofix removes it.

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

A complex argument is unwrapped only when `:is()` is the entire selector of a style rule outside nested rules and `@scope`, but grouping at-rules such as `@media` are allowed.

```css
/* ❌ */
:is(.foo > .bar) {}

/* ✅ */
.foo > .bar {}
```

## Browser support

The fix assumes that your target browsers support the inner selector, because removing a forgiving `:is()` around an unsupported selector can invalidate the surrounding selector list. Disable the rule for intentional fallbacks:

```css
/* ✅ */
/* eslint-disable-next-line cssicorn/no-useless-is -- Keep the forgiving selector list for browsers without `:focus-visible`. */
.fallback, :is(:focus-visible) {}
```

## Limitations

Only style-rule selectors are checked, and stylesheets with `@namespace` are ignored. `:where()` is never removed.

The wrapper is kept when the argument contains:

- Multiple, invalid, or unknown selectors.
- Pseudo-elements, `&`, or namespace-qualified selectors.
- Attribute selectors with modifiers, such as `[type="a" i]`.
- Page-only pseudo-classes, such as `:first`.
- A type selector that would need to move to the start of the compound selector.
- `:has()`.
- A functional pseudo-class whose argument is not a selector or an nth formula without `of`, such as `:lang()` or `:dir()`.

Wrappers containing comments are reported without a fix. Escapes are preserved, with a terminating space added when needed.
