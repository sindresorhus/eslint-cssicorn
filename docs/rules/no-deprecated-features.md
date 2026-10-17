# no-deprecated-features

📝 Disallow deprecated CSS features.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule disallows deprecated [properties](https://stylelint.io/user-guide/rules/property-no-deprecated/), [property value keywords](https://stylelint.io/user-guide/rules/declaration-property-value-keyword-no-deprecated/), [at-rules](https://stylelint.io/user-guide/rules/at-rule-no-deprecated/), [media types](https://stylelint.io/user-guide/rules/media-type-no-deprecated/), and [selectors](https://stylelint.io/user-guide/rules/selector-no-deprecated/), mirroring Stylelint 17.14.1. Selectors include type selectors, pseudo-classes, and pseudo-elements.

Declarations inside `@supports` are checked. SVG type selector names are matched case-sensitively. `-webkit-box-orient: vertical` is allowed, because line clamping needs it.

Deprecated features are handled in three ways:

- Safe aliases are autofixed: `word-wrap`, the legacy grid gap and page break properties, and `overflow: overlay`.
- `:matches()`, `text-orientation: sideways-right`, and other replacements within a declaration get a suggestion, which for a declaration is only given when the result parses. `:matches()` and `sideways-right` are not autofixed, because only Safari supports `:matches()` and only Safari does not support `sideways-right`, so replacing them changes the styles in some browsers.
- Features without a local equivalent, such as `::content` (migrate it to `::slotted()`), are only reported.

A deprecated property is neither fixed nor suggested when the same block already declares its replacement, such as `word-wrap` next to `overflow-wrap`, because that would duplicate it.

## Examples

```css
/* ❌ */
.title {
	word-wrap: break-word;
	overflow: overlay;
}

/* ✅ */
.title {
	overflow-wrap: break-word;
	overflow: auto;
}
```

The suggestion for `:matches()` replaces it with `:is()`:

```css
/* ❌ */
a:matches(.featured) {
	color: red;
}

/* ✅ */
a:is(.featured) {
	color: red;
}
```

Features without a local equivalent must be replaced by hand:

```css
/* ❌ */
@media tv {
	acronym {
		color: red;
	}
}

/* ✅ */
@media screen {
	abbr {
		color: red;
	}
}
```

## Options

### allow

Type: `string[]`\
Default: `[]`

Deprecated features to allow, written exactly as the error message shows them. Regular expressions are not supported.

The formats are:

- Property: `word-wrap`
- Property and value: `word-break: break-word`
- At-rule: `@viewport`
- Selector: `acronym`, `:matches`, or `::content`
- Media type: `@media tv`

```js
{
	allow: [
		'word-wrap',
		'@viewport',
	],
}
```

## Limitations

- Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.
- Media feature names, function names, units, and preprocessor syntax are ignored.
- Within functions, deprecated system colors are only checked inside recognized color functions.
