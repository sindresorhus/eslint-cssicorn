# no-invalid-property-references

📝 Disallow invalid property references in transitions and will-change.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Property names used as values can contain typos that browsers silently ignore. This rule validates literal property references in `transition`, `transition-property`, and `will-change` against the property catalog of `@eslint/css`.

It complements [`css/no-invalid-properties`](https://github.com/eslint/css/blob/main/docs/rules/no-invalid-properties.md) and Stylelint's [`property-no-unknown`](https://stylelint.io/user-guide/rules/property-no-unknown/) and [`declaration-property-value-no-unknown`](https://stylelint.io/user-guide/rules/declaration-property-value-no-unknown/): those rules validate declaration names or value grammar, and an unknown property reference is a grammatically valid identifier.

There is no autofix because correcting a reference requires knowing the author's intent.

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

These identifiers are exempt from property-name validation:

- `transition`: `all`, `none`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `linear`, `step-start`, `step-end`, `normal`, `allow-discrete`.
- `transition-property`: `all`, `none`.
- `will-change`: `auto`, `scroll-position`, `contents`.

The `transition` keywords are exempt even when repeated, like `transition: ease ease 1s`.

Property names are matched ASCII case-insensitively, also when escaped. Shorthands and known non-animatable properties are allowed, because the rule does not check whether a transition or optimization takes effect.

## Additional properties

To recognize an experimental or nonstandard property, add it through [`languageOptions.customSyntax`](https://github.com/eslint/css#configuring-custom-syntax) instead of a rule option:

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

## Limitations

- Custom references (`--progress`) and vendor-prefixed references (`-webkit-transform`) are ignored. Vendor-prefixed declarations, such as `-webkit-transition`, are checked.
- Only top-level identifiers are checked. Function arguments, strings, URLs, and build-tool values are not resolved.
- Declarations in support queries, descriptor blocks known to the lexer, CSS Modules `:export` and `:import()` blocks, and unparsed values are ignored.
