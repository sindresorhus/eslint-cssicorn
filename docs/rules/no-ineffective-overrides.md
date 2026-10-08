# no-ineffective-overrides

📝 Disallow state and conditional overrides blocked by cascade priority.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Reports state and responsive declarations blocked by `!important` or layer priority, regardless of specificity or source order. Each diagnostic identifies the blocker's line and reason. No autofix, since the intended correction varies. See the [cascade sorting order](https://www.w3.org/TR/css-cascade-5/#cascade-sort).

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

Responsive declarations and native nesting:

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

Compares identical properties when an override:

- Adds classes, attributes, or pseudo-classes to the same element, keeping ancestors unchanged: `.button` → `.button.is-disabled` or `.button:hover` → `.button:hover:focus`.
- Reuses a selector under additional `@media`, `@supports`, or `@container` conditions, or across layered/unlayered contexts. Base conditions must exactly match the override's leading conditions.

Nesting requires one selector per parent and a leading `&` or implicit nesting. Selector lists are reported only when every branch is blocked.

## Limitations

Checks only this file. Deliberate browser fallbacks may be reported; suppress those diagnostics locally.

- Does not resolve layer ordering, imports, shorthand/longhand or `all` interactions, aliases, computed values, or custom property registration.
- Retained selector order must match. Classes and existing-state refinements must be appended; attributes and pseudo-class arguments must have identical generated text.
- Skips pseudo-elements, namespaced types, escaped wildcards, shadow-tree/scope selectors, unparsed arguments, and at-rules other than `@media`, `@supports`, `@container`, and `@layer`.
- Invalid or unknown ordinary values and values with substitutions such as `var()` cannot block overrides.
- `revert`/`revert-layer` skips that property throughout the file. An `all` rollback skips all but custom properties, `direction`, and `unicode-bidi`. Other shorthand or substitution rollbacks are not resolved.

Related: [`no-descending-specificity`](./no-descending-specificity.md) checks selector ordering, [`no-ineffective-properties`](./no-ineffective-properties.md) checks incompatible properties, and [`consistent-layer-order`](./consistent-layer-order.md) checks layer statements.
