# prefer-existing-custom-properties

📝 Prefer existing custom properties over matching literal values.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Suggest a configured custom property when a declaration repeats its literal value. This helps prevent token drift across colors, spacing, radii, shadows, and timing values. Each report offers one editor suggestion; the rule never autofixes, because choosing a token can change theme, inheritance, or registration behavior.

The rule checks complete declaration values and individual hexadecimal colors, dimensions, percentages, and complete functions within compound values. Complete matches take precedence over component matches. If multiple configured tokens match a value, the rule skips that value and its components rather than choosing an arbitrary token.

## Options

### `customProperties`

Type: `object`\
Default: `{}`

Map eligible custom-property names to their literal CSS values. Names are decoded and case-sensitive: use `'--brand-color'`, not a CSS-escaped spelling. Names containing spaces or other special characters are escaped in suggestions.

```js
'cssicorn/prefer-existing-custom-properties': ['warn', {
	customProperties: {
		'--brand-color': '#6750a4',
		'--space-small': '8px',
		'--radius-medium': '12px',
		'--duration-fast': '200ms',
		'--shadow-card': '0 2px 8px #0003',
	},
}],
```

The default catalog is empty, so configuring eligible tokens is necessary for the rule to report. Tokens may be defined in another stylesheet. The catalog asserts that each token exists and is appropriate where used; the rule does not read stylesheets, resolve imports or aliases, or analyze scope and the cascade.

Keep the catalog curated. For example, if both `'--space-small': '8px'` and `'--radius-small': '8px'` are configured, neither `margin: 8px` nor `border-radius: 8px` is reported. The declaration's property does not resolve ambiguity between tokens with equal values, including values the rule normalizes as equivalent.

If you already generate tokens, consider emitting this eligible name-to-value map alongside the custom-property stylesheet. Use the resolved literal CSS values, so the catalog and stylesheet share a source of truth.

Empty values, unbalanced delimiters, unterminated comments, strings, or URLs, and malformed value syntax cause a configuration error. Unsupported values, such as strings, URLs, CSS-wide keywords, `currentcolor`, or substitutions, are not indexed. Values are parsed as generic CSS values, without validating them against a particular property's grammar.

## Examples

```css
/* ❌ */
a {
	background: #6750a4;
}

/* ✅ */
a {
	background: var(--brand-color);
}
```

```css
/* ❌ */
a {
	border: 8px solid #6750a4;
}

/* ✅ */
a {
	border: var(--space-small) solid var(--brand-color);
}
```

```css
/* ❌ */
a {
	box-shadow: 0 2px 8px #0003;
	transition-duration: .2s;
}

/* ✅ */
a {
	box-shadow: var(--shadow-card);
	transition-duration: var(--duration-fast);
}
```

## Matching and limitations

- Formatting and CSS escapes are normalized. Function names and units are compared ASCII case-insensitively; identifier values retain their case.
- Finite numeric spellings are normalized, but bare numbers retain the integer-versus-number spelling distinction. For example, `steps(2)` does not match `steps(2.0)`.
- Milliseconds and seconds are compared in seconds. Other units remain distinct, including unitless zero versus dimensional zero.
- Three-, four-, six-, and eight-digit hexadecimal colors match equivalent simple absolute `rgb()` and `rgba()` colors, including numeric and percentage channels. Alpha is compared exactly: `#0008` does not match `rgba(0, 0, 0, .5)`.
- Other values use structural matching. Named colors, HSL, and other color spaces are not converted to RGB; calculations are not evaluated. Unsupported RGB forms, such as relative colors, missing channels, calculations, and out-of-range channels, can match structurally but are not converted.
- Numeric equivalence is best effort, using exact floating-point comparisons without rounding or tolerances. Some mathematically equivalent spellings may not match.
- Bare numbers and identifiers are checked only as complete values. The rule does not match arbitrary sequences inside shorthands. Color functions are atomic, so their channels and mixing percentages are not treated as independent tokens.
- Custom-property declarations, at-rule descriptors and conditions, CSS Modules `:export` and `:import()` declarations, strings, and URLs are ignored. Substitution functions, random values, and element references are left unchanged; independent literal siblings can still be checked.
- A matched range containing a comment is skipped. Comments outside the range, declaration formatting, and `!important` are preserved.

> [!NOTE]
> Matching a token's current value does not establish that it has the intended meaning. Review token availability and theme, inheritance, and registration behavior before accepting a suggestion.
