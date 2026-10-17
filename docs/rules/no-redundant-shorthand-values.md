# no-redundant-shorthand-values

📝 Disallow redundant values in CSS shorthand properties.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports repeated shorthand values that can be omitted without changing the result, and the autofix removes them.

## Examples

```css
/* ❌ */
.button {
	margin: 1px 1px 1px 1px;
	border-radius: 4px 4px 4px 4px;
	place-items: center center;
}

/* ✅ */
.button {
	margin: 1px;
	border-radius: 4px;
	place-items: center;
}
```

These are not reported:

```css
/* ✅ */
.button {
	margin: 1px 2px 3px 2px;
	border-radius: 4px / 4px;
	padding: var(--padding) var(--padding);
}
```

## Supported properties

- Physical edges: `margin`, `padding`, `border-color`, `border-style`, `border-width`, `scroll-margin`, `scroll-padding`, and `inset`.
- Logical edges: the `-block` and `-inline` variants of those properties.
- `gap`, `grid-gap`, `overflow`, `overscroll-behavior`, and `border-radius`.
- `place-content`, `place-items`, and `place-self`.

Four-value edge declarations are not reduced to three, because naming every edge can be easier to read, but are still reduced to one or two values. This exception does not apply to `border-radius`.

Slash-separated `border-radius` values are shortened independently without removing the slash.

`-webkit-border-radius` without a slash is never shortened to two values, because WebKit and Blink parse `-webkit-border-radius: 1px 2px` as `1px / 2px`.

## Limitations

- Declarations that cannot be validated are ignored.
- Declarations with functions that may not repeat the same value are ignored: `random()` and the substitution functions (`attr()`, `env()`, `first-valid()`, `ident()`, `if()`, `inherit()`, `random-item()`, `var()`, and custom functions such as `--spacing()`).
- Other functions are compared without evaluation, and numeric spellings such as `1px` and `1.0px` are kept distinct.
- Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.
- The autofix is skipped if it would remove a comment.
