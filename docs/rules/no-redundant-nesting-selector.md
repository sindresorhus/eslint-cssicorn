# no-redundant-nesting-selector

📝 Disallow redundant nesting selectors.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports a leading `&` before `>`, `+`, or `~`, or before a descendant selector with no other nesting references. It is not needed, because a nested selector without `&` is already relative to the parent. The autofix removes it, preserving comments and the remaining selector text.

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

The rule targets native CSS nesting, and follows it through `@media`, `@supports`, `@container`, and `@layer`. It does not check a rule when `@scope` or another at-rule is between it and its parent style rule, as in `a { @unknown { & .child {} } }`.

The rule ignores unparsed (raw) selector text and descendant selectors that start with `--`. It also keeps `&` when the bundled parser would not read the fixed selector list as a nested rule, like `& span::before`, `& |span`, and `&+span`. After `& span:before` becomes `span:before`, [`prefer-modern-syntax`](./prefer-modern-syntax.md) adds the `&` back with its fix to `& span::before`.

## Related rules

- [`prefer-nesting`](./prefer-nesting.md) creates nesting, and this rule can simplify its output.
- [`no-redundant-nested-style-rules`](./no-redundant-nested-style-rules.md) removes redundant `&` blocks.
- [`no-unscoped-nesting-selector`](./no-unscoped-nesting-selector.md) checks whether a nesting selector has a scoping context.
