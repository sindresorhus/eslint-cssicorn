# consistent-custom-property-fallbacks

📝 Enforce consistent fallbacks for configured custom properties.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Report competing fallbacks for configured shared custom properties within one CSS file or extracted CSS block. Configure `customProperties` to opt tokens into this contract; the default empty list reports nothing.

Components can agree while a theme token exists, then diverge when it is missing. Configure only tokens whose consumers should share a default. The first eligible fallback is the reference for later uses, but source order does not establish which value is correct. There is no autofix because choosing a fallback can change rendered styles.

## Examples

With `customProperties` set to `['--brand']`:

```css
/* ❌ */
.button { color: var(--brand, purple); }
.link { color: var(--brand, blue); }

/* ✅ */
.button { color: var(--brand, purple); }
.link { color: var(--brand, purple); }
```

Whole-value colors and keywords recognize equivalents when the consuming properties' grammars prove their meaning:

```css
/* ✅ */
a {
	color: var(--brand, red);
	background-color: var(--brand, #f00);
	border-color: var(--brand, rgb(255 0 0));
}
```

Query expressions do not establish fallbacks for styles:

```css
/* ✅ */
@supports (color: var(--brand, red)) {
	.button { color: var(--brand, blue); }
}
```

## Options

### customProperties

Type: `string[]`\
Default: `[]`

Exact shared custom-property names to check. Names are case-sensitive, and escaped references are decoded before matching.

```js
{
	customProperties: [
		'--brand',
		'--shared',
	],
}
```

## Comparison

- Compare complete, explicit fallbacks, including empty ones. Ignore whitespace, comments, quote styles, and equivalent identifier or string escapes.
- Normalize ordinary function and unit casing and safe integer spellings, preserving token boundaries, case-sensitive contents, `1` versus `1.0`, and signed zero. Color and keyword equivalence requires complete declaration values whose meanings are proven by property grammars.
- Skip query expressions and fallbacks containing substitutions or randomness. Check eligible nested `var()` references and declarations inside query blocks.

## Limitations

The rule does not compare separate CSS files or extracted blocks, resolve custom-property declarations or `@property` registrations, evaluate functions such as `calc()`, or convert units. Matching fallbacks do not guarantee identical computed styles, since values such as `1em` depend on context.
