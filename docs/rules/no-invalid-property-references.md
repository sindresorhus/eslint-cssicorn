# no-invalid-property-references

📝 Disallow invalid property references in transitions and will-change.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Property names used as values can contain typos that browsers silently ignore. This rule validates literal property references in `transition`, `transition-property`, and `will-change` against the property catalog provided by `@eslint/css`.

It complements [`css/no-invalid-properties`](https://github.com/eslint/css/blob/main/docs/rules/no-invalid-properties.md) and Stylelint's [`property-no-unknown`](https://stylelint.io/user-guide/rules/property-no-unknown/) and [`declaration-property-value-no-unknown`](https://stylelint.io/user-guide/rules/declaration-property-value-no-unknown/): those rules validate declaration names or value grammar, but unknown property references are grammatically valid identifiers.

## Examples

```css
/* ❌ */
a { transition: opactiy 200ms ease; }

/* ✅ */
a { transition: opacity 200ms ease; }
```

```css
/* ❌ */
a { transition-property: opacity, transfrom; }

/* ✅ */
a { transition-property: opacity, transform; }
```

```css
/* ❌ */
a { will-change: transfrom; }

/* ✅ */
a { will-change: transform; }
```

The rule also reports `none`, `all`, and `will-change` in `will-change`, where they are [forbidden](https://www.w3.org/TR/css-will-change-1/#will-change). The reserved identifier `default` is forbidden in all three declarations. CSS-wide keywords, such as `inherit`, are allowed only as the whole value.

```css
/* ❌ */
a { will-change: none; }

/* ✅ */
a { will-change: auto; }
```

```css
/* ❌ */
a { transition-property: opacity, inherit; }

/* ✅ */
a { transition-property: inherit; }
```

## Recognized keywords

The following identifiers are exempt from property-name validation in their respective declarations:

- `transition`: `all`, `none`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `linear`, `step-start`, `step-end`, `normal`, `allow-discrete`.
- `transition-property`: `all`, `none`.
- `will-change`: `auto`, `scroll-position`, `contents`.

Standard property names are matched ASCII case-insensitively, including escaped spellings. Shorthand names and known properties that cannot be animated are allowed; the rule does not assess whether a transition or optimization will take effect.

## Limitations

- Ignores custom (`--progress`) and vendor-prefixed references (`-webkit-transform`). Vendor-prefixed declarations are checked.
- Checks only top-level identifiers. Function arguments, strings, URLs, and build-tool values are not resolved.
- Skips support queries, descriptor blocks known to the lexer, CSS Modules `:export`/`:import()` declarations, and unparsed values.
- Leaves value grammar to `css/no-invalid-properties`.
- Always exempts transition shorthand keywords, including repeated ones like `transition: ease ease 1s`.

No autofix or suggestions: correcting a reference requires knowing the author's intent.

## Additional properties

To recognize an experimental or nonstandard property, add it through [`languageOptions.customSyntax`](https://github.com/eslint/css#configuring-custom-syntax) rather than configuring a separate rule-specific allowlist:

```js
{
	languageOptions: {
		customSyntax: {
			properties: {
				'future-property': '<length>',
			},
		},
	},
}
```
