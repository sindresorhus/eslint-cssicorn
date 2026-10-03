# prefer-clamp

📝 Prefer `clamp()` over nested `min()` and `max()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[CSS comparison functions](https://drafts.csswg.org/css-values-4/#funcdef-clamp) define `clamp(MIN, VALUE, MAX)` as exactly equivalent to `max(MIN, min(VALUE, MAX))`. Using `clamp()` makes the minimum, preferred value, and maximum easier to read.

## Examples

```css
/* ❌ */
a {
	width: max(10px, min(5vw, 100px));
}

/* ✅ */
a {
	width: clamp(10px, 5vw, 100px);
}
```

The outer `max()` arguments may appear in either order. The inner `min()` arguments retain their source order as the preferred value and maximum; either order produces an equivalent expression. Each function must have exactly two nonempty arguments, and the inner function must be an entire outer argument.

```css
/* ❌ */
a {
	width: max(min(5vw + 1px, 100px), 10px);
}

/* ✅ */
a {
	width: clamp(10px, 5vw + 1px, 100px);
}
```

## Reverse nesting

`min(MAX, max(MIN, VALUE))` gives the maximum precedence when the bounds conflict, while `clamp()` gives the minimum precedence. The rule converts this form only when the minimum and maximum are finite literal numbers or dimensions with the same unit, and the minimum is no greater than the maximum. It tries the first inner argument as the minimum, then the second. Function and unit names are compared case-insensitively and with CSS escapes decoded.

```css
/* ❌ */
a {
	width: min(100px, max(10px, 5vw));
}

/* ✅ */
a {
	width: clamp(10px, 5vw, 100px);
}
```

Conflicting, calculated, mixed-unit, and percentage bounds are ignored. Percentages can resolve against a negative reference size, so their apparent order does not prove their resolved order. Signed-zero bounds are ignored when they would give the minimum precedence over a smaller negative-zero maximum.

```css
/* ✅ */
a {
	width: min(50px, max(100px, 5vw));
	height: min(100px, max(1rem, 5vh));
	background-position: min(100%, max(10%, 5px));
}
```

## Autofix and limitations

- Checks declaration values, including custom properties, arithmetic expressions, and nested functions. At-rule conditions such as `@supports`, strings, URLs, and CSS Modules `:export` and `:import()` declarations are ignored.
- Candidates containing substitution functions such as `var()`, `env()`, `attr()`, or custom functions are ignored, even inside `calc()`. Substitutions can introduce additional arguments. Candidates containing `random()` are also ignored because moving it can change its result.
- Expressions with `none` in a bound position are ignored, since `none` is allowed in `clamp()` bounds but not in `min()` or `max()`.
- The usual `max(MIN, min(VALUE, MAX))` form is fixed by changing the outer function name and removing the inner wrapper. Comments, escapes in arguments, indentation, and line endings are preserved.
- Forms requiring argument reordering are reported without an autofix when they contain comments. Comment-free fixes retain the original argument text and line endings.
- Ambiguous forms with two opposite nested functions, such as `max(min(A, B), min(C, D))`, are ignored.
