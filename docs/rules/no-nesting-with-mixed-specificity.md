# no-nesting-with-mixed-specificity

📝 Disallow mixed specificity in nesting parents and selector-list pseudo-classes.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports nested rules under a parent selector list with mixed specificity.

CSS gives the nesting selector (`&`) the specificity of the most specific selector in its parent selector list, like `:is()`, so a nested rule can be more specific than its matching parent branch suggests.

The rule also checks `:is()`, `:not()`, `:has()`, and the `of` lists in `:nth-child()` and `:nth-last-child()`, which use the same [specificity rules](https://www.w3.org/TR/selectors-4/#specificity-rules). Ordinary selector lists without nesting are allowed.

There is no autofix because changing selectors can alter matching or the cascade. Disable the rule for intentional mixed specificity. Splitting `:not()` or `:has()` is not a general solution.

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

Selector lists whose entries have equal specificity are allowed, so making the parent selectors equally specific also fixes it:

```css
/* ✅ */
.dialog,
.modal {
	& .close {}
}
```

## Selector-list pseudo-classes

Diagnostics show each argument's specificity, not the whole selector's, as `IDs-classes-types`. Classes include attributes and pseudo-classes, and types include pseudo-elements.

In `.button:is(:hover, #featured)`, `#featured` sets the function's specificity even when only `:hover` matches:

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

The arguments have specificity `0-1-0` and `1-0-0`, and the whole selector has `1-1-0`.

For `:not()`, the strongest excluded selector contributes specificity even though none of the arguments match:

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

Both `:nth-child()` and `:nth-last-child()` add one pseudo-class to their `of` list's maximum specificity:

```css
/* ❌ */
.item:nth-child(even of .item, #featured) {}

/* ✅ */
.item:nth-child(even of .item, .featured) {}
```

Wrapping a function in `:where()` preserves matching and gives it zero specificity:

```css
/* ❌ */
.button:is(:hover, #featured) {}

/* ✅ */
.button:where(:is(:hover, #featured)) {}
```

But `:is(:where(#featured), .button)` still mixes `0-0-0` and `0-1-0`.

## Limitations

The rule resolves nesting parents through `@media`, `@supports`, `@container`, and `@layer`, stopping at other at-rules, including `@scope`. It ignores direct pseudo-element parent branches and at-rule preludes.

Unparsed syntax, including escaped function names and some nested `@supports` or `@container` blocks, is skipped. Malformed or unsupported selectors are best effort.
