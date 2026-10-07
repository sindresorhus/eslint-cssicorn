# no-redundant-nesting-selector

📝 Disallow redundant nesting selectors.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Remove a leading `&` before `>`, `+`, or `~`, or before a descendant selector containing no other nesting references. Comments and remaining selector text are preserved. This rule has no options.

## Examples

```css
/* ❌ */
a {
	& span {
		color: red;
	}
}

/* ✅ */
a {
	span {
		color: red;
	}
}
```

```css
/* ❌ */
a {
	& > .child {
		color: red;
	}
}

/* ✅ */
a {
	> .child {
		color: red;
	}
}
```

An explicit combinator implies a parent selector even when another nesting selector appears later:

```css
/* ❌ */
.parent {
	& + .sibling & {
		color: red;
	}
}

/* ✅ */
.parent {
	+ .sibling & {
		color: red;
	}
}
```

## Necessary nesting selectors

The rule keeps bare `&`, compound selectors such as `&:hover` and `&.active`, repeated references such as `&&`, and references in other positions such as `span &`.

A leading descendant `&` is also necessary when the selector contains another nesting reference, including one inside a functional selector. Removing it would change matching or specificity under the [CSS nesting rules](https://drafts.csswg.org/css-nesting-1/#syntax):

```css
/* ✅ */
.parent {
	& .child & {
		color: red;
	}

	& :is(&, .child) {
		color: blue;
	}
}
```

## Limitations

The rule targets modern native CSS nesting, including nested type selectors. It follows parsed nesting through `@media`, `@supports`, `@container`, and `@layer`. Scope and unknown at-rule boundaries are ignored. A normal style rule inside `@scope` can still contain nested rules checked by this rule.

Content exposed as raw text by `@eslint/css`, including some nested group-rule blocks, is ignored. Descendant selectors whose first type name starts with `--` are also ignored to avoid the [custom-property parsing ambiguity](https://drafts.csswg.org/css-syntax-3/#consume-qualified-rule).

Descendant selectors starting with an empty namespace, such as `& |span`, are ignored because `@eslint/css` cannot parse their implicit form.

## Related rules

- [`prefer-nesting`](./prefer-nesting.md) creates nesting; this rule can simplify its output.
- [`no-redundant-nested-style-rules`](./no-redundant-nested-style-rules.md) removes redundant `&` blocks.
- [`no-unscoped-nesting-selector`](./no-unscoped-nesting-selector.md) checks whether a nesting selector has a scoping context.

Stylelint's [`relative-selector-nesting-notation`](https://stylelint.io/user-guide/rules/relative-selector-nesting-notation/) with `"implicit"` overlaps with this rule. This rule focuses on safe removal, accounting for later native nesting references, including unparsed functional arguments, without an explicit-notation mode.
