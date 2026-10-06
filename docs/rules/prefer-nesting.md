# prefer-nesting

📝 Prefer CSS nesting for related rules and selector groups.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer native CSS nesting for adjacent rules that share a parent selector, conditional overrides, and structural `:is()` and `:where()` groups.

## Examples

Nest adjacent rules under an existing or shared parent:

```css
/* ❌ */
.card .title {
	color: red;
}
.card .body {
	font-weight: bold;
}

/* ✅ */
.card {
	& .title {
		color: red;
	}
	& .body {
		font-weight: bold;
	}
}
```

Nest an adjacent `@media` or `@layer` block containing one rule with the same or a related selector. `@supports`, `@container`, and `@starting-style` require the same selector and declarations only:

```css
/* ❌ */
.card {
	color: red;
}
@media (width > 600px) {
	.card .title {
		color: blue;
	}
}

/* ✅ */
.card {
	color: red;
	@media (width > 600px) {
		& .title {
			color: blue;
		}
	}
}
```

Nest `:is()` and `:where()` groups, including groups followed by suffixes or further selectors:

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

Leading and trailing groups also support `>`, `+`, and `~`. Trailing groups after these combinators stay wrapped.

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

Merges adjacent rules using literal selector prefixes. Finding a new parent requires two single-selector rules. Selector-group conversions require one outer selector and at least two arguments.

Skips existing `&`, escaped group names, opaque parent arguments, `@scope`, and files with `@namespace`. Comments, missing semicolons, or unsafe formatting can prevent fixes.
