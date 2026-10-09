# no-ineffective-selector-properties

📝 Disallow properties that cannot affect their selected targets.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- The examples pair ineffective declarations with removal while retaining effective styling. -->

Catch ineffective styling of pseudo-elements and visited links.

## Examples

```css
/* ❌ */
::selection {
	padding: 1rem;
	background-color: yellow;
}

/* ✅ */
::selection {
	background-color: yellow;
}
```

```css
/* ❌ */
li::marker {
	margin-right: 0.5rem;
	color: red;
}

/* ✅ */
li::marker {
	color: red;
}
```

```css
/* ❌ */
a:visited {
	font-weight: bold;
	color: purple;
}

/* ✅ */
a:visited {
	color: purple;
}
```

## Checks

Checks [highlights](https://www.w3.org/TR/css-pseudo-4/#highlight-styling) (`::selection`, `::target-text`, `::spelling-error`, `::grammar-error`, `::search-text`, and `::highlight()`), [`::marker`](https://www.w3.org/TR/css-lists-3/#marker-properties), [`::cue`](https://www.w3.org/TR/webvtt1/#the-cue-pseudo-element) and [`::cue-region`](https://www.w3.org/TR/webvtt1/#the-cue-region-pseudo-element) (with or without arguments), [`::first-line`](https://www.w3.org/TR/css-pseudo-4/#first-line-styling), [`::placeholder`](https://www.w3.org/TR/css-pseudo-4/#placeholder-pseudo), and [`:visited`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:visited).

Reports a finite list of common ineffective properties:

- Highlights, markers, cues, cue regions, and visited links: margins, padding, physical and logical sizes and insets, `display`, `position`, transforms, `box-shadow`, and border widths, styles, and radii.
- Highlights, markers, and visited links: `opacity` and background image and positioning properties.
- Highlights and visited links: font properties and `line-height`.
- Highlights, markers, cues, and cue regions: border colors and color-bearing border shorthands.
- Markers: `background` and `background-color`.
- Visited links: `text-shadow`.
- First-line and placeholder text: only `writing-mode`, `direction`, and `text-orientation`.

Marker text styling, animations, and transitions are allowed, as are highlight colors, decorations, and text shadows. Cue and cue-region backgrounds, opacity, fonts, outlines, and text styling are preserved. Custom properties, vendor-prefixed properties, unlisted properties, and `all` are ignored.

Preserves partially effective shorthands, including `background` on highlights and visited links, and `border` on visited links.

## Scope and fixes

A declaration is reported only when every selector makes it ineffective. For example, `padding` is allowed with `::selection, .ordinary`, and `font-size` with `::selection, ::marker`.

Only targets on the final selected compound are checked, including `li::before::marker` and `:is(.first, .second)::marker`. Parsed `:is()` and `:where()` arguments are also checked when every branch selects a visited link. A final `&`, including inside these arguments as in `:where(&)`, inherits visited restrictions when every parent selector selects a visited link. Other functional arguments and visited restrictions on ancestors, siblings, or pseudo-elements are not analyzed.

Unknown or preprocessing pseudo-selectors in analyzed selectors, such as CSS Modules' `:global()` and Vue's `:deep()`, cause that branch to be skipped, suppressing reports for the list.

Explicit targets in nested rules are checked. Declarations inside `@media`, `@supports`, `@container`, `@layer`, and `@starting-style` inherit the enclosing selector; other at-rules, descriptors, and keyframes stop this inheritance. Other pseudo-elements are not checked.

Autofixes remove ineffective declarations; declarations containing comments are reported without a fix. Values, the cascade, and target browsers are not evaluated; no replacements are suggested.

Visited checks reflect current browser privacy restrictions, which [may relax in future browsers](https://drafts.csswg.org/selectors-4/#visited-privacy). Disable the rule for intentional future-facing declarations.

## Related rules

- [`no-ineffective-properties`](./no-ineffective-properties.md) checks declarations disabled by other declarations in the same block.
- [`css/no-invalid-properties`](https://github.com/eslint/css/blob/main/docs/rules/no-invalid-properties.md) validates property names and values.
- Stylelint's [`rule-selector-property-disallowed-list`](https://stylelint.io/user-guide/rules/rule-selector-property-disallowed-list/) provides configurable restrictions; this rule supplies automatic restrictions with conservative selector handling.
