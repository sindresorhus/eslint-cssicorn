# prefer-nesting

📝 Prefer CSS nesting for related rules and selector groups.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer native CSS nesting for adjacent rules and overrides that repeat a parent selector, and for leading or trailing `:is()` and `:where()` groups.

## Examples

Nest adjacent rules under their shared parent, including complex selectors and pseudo-classes such as `:hover`, `:not()`, `:has()`, and `:nth-child()`:

```css
/* ❌ */
.card {
	color: red;
}
.card .title, .card .body {
	font-weight: bold;
}
.card:hover {
	color: blue;
}

/* ✅ */
.card {
	color: red;
	& .title, & .body {
		font-weight: bold;
	}
	&:hover {
		color: blue;
	}
}
```

Nest an adjacent `@media`, `@supports`, `@container`, or `@layer` block containing only the same selector. For `@container`, that rule must contain only declarations:

```css
/* ❌ */
.card {
	color: red;
}
@media (width > 600px) {
	.card {
		color: blue;
	}
}

/* ✅ */
.card {
	color: red;
	@media (width > 600px) {
		color: blue;
	}
}
```

Convert trailing or leading `:is()` and `:where()` groups:

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

```css
/* ❌ */
:where(.foo, #bar) a {
	color: red;
}

/* ✅ */
:where(.foo, #bar) {
	& a {
		color: red;
	}
}
```

Attached suffixes use `&`, including pseudo-elements such as `&::before`:

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

Leading and trailing groups also support `>`, `+`, and `~`. Trailing groups after these combinators stay wrapped in `:is()`.

## Specificity

Trailing `:is()` is unwrapped only when its arguments have equal specificity and unwrapping preserves [forgiving selector-list behavior](https://drafts.csswg.org/selectors/#forgiving-selector). Complex arguments and arguments with pseudo-classes, attribute flags, namespace syntax, or invalid IDs stay wrapped:

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

`:where()` always stays wrapped to preserve zero specificity.

Leading `:is()` groups preserve their maximum specificity, even with mixed arguments. The result can trigger [`no-nesting-with-mixed-specificity`](./no-nesting-with-mixed-specificity.md); disable that rule for intentional mixed-specificity nesting.

## Limitations

Merges only adjacent rules with one parent selector repeated exactly. Selector-group conversions require one outer selector and at least two arguments.

Skips existing `&`, escaped group names, opaque parent arguments, `@scope`, and files with `@namespace`. Comments, missing semicolons, or unsafe formatting can prevent fixes.
