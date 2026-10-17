# require-selector-scope

📝 Require a positive scoping boundary for every selector.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This opt-in rule, for manually scoped component CSS, reports selector branches without one of these component boundaries:

- A direct class or ID anywhere in the selector.
- `:host`, `:host()`, or `:host-context()`.
- `:is()` or `:where()` with every alternative scoped.
- `:nth-child()` or `:nth-last-child()` with every `of` alternative scoped.
- `::slotted()` with a scoped compound argument.
- An enclosing [`@scope`](https://www.w3.org/TR/css-cascade-6/#scoped-styles), even without an explicit root.
- A positive explicit or implicit nesting reference to a parent whose every branch is scoped.

Classes and IDs inside `:not()` or `:has()` do not count, but an outer anchor does, as in `.card:is(button, a)`. Bare `:scope`, attributes, `*`, and element selectors do not count.

There is no autofix because the intended boundary is unknown.

## Examples

```css
/* ❌ */
.card, button {}

/* ✅ */
.card, .card button {}
```

```css
/* ❌ */
:is(.card, button) {}

/* ✅ */
:is(.card, #panel) button {}
```

```css
/* ❌ */
button:has(.card) {}

/* ✅ */
.card button:has(.icon) {}
```

```css
/* ❌ */
button {}

/* ✅ */
@scope (.card) {
	button {}
}
```

```css
/* ❌ */
body {
	button {}
}

/* ✅ */
.card {
	button {}
}
```

Under [native nesting semantics](https://drafts.csswg.org/css-nesting-1/#nesting), an explicit `&` suppresses implicit parent anchoring unless the selector starts with a combinator, so `.card { :not(&) {} }` fails, while `.card { > :not(&) {} }` passes.

```css
/* ❌ */
.card {
	:is(&, body) {}
}

/* ✅ */
.card {
	:is(&, .other-card) {}
}
```

```css
/* ❌ */
:nth-child(2n of .card, button) {}

/* ✅ */
:nth-child(2n of .card, #panel) {}
```

```css
/* ❌ */
::slotted(*) {}

/* ✅ */
::slotted(.card) {}
```

## Usage

Exempt global and reset files, and styles already scoped by [Vue](https://vuejs.org/api/sfc-css-features.html#scoped-css), [Svelte](https://svelte.dev/docs/svelte/scoped-styles), or [Astro](https://docs.astro.build/en/guides/styling/#scoped-styles).

Disable [`prefer-nesting`](./prefer-nesting.md), because its autofix can introduce unanchored wrappers: `body :is(.card, .other) { color: red; }` becomes `body { .card, .other { color: red; } }`, whose `body` branch fails this rule.

## Limitations

A boundary does not guarantee containment: `.card + button` and `@scope (:root)` pass. External scoping (frameworks, compilers, imports, or runtime Shadow DOM), custom at-rules, unlisted pseudo-functions, and double negation are not inferred.

Keyframes and unparsed CSS are skipped. The parser rejects style rules directly inside `@container`, `@scope`, `@starting-style`, or `@supports` blocks that are nested in a style rule, but such blocks with only declarations work.
