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

Compares the same property or a [known name alias](../../rules/shared/css-property-name-aliases.js) when an override:

- Adds classes, attributes, or pseudo-classes while retaining every base condition and unchanged ancestors: `.button.primary` → `.disabled.primary.button:hover`. Condition order is irrelevant; duplicates alone do not count.
- Adds `@media`, `@supports`, `@container`, or `@starting-style` conditions, retaining base conditions exactly, or changes layered/unlayered context. Conditional nesting order is irrelevant.

Native nesting supports leading `&` and implicit nesting, except combinations of multiple parent and child branches. Every selector branch must be blocked.

Matching terminal `::before`/`::after` is supported; refinements require explicit originating-element selectors. Nested style rules under pseudo-element parents are skipped.

Ordinary selectors work within a `@scope`, from outer to nested scopes, and from global rules into scopes. Separate scope blocks, scope-root selectors, direct `@scope` declarations, and scopes inside style rules are skipped.

`@starting-style` cannot block ordinary declarations. Style rules inside nested `@starting-style` are unsupported by the parser.

## Limitations

Checks this file only; intentional browser fallbacks may need local suppression.

- Does not resolve imports, layer ordering, shorthand/longhand or `all` interactions, other aliases, computed values, or custom property registration.
- Attribute syntax (except value quoting/escapes) and pseudo-class arguments must generate identical text.
- Skips other pseudo-elements, namespaced types, escaped wildcards, shadow-tree selectors, unparsed arguments, and unlisted at-rules.
- Ordinary blockers must match the property grammar. Values containing substitutions such as `var()` cannot block overrides.
- `revert`, `revert-layer`, and `revert-rule` suppress blockers of equal or lower importance for that property and known shorthand components throughout the file. `all` excludes custom properties, `direction`, and `unicode-bidi`. Substituted rollbacks are unresolved.

Related: [`no-descending-specificity`](./no-descending-specificity.md) checks selector ordering, [`no-ineffective-properties`](./no-ineffective-properties.md) checks incompatible properties, and [`consistent-layer-order`](./consistent-layer-order.md) checks layer statements.
