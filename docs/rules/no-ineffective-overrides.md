# no-ineffective-overrides

📝 Disallow state and conditional overrides blocked by cascade priority.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports state and responsive declarations that `!important` or layer priority blocks, regardless of specificity or source order (see the [cascade sorting order](https://www.w3.org/TR/css-cascade-5/#cascade-sort)). The error message shows the line of the blocking declaration and the reason.

There is no autofix because the intended correction varies.

## Examples

```css
/* ❌ */
.button {
	color: red !important;
}
.button:hover {
	color: blue;
}

/* ✅ */
.button {
	color: red;
}
.button:hover {
	color: blue;
}
```

Unlayered normal declarations beat layered normal declarations:

```css
/* ❌ */
.button {
	color: red;
}
@layer states {
	.button:hover {
		color: blue;
	}
}

/* ✅ */
@layer components {
	.button {
		color: red;
	}
	.button:hover {
		color: blue;
	}
}
```

For `!important`, layered declarations beat unlayered declarations:

```css
/* ❌ */
@layer components {
	.button {
		color: red !important;
	}
}
.button:hover {
	color: blue !important;
}

/* ✅ */
@layer components {
	.button {
		color: red !important;
	}
	.button:hover {
		color: blue !important;
	}
}
```

Responsive declarations in native nesting are also checked:

```css
/* ❌ */
.button {
	color: red !important;
	@media (width > 40rem) {
		color: blue;
	}
}

/* ✅ */
.button {
	color: red;
	@media (width > 40rem) {
		color: blue;
	}
}
```

## Supported relationships

The rule compares declarations of the same property or a known alias, such as `word-wrap` and `overflow-wrap`, or `-webkit-transform` and `transform`. An override is only compared with a base declaration when one of these is true:

- The override adds classes, attributes, or pseudo-classes, and keeps every condition of the base selector and its ancestors unchanged, such as `.disabled.primary.button:hover` with `.button.primary`. The order of the conditions does not matter, but a repeated condition does not count as added.
- The override adds `@media`, `@supports`, `@container`, or `@starting-style` conditions and keeps the base conditions exactly, or it is in a different layered or unlayered context. The nesting order of the conditions does not matter.

Native nesting is supported with a leading `&` and with implicit nesting, except when both the parent and the nested selector lists have more than one selector. An override is only reported when every selector in its list is blocked.

A matching `::before` or `::after` at the end of both selectors is supported. The base selector must name its originating element, so `.button:hover::before` is compared with `.button::before`, but not with `::before` or `*::before`.

Ordinary selectors are compared within one `@scope`, from an outer scope into nested scopes, and from global rules into scopes.

`@starting-style` cannot block ordinary declarations.

## Limitations

Intentional browser fallbacks can need a disable comment.

- The rule does not resolve imports, the order of layers, interactions between shorthand and longhand properties or with `all`, other aliases, computed values, or custom property registration.
- Attribute selectors and pseudo-class arguments must generate identical text, except that quoting and escapes in attribute values do not matter.
- Other pseudo-elements, namespaced types, escaped wildcards, shadow-tree selectors, unparsed arguments, unlisted at-rules, and nested style rules under a pseudo-element parent are skipped.
- Separate `@scope` blocks, scope-root selectors, declarations directly in `@scope`, and `@scope` inside style rules are skipped.
- The parser does not support style rules inside a nested `@starting-style`.
- A blocking declaration cannot contain substitutions such as `var()`, and, except for a custom property, it must match the property grammar.
- A `revert`, `revert-layer`, or `revert-rule` value anywhere in the file stops the rule from reporting blockers of equal or lower importance for that property and its known shorthand components. For `all`, this applies to every property except custom properties, `direction`, and `unicode-bidi`. Rollback keywords inside substitutions are not resolved.

## Related rules

- [`no-descending-specificity`](./no-descending-specificity.md) checks selector ordering.
- [`no-ineffective-properties`](./no-ineffective-properties.md) checks incompatible properties.
- [`consistent-layer-order`](./consistent-layer-order.md) checks layer statements.
