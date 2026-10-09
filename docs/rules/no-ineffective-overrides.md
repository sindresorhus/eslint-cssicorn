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

- Adds classes, attributes, or pseudo-classes to the same element, keeping ancestors unchanged: `.button` → `.button.is-disabled` or `.button:hover` → `.button:hover:focus`. Retained conditions on that element may be reordered.
- Reuses a selector under additional `@media`, `@supports`, `@container`, or `@starting-style` conditions, or across layered/unlayered contexts. Every base condition must appear unchanged among the override's conditions; nesting order does not matter.

Nesting supports a leading `&` or implicit nesting, skipping combinations of multiple parent and child branches. Lists are reported only when every branch is blocked.

`@starting-style` declarations cannot block ordinary declarations. The parser does not support style rules inside nested `@starting-style`.

Compares ordinary selectors within one `@scope`, from outer into nested scopes, and from global rules into scopes. Separate blocks, scope-root selectors, direct scope declarations, and scopes inside style rules are skipped.

## Limitations

Checks only this file. Deliberate browser fallbacks may be reported; suppress those diagnostics locally.

- Does not resolve layer ordering, imports, shorthand/longhand or `all` interactions, aliases, computed values, or custom property registration.
- Classes and existing-state refinements must be appended; attribute syntax (apart from value quoting and escapes) and pseudo-class arguments must have identical generated text.
- Skips pseudo-elements, namespaced types, escaped wildcards, shadow-tree selectors, unparsed arguments, and at-rules other than `@media`, `@supports`, `@container`, `@layer`, `@scope`, and `@starting-style`.
- Invalid or unknown ordinary values and values with substitutions such as `var()` cannot block overrides.
- `revert`/`revert-layer` disables blockers for that property and known shorthand components throughout the file, except important blockers when all rollbacks are normal. An `all` rollback excludes custom properties, `direction`, and `unicode-bidi`. Substitution rollbacks are not resolved.

Related: [`no-descending-specificity`](./no-descending-specificity.md) checks selector ordering, [`no-ineffective-properties`](./no-ineffective-properties.md) checks incompatible properties, and [`consistent-layer-order`](./consistent-layer-order.md) checks layer statements.
