# no-ineffective-overrides

📝 Disallow state and conditional overrides blocked by cascade priority.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Checks state and responsive declarations that lose to base styling because of `!important` or layer priority. These priorities are decided before specificity, so a more specific selector cannot overcome them. See the [CSS cascade sorting order](https://www.w3.org/TR/css-cascade-5/#cascade-sort).

The rule reports the losing declaration and identifies the blocking declaration's line and reason. It checks both source orders and has no autofix or suggestions because the intended correction varies.

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

Unlayered normal declarations take precedence over layered normal declarations, even when the layered selector is more specific:

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

For important declarations, layer priority reverses: layered important declarations take precedence over unlayered important declarations.

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

Responsive declarations and native nesting are also checked:

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

```css
/* ❌ */
.button {
	color: red !important;
	&[aria-disabled="true"] {
		color: gray;
	}
}

/* ✅ */
.button {
	color: red;
	&[aria-disabled="true"] {
		color: gray;
	}
}
```

## Supported relationships

Compares identical properties when an override:

- Adds pseudo-classes or attributes to the same element, with unchanged ancestors: `.button` → `.button:hover` or `.toolbar > .button` → `.toolbar > .button[disabled]:hover`.
- Appends classes or refines existing states: `.button` → `.button.is-disabled`, `.button:hover` → `.button:hover:focus`, or `.button[disabled]` → `.button[disabled][data-state="open"]`.
- Uses an identical selector under additional `@media`, `@supports`, or `@container` conditions, or across layered/unlayered contexts. Base conditions must exactly match the override's leading conditions.

Native nesting requires one selector per parent and a leading `&` or implicit nesting. Selector lists are reported only when every branch is blocked; the diagnostic identifies one blocker.

## Limitations

Checks only the current file. It may report deliberate fallbacks for browsers that do not support a blocking value; suppress those diagnostics locally.

- Does not resolve layer ordering, imports, shorthand/longhand or `all` interactions, property aliases, computed values, or custom property registration.
- Retained selector components must match in order; classes and refinements to existing states must be appended. Attributes and pseudo-class arguments use generated text, without logical comparison or identifier normalization inside them.
- Skips pseudo-elements, namespaced type selectors, escaped wildcard names, shadow-tree and scope selectors, unparsed arguments such as `:state()`, and at-rules other than `@media`, `@supports`, `@container`, and `@layer`.
- Invalid or unknown ordinary values and substitution-dependent values such as `var()` are not blockers.
- `revert` or `revert-layer` leaves that property unchecked throughout the file. An `all` rollback skips properties it resets; custom properties, `direction`, and `unicode-bidi` remain checked. Rollbacks through other shorthands or substitutions are not resolved.

For related checks, see [`no-descending-specificity`](./no-descending-specificity.md) for selector ordering, [`no-ineffective-properties`](./no-ineffective-properties.md) for incompatible property combinations, and [`consistent-layer-order`](./consistent-layer-order.md) for layer statement ordering.

Unlike [`css/no-important`](https://github.com/eslint/css/blob/main/docs/rules/no-important.md) and [`css/use-layers`](https://github.com/eslint/css/blob/main/docs/rules/use-layers.md), this rule allows `!important` and unlayered styles when they do not block a supported override. Stylelint's [`no-descending-specificity`](https://stylelint.io/user-guide/rules/no-descending-specificity/) does not consider importance or declarations; its [`declaration-block-no-shorthand-property-overrides`](https://stylelint.io/user-guide/rules/declaration-block-no-shorthand-property-overrides/) checks ordering within a declaration block.
