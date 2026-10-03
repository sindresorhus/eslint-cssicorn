# prefer-nesting

📝 Prefer CSS nesting over structural uses of `:is()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer native CSS nesting for `:is()` at the start of a selector or after its final combinator. Fixes preserve matching behavior, declaration order, selector escapes, and line endings.

The fix keeps the `:is()` wrapper when needed to preserve specificity or forgiving selector-list behavior.

## Examples

```css
/* ❌ */
a :is(.foo, .bar) {
	color: red;
}

/* ✅ */
a {
	.foo, .bar {
		color: red;
	}
}
```

After `>`, `+`, or `~`, trailing `:is()` remains wrapped:

```css
/* ❌ */
a > :is(.foo, .bar) {
	color: red;
}

/* ✅ */
a {
	> :is(.foo, .bar) {
		color: red;
	}
}
```

```css
/* ❌ */
:is(.foo, .bar) a {
	color: red;
}

/* ✅ */
.foo, .bar {
	a {
		color: red;
	}
}
```

Leading `:is()` also supports `>`, `+`, and `~`:

```css
/* ❌ */
:is(.foo, .bar) > a {
	color: red;
}

/* ✅ */
.foo, .bar {
	> a {
		color: red;
	}
}
```

```css
/* ❌ */
:is(a, button).active {
	color: red;
}

/* ✅ */
a, button {
	&.active {
		color: red;
	}
}
```

```css
/* ❌ */
:is(.foo, .bar)::before {
	content: "";
}

/* ✅ */
.foo, .bar {
	&::before {
		content: "";
	}
}
```

Arguments with pseudo-classes, attribute flags, namespace syntax, or invalid IDs such as `#123` stay inside `:is()`. This preserves its [forgiving selector list](https://drafts.csswg.org/selectors/#forgiving-selector), so valid branches still match when others are unsupported or invalid.

```css
/* ❌ */
a :is(.foo, :blank) {
	color: red;
}

/* ✅ */
a {
	:is(.foo, :blank) {
		color: red;
	}
}
```

## Specificity

After a descendant combinator, trailing `:is()` is unwrapped only when its arguments have equal specificity. Otherwise, it stays wrapped to preserve their maximum specificity.

```css
/* ❌ */
a :is(.foo, #bar) {
	color: red;
}

/* ✅ */
a {
	:is(.foo, #bar) {
		color: red;
	}
}
```

A leading `:is()` can have mixed specificity: nesting preserves its maximum specificity. The resulting parent selector list can trigger [`no-nesting-with-mixed-specificity`](./no-nesting-with-mixed-specificity.md), also enabled in the recommended config. Disable that rule for intentional mixed-specificity nesting.

## Limitations

Requires one selector and at least two compound `:is()` arguments. Skips complex arguments, existing `&`, standalone `:is()`, and patterns such as `a:is(.foo, .bar)` or `a :is(.foo, .bar) b`. Neighboring rules are not merged.

Unsupported selectors, escaped `:is()` names, rules inside `@scope`, and files containing `@namespace` are ignored.

Reports without fixing when comments, escapes consuming line breaks, multiline raw values, or unclear indentation make rewriting unsafe. Fixes preserve nested blocks and reuse the existing body indentation.

Only standard CSS parsed by `@eslint/css` is supported. Target browsers must support native nesting unless your build transforms it.

## Related rules

- Stylelint's [`relative-selector-nesting-notation`](https://stylelint.io/user-guide/rules/relative-selector-nesting-notation/): controls `&` notation.
- [`stylelint-use-nesting`](https://github.com/csstools/stylelint-use-nesting): merges neighboring rules.
