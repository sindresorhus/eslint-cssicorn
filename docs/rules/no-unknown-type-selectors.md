# no-unknown-type-selectors

📝 Disallow unknown type selectors.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule checks type selectors against known HTML, SVG, and MathML element names, including obsolete elements. It catches likely typos; it does not check the document's markup or whether an element exists.

HTML and MathML names are ASCII case-insensitive. SVG names are case-sensitive.

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

Valid custom element names, such as `my-widget`, are allowed by default. Names containing uppercase ASCII letters, such as `my-Widget`, are not valid custom element names.

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

Additional local element names to allow, with or without a namespace prefix. Strings match exactly and case-sensitively. Regular expressions match using their own flags; use anchors when you want to match the whole name. CSS escapes are decoded before matching.

Use actual regular expressions. Strings such as `'/^app-/'` are literal names, not patterns.

```js
{
	allow: ['widget', /^app-/, /^legacy$/i],
}
```

With this configuration, `widget`, `app|widget`, and `APP|app-button` are allowed.

For stylesheets targeting arbitrary XML vocabularies or nonstandard markup, add their element names to `allow` or disable the rule. Namespace prefixes do not determine which element catalog is used.
