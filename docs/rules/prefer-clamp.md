# prefer-clamp

📝 Prefer `clamp()` over nested `min()` and `max()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[CSS defines](https://drafts.csswg.org/css-values-4/#funcdef-clamp) `clamp(MIN, VALUE, MAX)` as `max(MIN, min(VALUE, MAX))`. Using `clamp()` makes the bounds easier to read.

## Examples

```css
/* ❌ */
a { width: max(10px, min(5vw, 100px)); }

/* ✅ */
a { width: clamp(10px, 5vw, 100px); }
```

The outer arguments may appear in either order. Inner arguments retain their source order: `max(10px, min(100px, 5vw))` becomes `clamp(10px, 100px, 5vw)`.

## Reverse nesting

`min(MAX, max(MIN, VALUE))` is converted only when the bounds are finite literals with matching units, or both unitless, and `MIN ≤ MAX`. The first qualifying inner argument becomes the minimum.

```css
/* ❌ */
a { width: min(100px, max(10px, 5vw)); }

/* ✅ */
a { width: clamp(10px, 5vw, 100px); }
```

Conflicting, calculated, mixed-unit, and percentage bounds are ignored. Unlike `clamp()`, reverse nesting lets the maximum win when bounds conflict. Percentages can resolve against a negative reference size.

## Limitations

- Supports `calc()`-wrapped substitutions and `random()` only when argument order is preserved. Other substitutions are ignored.
- Expressions requiring argument reordering are not autofixed if they contain comments.
