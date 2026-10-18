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

Type: `string[]`

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

- Compare the complete fallback after the first comma, including lists and functions. Empty fallbacks participate; references without fallbacks are ignored.
- Ignore comments, whitespace, string quote styles, and equivalent identifier or string escapes. Preserve token boundaries and case-sensitive contents. Ordinary function names and dimension units are case-insensitive; unquoted URLs retain their source spelling.
- Recognize safe integer-valued numeric spellings such as `01px` and `+1.0px`. Preserve integer-token distinctions (`1` versus `1.0`) and signed zeros.
- Recognize common color equivalents and case-insensitive keywords only when both fallbacks are complete declaration values and their consuming grammars prove the comparison is valid. Custom identifiers remain case-sensitive. Partial values, custom-property declarations, and unknown grammars retain token comparison. Color comparison does not round away alpha differences.
- Ignore fallbacks containing substitutions such as `var()`, `env()`, `attr()`, conditional or custom functions, or `random()`. Eligible nested `var()` references are checked independently.
- Ignore query expressions in `@supports`, `@import` conditions, and container style queries. Declarations inside their style blocks are still checked.

## Limitations

The rule does not compare separate CSS files or extracted blocks, resolve custom-property declarations or `@property` registrations, evaluate functions such as `calc()`, or convert units. Matching fallbacks do not guarantee identical computed styles, since values such as `1em` depend on context.

## Related rules

- [prefer-existing-custom-properties](prefer-existing-custom-properties.md)
- [no-self-referencing-custom-properties](no-self-referencing-custom-properties.md)
