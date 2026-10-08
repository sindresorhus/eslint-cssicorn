# require-selector-scope

📝 Require a positive scoping boundary for every selector.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use this opt-in rule for manually scoped component CSS. Every selector branch needs one of these boundaries:

- A direct class or ID anywhere in the selector.
- `:host`, `:host()`, or `:host-context()`.
- `:is()` or `:where()` with every alternative scoped.
- `:nth-child()` or `:nth-last-child()` with every `of` alternative scoped.
- `::slotted()` with a scoped compound argument.
- An enclosing [`@scope`](https://www.w3.org/TR/css-cascade-6/#scoped-styles), even without an explicit root.
- A positive explicit or implicit nesting reference to a parent whose every branch is scoped.

Classes and IDs inside `:not()` or `:has()` do not count; an outer anchor still does, as in `.card:is(button, a)`. Bare `:scope`, attributes, `*`, and element selectors do not count.

## Examples

Each comma-separated branch needs a boundary:

```css
/* ❌ */
.card, button {}

/* ✅ */
.card, .card button {}
```

Every alternative must be scoped:

```css
/* ❌ */
:is(.card, button) {}

/* ✅ */
:is(.card, #panel) button {}
```

`:not()` and `:has()` cannot supply a boundary:

```css
/* ❌ */
button:has(.card) {}

/* ✅ */
.card button:has(.icon) {}
```

Native scope permits element selectors:

```css
/* ❌ */
button {}

/* ✅ */
@scope (.card) {
	button {}
}
```

Implicit nesting inherits the parent's boundary:

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

Under [native nesting semantics](https://drafts.csswg.org/css-nesting/#nesting), explicit `&` suppresses implicit parent anchoring unless a selector starts with a combinator. Thus `.card { :not(&) {} }` fails, while `.card { > :not(&) {} }` passes.

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

Every `of` alternative needs a boundary:

```css
/* ❌ */
:nth-child(2n of .card, button) {}

/* ✅ */
:nth-child(2n of .card, #panel) {}
```

Slotted arguments can supply a boundary:

```css
/* ❌ */
::slotted(*) {}

/* ✅ */
::slotted(.card) {}
```

## Usage

Exempt global and reset files. Leave the rule disabled for styles already scoped by [Vue](https://vuejs.org/api/sfc-css-features.html#scoped-css), [Svelte](https://svelte.dev/docs/svelte/scoped-styles), or [Astro](https://docs.astro.build/en/guides/styling/#scoped-styles).

Disable `prefer-nesting` because its autofix can introduce unanchored wrappers: `body :is(.card, .other) { color: red; }` becomes `body { .card, .other { color: red; } }`, whose `body` branch fails this rule.

## Limitations

A boundary does not guarantee containment or component ownership: `.card + button` and `@scope (:root)` pass. Use native scope for DOM containment. No autofix is provided because the intended boundary is unknown.

Framework, compiler, imported, and runtime Shadow DOM scoping are not inferred. Custom at-rules, other pseudo-selector arguments, and logical equivalences such as `:not(:not(.card))` do not establish boundaries.

Keyframes and unparsed preludes or blocks are skipped. Unanchored branches are reported, including nested selectors without their own boundary under partially unscoped parents. CSS keywords are matched ASCII case-insensitively, including escaped names.

The parser rejects style rules directly inside `@container`, `@scope`, `@starting-style`, or `@supports` blocks nested in a style rule; declaration-only blocks work.
