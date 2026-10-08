# no-nesting-with-mixed-specificity

📝 Disallow mixed specificity in nesting parents and selector-list pseudo-classes.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

CSS gives the nesting selector (`&`) the specificity of the most specific selector in its parent selector list, matching the behavior of `:is()`. Mixing selector specificities can therefore make a nested rule more specific than one of its matching parent branches suggests.

The same mechanism applies to `:is()`, `:not()`, `:has()`, and the `of` selector lists in `:nth-child()` and `:nth-last-child()`. This rule also reports mixed specificity in those lists. Ordinary selector lists without nesting are allowed.

## Examples

```css
/* ❌ */
#dialog,
.dialog {
	& .close {}
}
```

The nested selector behaves like `:is(#dialog, .dialog) .close`, so both branches have the ID specificity from `#dialog`.

Split the parent rule:

```css
/* ✅ */
#dialog {
	& .close {}
}

.dialog {
	& .close {}
}
```

Selector lists whose entries have equal specificity are allowed:

```css
/* ✅ */
.dialog,
.modal {
	& .close {}
}
```

Equalizing the parent selectors' specificity is therefore another possible remediation.

## Selector-list pseudo-classes

Diagnostics show each argument's specificity as `IDs-classes-types`, where the middle component also counts attributes and pseudo-classes, and the last also counts pseudo-elements. These are argument specificities; selectors outside the function and the `:nth-child()` or `:nth-last-child()` pseudo-class itself can add specificity to the complete selector.

The most specific argument of `:is()` determines its specificity, even when a less specific argument matches. Here, `#featured` gives the selector ID specificity even when the button matches only through `:hover`:

```css
/* ❌ */
.button:is(:hover, #featured) {
	color: blue;
}

/* ✅ */
.button:is(:hover, .featured) {
	color: blue;
}
```

The failing example reports argument specificities `0-1-0` and `1-0-0`. The complete selector has specificity `1-1-0`, including the `.button` class.

`:not()` matches none of its arguments but still takes their maximum specificity. In this example, the excluded ID gives the selector ID specificity even when the button is neither hovered nor featured:

```css
/* ❌ */
.button:not(:hover, #featured) {}

/* ✅ */
.button:not(:hover, .featured) {}
```

`:has()` accepts relative selectors and takes their maximum specificity:

```css
/* ❌ */
.button:has(> .icon, + #featured) {}

/* ✅ */
.button:has(> .icon, + .featured) {}
```

The `of` lists in `:nth-child()` and `:nth-last-child()` also contribute their maximum specificity, in addition to the pseudo-class's own specificity:

```css
/* ❌ */
.item:nth-child(even of .item, #featured) {}

/* ✅ */
.item:nth-child(even of .item, .featured) {}
```

`:where()` and everything inside it have zero specificity. If that is the intended cascade behavior, wrapping the function in `:where()` preserves matching while lowering specificity:

```css
/* ❌ */
.button:is(:hover, #featured) {}

/* ✅ */
.button:where(:is(:hover, #featured)) {}
```

A `:where()` inside one argument does not neutralize the other arguments. For example, `:is(:where(#featured), .button)` still has mixed specificity: `0-0-0` and `0-1-0`.

Mixed specificity can be intentional. Disable this rule when that behavior is desired. Changing these selectors requires checking the intended matching and cascade; splitting `:not()` or `:has()` into separate functions is not a general replacement.

## Limitations

The rule follows [CSS specificity rules](https://www.w3.org/TR/selectors-4/#specificity-rules), ignores direct pseudo-element branches in nesting parents because `&` cannot represent them, and carries nesting through `@media`, `@supports`, `@container`, and `@layer`. `@scope` and other at-rules are boundaries for resolving nesting parents. Parsed style selectors inside grouping at-rules are checked, but selector functions in at-rule preludes such as `@supports selector(...)` or `@scope (...)` are ignored.

Functional pseudo-selector syntax represented as raw parser nodes, including escaped function names, is not analyzed. Nested `@supports` or `@container` rules cannot be checked while `@eslint/css` exposes their contents as raw text. Malformed or unsupported selectors are handled on a best-effort basis.

This rule has no fixer because splitting or changing selectors requires knowledge of the intended document structure and cascade.
