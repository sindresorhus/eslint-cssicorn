# no-useless-is

📝 Disallow unnecessary `:is()` wrappers.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The `:is()` pseudo-class groups selectors without adding its own specificity. When it contains a single selector, the wrapper is often unnecessary.

This rule removes single-selector `:is()` wrappers when the argument can be inlined without changing selector matching or specificity. It does not reorder selectors to make them valid.

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

```css
/* ❌ */
:is(div).active {}

/* ✅ */
div.active {}
```

A complex selector can be inlined when the wrapper is the entire selector of a style rule with no ancestor style rule or `@scope`. This also applies inside grouping at-rules such as `@media`.

```css
/* ❌ */
:is(.foo > .bar) {}

/* ✅ */
.foo > .bar {}
```

Escapes are preserved. Autofixes add a terminating space after a trailing hex escape so that surrounding whitespace keeps its meaning. In this example, the first space terminates the escape and the second remains a descendant combinator.

```css
/* ❌ */
:is(.foo\61) a {}

/* ✅ */
.foo\61  a {}
```

## Intentional exclusions

The rule preserves wrappers with multiple arguments, invalid or unknown arguments, pseudo-elements, nesting selectors (`&`), namespace-qualified selectors, attribute modifiers, page-only pseudo-classes, or type selectors that cannot be inlined in their current position. It also preserves wrappers containing `:has()`, whose validity and shadow host matching depend on surrounding selectors.

```css
/* ✅ */
:is(.foo, .bar) {}
.active:is(div) {}
:is(:unknown) {}
:is(::before) {}
.foo { :is(&) {} }
:host:is(:has(.child)) {}
```

For supported functional pseudo-classes, arguments must be selectors or plain nth formulas. Other arguments, such as those of `:lang()`, `:dir()`, and nth formulas with an `of` clause, are left wrapped. The parser accepts some invalid forms of these arguments, so this conservative boundary prevents autofixes from exposing invalid selectors to a surrounding selector list.

```css
/* ✅ */
:is(:lang(en)) {}
:is(:nth-child(2n of .foo)) {}
:is([data-state="open" i]) {}
```

Complex arguments remain wrapped inside nested rules, `@scope`, other pseudo-class arguments, and selectors with surrounding selectors because inlining can change their anchoring or matching.

```css
/* ✅ */
.foo:is(.bar > .baz) {}
.foo:has(:is(.bar > .baz)) {}
.foo { :is(.bar > .baz) {} }
@scope (.root) { :is(.bar > .baz) {} }
```

Only style-rule selector preludes are checked. Selectors in at-rule preludes, such as `@supports selector()` and `@scope`, are left alone. Stylesheets containing `@namespace` are skipped because namespace defaults can behave differently inside and outside `:is()`.

The rule never removes `:where()`, whose zero specificity is intentional. Wrappers containing comments are reported without an autofix to preserve the comments.

## Browser support

Autofixes assume the standard selectors used by your project are supported in your target browsers. Since `:is()` uses a forgiving selector list, removing it around a selector unsupported by a browser can invalidate a surrounding selector list. Disable this rule for intentional wrappers that protect browser fallbacks:

```css
/* eslint-disable-next-line cssicorn/no-useless-is */
.fallback, :is(:focus-visible) {}
```
