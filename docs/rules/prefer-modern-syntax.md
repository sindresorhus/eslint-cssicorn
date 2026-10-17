# prefer-modern-syntax

📝 Prefer modern CSS color and pseudo-element syntax.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports legacy color and pseudo-element syntax, and the autofix converts it to the modern syntax:

- [CSS Color 4](https://drafts.csswg.org/css-color/#color-functions) uses space-separated color components with an optional slash-separated alpha, and makes `rgba()` and `hsla()` aliases of `rgb()` and `hsl()`. The rule prefers `rgb()` and `hsl()`, modern separators, and percentage notation for direct numeric alpha values.
- [Selectors Level 4](https://drafts.csswg.org/selectors/#pseudo-element-syntax) uses two colons for pseudo-elements. The rule changes the four legacy single-colon forms: `:before`, `:after`, `:first-line`, and `:first-letter`.

## Examples

```css
/* ❌ */
a:before {
	color: rgba(0, 0, 0, .5);
	background: linear-gradient(hsla(30, 40%, 50%, .25), white);
	--brand: rgb(20, 40, 60);
}

/* ✅ */
a::before {
	color: rgb(0 0 0 / 50%);
	background: linear-gradient(hsl(30 40% 50% / 25%), white);
	--brand: rgb(20 40 60);
}
```

The percentage alpha preference also applies to direct numeric alpha in `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, and `color()`. It is a style preference, and numeric alpha is also valid in modern syntax. Values in `opacity` and computed alpha expressions such as `calc()` or `var()` are unchanged.

Parsed values are checked, including custom properties and declarations inside `@supports`. Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.

## Substitution functions

Legacy comma-separated arguments that contain substitution functions (`attr()`, `env()`, `first-valid()`, `ident()`, `if()`, `inherit()`, `random-item()`, `var()`, and custom functions) are not reported, and their `rgba()` and `hsla()` names are kept. A substitution can hold several comma-separated components, so the modern form may not be possible, and renaming alone leaves legacy syntax.

```css
/* ✅ */
a {
	/* `--rgb` holds `13, 110, 253`. */
	color: rgba(var(--rgb), var(--opacity, 1));
}
```

Modern space-separated arguments with substitutions are still checked:

```css
/* ❌ */
a {
	color: rgba(var(--rgb) / .5);
}

/* ✅ */
a {
	color: rgb(var(--rgb) / 50%);
}
```

## Fallback colors

`var()` fallback colors are checked only in custom properties, because elsewhere the parser leaves them unparsed.

```css
/* ✅ */
a {
	/* Fallback color is skipped. */
	color: var(--brand, rgba(0, 0, 0, .5));
}
```

```css
/* ❌ */
a {
	/* Fallback color is checked and can be fixed. */
	--brand: var(--fallback, rgba(0, 0, 0, .5));
}

/* ✅ */
a {
	/* Fallback color is checked and can be fixed. */
	--brand: var(--fallback, rgb(0 0 0 / 50%));
}
```

## Limitations

- Strings and URLs are not inspected.
- These are reported without an autofix: color functions with comments, and ambiguous or invalid legacy arguments, including math color channels, to preserve validity.
- Scientific-notation alpha is reported without conversion, but other parts of the function may still be fixed.
- When the parser would read a nested rule like `a::after` as a declaration, the autofix writes `& a::after`, which matches the same elements. When that is not possible, like in `@scope` or when the first selector has `&`, the pseudo-element is reported without an autofix.
