# no-unknown-type-selectors

📝 Disallow unknown type selectors.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports type selectors that are not known element names, which catches likely typos and a missing `.` before a class name. It does not check the document's markup or whether an element exists.

The known names are:

- HTML element names, including obsolete elements and elements that browsers ship before they are in the HTML standard, like `geolocation`.
- SVG element names.
- MathML Core and legacy MathML presentation element names. MathML Content Markup names, such as `card` and `list`, are not known, because browsers do not render them.

There is no autofix because the intended element name is unknown.

HTML names are ASCII case-insensitive. SVG and MathML names are case-sensitive, including the `svg` and `math` root elements.

## Examples

```css
/* ❌ */
buton {}

/* ✅ */
button {}
```

```css
/* ❌ */
foreignobject {}

/* ✅ */
foreignObject {}
```

```css
/* ❌ */
card {}

/* ✅ */
.card {}
```

Valid custom element names, such as `my-widget`, are allowed by default. Custom elements are HTML elements, so their names are ASCII case-insensitive and `MY-WIDGET` is also allowed.

Browser hacks such as `_:-ms-fullscreen, :root .x {}` are reported (`_`). Add `_` to `allow` to permit them.

The rule checks parsed selector arguments and framework forms such as Vue's `:deep()` and `:slotted()`.

## Options

### checkCustomElements

Type: `boolean`\
Default: `false`

Report custom element names unless they match an entry in `allow`. This does not check whether a custom element is registered.

```js
{
	checkCustomElements: true,
	allow: [
		'my-widget',
	],
}
```

### allow

Type: `(string | RegExp)[]`\
Default: `[]`

Additional local element names to allow. Namespace prefixes are ignored, and CSS escapes are decoded before matching. Strings match exactly and case-sensitively, and strings such as `'/^app-/'` are literal names, not patterns. Regular expressions match using their own flags, so use anchors to match the whole name.

```js
{
	checkCustomElements: true,
	allow: [
		'widget',
		/^app-/,
		/^legacy$/i,
	],
}
```

With this configuration, `widget`, `app|widget`, and `APP|app-button` are allowed, and `my-button` is reported.

When using ESLint's `--cache`, run ESLint once without it after changing a regular expression's pattern or flags in `allow`, because the cache does not distinguish regular expressions in rule options.

## Limitations

- Opaque arguments, including `::cue()` and `::cue-region()`, are not checked.
- Keyframe selectors and named `@page` selectors are ignored.
- Namespace prefixes do not determine which element catalog is used. For stylesheets targeting arbitrary XML vocabularies or nonstandard markup, add their element names to `allow` or disable the rule.
