# prefer-clamp

📝 Prefer `clamp()` over nested `min()` and `max()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[CSS defines](https://drafts.csswg.org/css-values-4/#funcdef-clamp) `clamp(MIN, VALUE, MAX)` as `max(MIN, min(VALUE, MAX))`. This rule reports `max(MIN, min(VALUE, MAX))` and the [reverse nesting](#reverse-nesting) `min(MAX, max(MIN, VALUE))`, and the autofix changes them to the easier to read `clamp()`.

## Examples

```css
/* ❌ */
a { width: max(10px, min(5vw, 100px)); }

/* ✅ */
a { width: clamp(10px, 5vw, 100px); }
```

The outer arguments may appear in either order. Inner arguments keep their source order, so `max(10px, min(100px, 5vw))` becomes `clamp(10px, 100px, 5vw)`.

## Reverse nesting

The rule converts `min(MAX, max(MIN, VALUE))` only when both bounds are finite literals with matching units (or both unitless), optionally wrapped in `calc()` or parentheses, and `MIN ≤ MAX`. The first qualifying inner argument becomes the minimum.

```css
/* ❌ */
a { width: min(100px, max(10px, 5vw)); }

/* ✅ */
a { width: clamp(10px, 5vw, 100px); }
```

Conflicting bounds are ignored, because reverse nesting lets the maximum win while `clamp()` lets the minimum win. So are bounds that the rule cannot compare, such as arithmetic, mixed units, or percentages, which can resolve against a negative reference size.

## Limitations

- An argument that is a substitution function, such as `max(var(--min), min(5vw, 100px))`, is ignored.
- If an argument contains a nested substitution function, such as `calc(var(--min) * 2)`, or `random()`, the rule converts the expression only when the argument order stays the same, as in `max(MIN, min(VALUE, MAX))`.
- If a fix would reorder arguments and the expression contains a comment, the rule reports it without a fix.
