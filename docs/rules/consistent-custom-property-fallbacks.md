# consistent-custom-property-fallbacks

📝 Enforce consistent fallbacks for configured custom properties.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Report competing fallbacks for explicitly configured shared custom properties within the same file. Components can agree while a theme token exists, then diverge when it is missing. Configure only tokens whose consumers should share a default; component-specific fallbacks remain legitimate.

The first eligible fallback is the reference for later uses. Its location appears in each diagnostic, but source order does not establish which value is correct. There is no autofix because choosing a fallback can change rendered styles.

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

Whole-value colors in known color positions recognize common equivalent spellings:

```css
/* ✅ */
a {
	color: var(--brand, red);
	background-color: var(--brand, #f00);
	border-color: var(--brand, rgb(255 0 0));
}
```

## Options

### customProperties

Type: `string[]`

Default: `[]`

Exact shared custom-property names to check. Names are case-sensitive, and escaped references are decoded before matching. With the default empty list, the rule reports nothing, including when enabled through the recommended config.

```js
{
	customProperties: [
		'--brand',
		'--shared',
	],
}
```

## Comparison

The rule compares the complete fallback after the first comma, including lists and functions such as `rgb()` and `calc()`. Comments and whitespace do not affect comparison, but token boundaries are preserved. Identifier and string escapes are decoded, string quote styles are ignored, and ordinary function names and dimension units are compared case-insensitively. Unquoted URLs retain their source spelling, including the `url` prefix. Other identifiers and string contents retain their case.

Safe integer-valued numeric spellings such as `01px` and `+1.0px` agree. Integer and non-integer number tokens remain distinct, so `1` and `1.0` differ. Signed zeros remain distinct too.

Common named, hexadecimal, and RGB colors are compared using their color values only when both references are complete declaration values and each consuming property's grammar identifies a color. Other supported literal color functions use conservative structural comparison. Partial declaration values, custom-property declarations, and unknown property grammars retain token comparison.

An explicit empty fallback participates in comparison. A reference without a fallback is ignored. Fallbacks containing substitution functions, including `var()`, `env()`, `attr()`, custom functions, and conditional substitutions, or `random()`, are ignored. Nested `var()` references are still checked independently when their own fallbacks are eligible.

## Limitations

The rule compares uses within one file. It does not resolve custom-property declarations, inheritance, the cascade, or `@property` registrations. It does not evaluate functions such as `calc()`, convert units, or recognize every equivalent CSS spelling. Matching fallbacks do not guarantee identical computed styles, since values such as `1em` depend on context.

## Related rules

- [prefer-existing-custom-properties](prefer-existing-custom-properties.md)
- [no-self-referencing-custom-properties](no-self-referencing-custom-properties.md)
