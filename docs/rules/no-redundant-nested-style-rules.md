# no-redundant-nested-style-rules

📝 Disallow nested style rules that do not modify the parent selector.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports a nested style rule whose selector is only `&`, which adds nesting without making the selector's intent clearer. The autofix moves its contents into the enclosing block.

## Examples

```css
/* ❌ */
.button {
	& {
		color: red;
	}
}

/* ✅ */
.button {
	color: red;
}
```

```css
/* ❌ */
.button {
	@media (width > 30rem) {
		& {
			color: red;
		}
	}
}

/* ✅ */
.button {
	@media (width > 30rem) {
		color: red;
	}
}
```

Selectors that modify the parent selector are allowed:

```css
/* ✅ */
.button {
	&:hover {
		color: red;
	}
}
```

## Limitations

The rule only reports cases that can be safely flattened: the parent style rule must have one selector and must not select a pseudo-element. Otherwise, flattening could change [CSS nesting specificity](https://drafts.csswg.org/css-nesting-1/#nest-selector) or apply declarations to pseudo-elements that `&` cannot represent.

`@container`, `@layer`, `@media`, and `@supports` may appear between the parent style rule and the redundant `&` block. An intervening `@scope` or other at-rule is ignored, because `&` can have a different meaning there.

The autofix is omitted when reindenting could change significant source text, such as escaped line continuations, multiline comments, or multiline custom-property values.
