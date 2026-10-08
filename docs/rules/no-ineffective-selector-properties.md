# no-ineffective-selector-properties

📝 Disallow properties that cannot affect their selected targets.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- The examples pair ineffective declarations with removal while retaining effective styling. -->

Catch valid declarations that cannot affect their selected target, such as padding on a text selection, margins on a list marker, or font weight on a visited link.

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

The rule checks [highlight pseudo-elements](https://www.w3.org/TR/css-pseudo-4/#highlight-styling) (`::selection`, `::target-text`, `::spelling-error`, `::grammar-error`, `::search-text`, and `::highlight()`), [`::marker`](https://www.w3.org/TR/css-lists-3/#marker-properties), and [`:visited`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:visited).

It uses a finite list of common ineffective properties rather than rejecting every property outside an allowlist:

- All checked targets: margins, padding, physical and logical sizes and insets, `display`, `position`, `opacity`, transforms, `box-shadow`, background image and positioning properties, and border widths, styles, and radii.
- Highlights and visited links: font properties and `line-height`.
- Highlights and markers: border colors and color-bearing border shorthands.
- Markers: `background` and `background-color`.
- Visited links: `text-shadow`.

Marker fonts, inherited text styling, animations, and transitions are allowed. Highlight colors, text decorations, and text shadows are allowed. Custom properties, vendor-prefixed properties, unlisted properties, and `all` are not checked.

Partially effective shorthands are preserved. For example, `background` can set highlight or visited background colors, and `border` can set visited border colors.

## Scope and fixes

A declaration is reported only when every selector in the list makes that property ineffective. An unrestricted selector, an unresolved selector, or a target that permits the property prevents reporting:

```css
/* ✅ */
::selection, .ordinary {
	padding: 1rem;
}

/* ✅ */
::selection, ::marker {
	font-size: 1rem;
}
```

Only explicit restrictions on the final selected compound are recognized. `li::before::marker` is checked as a marker. Visited ancestors, siblings, pseudo-elements of visited links, functional selector arguments, and parent-selector expansion are not analyzed.

Explicit restricted targets in nested style rules are checked. Nested declarations in `@media`, `@supports`, `@container`, `@layer`, and `@starting-style` use their enclosing style rule's selector. Other at-rules, descriptors, and keyframes stop this inheritance. First-line, first-letter, placeholder, cue, and vendor-specific pseudo-elements are outside the rule's scope.

Autofixes remove ineffective declarations. Declarations containing comments are reported without a fix to preserve those comments. The rule does not suggest replacements or evaluate values, the cascade, or target browsers.

The `:visited` checks reflect current browser privacy restrictions. The [Selectors privacy appendix](https://drafts.csswg.org/selectors-4/#visited-privacy) permits approaches that could relax these restrictions in future browsers. Disable the rule for intentional future-facing declarations.

## Related rules

- [`no-ineffective-properties`](./no-ineffective-properties.md) checks declarations disabled by other declarations in the same block.
- [`css/no-invalid-properties`](https://github.com/eslint/css/blob/main/docs/rules/no-invalid-properties.md) validates property names and values.
- Stylelint's [`rule-selector-property-disallowed-list`](https://stylelint.io/user-guide/rules/rule-selector-property-disallowed-list/) offers configurable selector/property restrictions. This rule supplies automatic restrictions and handles selector branches conservatively.
