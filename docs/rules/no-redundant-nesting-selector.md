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

Targets modern native CSS. It follows parsed nesting through `@media`, `@supports`, `@container`, and `@layer`, skipping `@scope` and unknown at-rule boundaries.

Skips raw parser content and descendant selectors starting with `--` or an empty namespace (`& |span`), where removing `&` can cause parsing problems.

## Related rules

- [`prefer-nesting`](./prefer-nesting.md) creates nesting; this rule can simplify its output.
- [`no-redundant-nested-style-rules`](./no-redundant-nested-style-rules.md) removes redundant `&` blocks.
- [`no-unscoped-nesting-selector`](./no-unscoped-nesting-selector.md) checks whether a nesting selector has a scoping context.
