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

State overrides must add pseudo-classes or attributes to the same element while keeping its ancestors unchanged:

| Base selector | Override selector | Compared |
| --- | --- | --- |
| `.button` | `.button:hover` | Yes |
| `.toolbar > .button` | `.toolbar > .button[disabled]:hover` | Yes |
| `.button[type="submit"]` | `.button[type="submit"]:hover` | Yes |
| `.button:hover` | `.button:hover:focus` | No |
| `.button[disabled]` | `.button[disabled][data-state="open"]` | No |
| `.button` | `.button.is-disabled` | No |

For these state comparisons, the base element must have no pseudo-classes. Attribute additions are checked only when the base element also has no attributes. Attribute values are not compared logically.

- The override uses the same selector under additional `@media`, `@supports`, or `@container` conditions, or in a different layered/unlayered context. These comparisons can retain existing pseudo-classes and attributes.
- The base's conditions must be an exact prefix of the override's conditions. Separate blocks with identically generated conditions match; logical implication between different queries is not inferred.
- Native nesting is resolved only when each parent rule has one selector. A leading `&` refers to that selector. Selectors without `&` use their leading combinator, or are descendants when no combinator is specified. Other placements of `&` are skipped.
- Only identical property names are compared. Property names and pseudo-class names outside arguments are ASCII case-insensitive; class, ID, and custom property names are case-sensitive. Equivalent escapes in property, class, and ID names match.
- A declaration in a selector list is reported only when every branch has a blocker. If the branches have different blockers, the diagnostic identifies one of them. Partially blocked declarations are left alone.

## Limitations

This is a conservative check of explicit relationships in the current file, not a complete cascade evaluator.

The rule is enabled only in `recommended`. It can report intentional browser fallbacks: an override may still apply in a browser that does not support the blocking declaration's value. Disable this rule when those fallbacks are deliberate.

- Does not compare priority between two layered declarations with the same importance. Named layer ordering, sublayers, imports, and other files are not resolved.
- Does not analyze shorthand/longhand relationships, property aliases, `all` interactions, additional classes, or changes to ancestor selectors. Simple-selector order must match.
- Retained attributes and pseudo-class arguments must have identical generated text; names and escapes inside them are not normalized. Arguments are not expanded or compared logically.
- Skips unparsed selector arguments (such as `:state()`), pseudo-elements, namespace type selectors, escaped wildcard type names, shadow-tree pseudo-classes, `:scope`, `@scope`, `@starting-style`, keyframes, and unknown grouping rules.
- A property is left unchecked throughout the file if any declaration gives it `revert` or `revert-layer`. A rollback on `all` leaves the file unchecked. Rollbacks through shorthands or substitutions are not analyzed.
- Declarations with substitution functions such as `var()` are not used as blockers. Invalid or unknown ordinary property values are not used as blockers either. Browser support, custom property registration, and computed values are not evaluated.

For related checks, see [`no-descending-specificity`](./no-descending-specificity.md) for selector ordering, [`no-ineffective-properties`](./no-ineffective-properties.md) for incompatible property combinations, and [`consistent-layer-order`](./consistent-layer-order.md) for layer statement ordering.

Unlike [`css/no-important`](https://github.com/eslint/css/blob/main/docs/rules/no-important.md) and [`css/use-layers`](https://github.com/eslint/css/blob/main/docs/rules/use-layers.md), this rule allows `!important` and unlayered styles when they do not block a supported override. Stylelint's [`no-descending-specificity`](https://stylelint.io/user-guide/rules/no-descending-specificity/) does not consider importance or declarations; its [`declaration-block-no-shorthand-property-overrides`](https://stylelint.io/user-guide/rules/declaration-block-no-shorthand-property-overrides/) checks ordering within a declaration block.
