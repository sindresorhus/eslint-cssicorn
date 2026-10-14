# no-unknown-type-selectors

📝 Disallow unknown type selectors.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule checks type selectors against known HTML and SVG element names, including obsolete elements and elements that browsers ship before they are in the HTML standard, like `geolocation`, and MathML Core and legacy MathML presentation element names. MathML Content Markup names, such as `card` and `list`, are not known, because browsers do not render them. The rule catches likely typos and a missing `.` before a class name; it does not check the document's markup or whether an element exists.

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

The rule checks parsed selector arguments and framework forms such as Vue's `:deep()` and `:slotted()`. Opaque arguments, including `::cue()` and `::cue-region()`, are not checked. Keyframe selectors and named `@page` selectors are ignored.

## Options

### checkCustomElements

Type: `boolean`\
Default: `false`

Report custom element names unless they match an entry in `allow`. This does not check whether a custom element is registered.

```js
{
	checkCustomElements: true,
	allow: ['my-widget'],
}
```

### allow

Type: `(string | RegExp)[]`\
Default: `[]`

Additional local element names to allow. Namespace prefixes are ignored when matching. Strings match exactly and case-sensitively. Regular expressions match using their own flags; use anchors when you want to match the whole name. CSS escapes are decoded before matching.

Use actual regular expressions. Strings such as `'/^app-/'` are literal names, not patterns.

```js
{
	allow: ['widget', /^app-/, /^legacy$/i],
}
```

With this configuration, `widget`, `app|widget`, and `APP|app-button` are allowed.

When using ESLint's `--cache`, run ESLint once without `--cache` after changing a regular expression's pattern or flags in `allow`. ESLint's cache does not distinguish regular expressions in rule options.

For stylesheets targeting arbitrary XML vocabularies or nonstandard markup, add their element names to `allow` or disable the rule. Namespace prefixes do not determine which element catalog is used.
