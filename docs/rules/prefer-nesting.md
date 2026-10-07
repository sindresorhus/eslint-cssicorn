# prefer-nesting

📝 Prefer CSS nesting for related rules and selector groups.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer native CSS nesting for repeated parent selectors, conditional overrides, and structural `:is()` and `:where()` groups.

## Examples

Nest shared literal prefixes in selector lists and adjacent rules. Lists may include the parent itself:

```css
/* ❌ */
.card .title, .card .body, .card {
	color: red;
}

/* ✅ */
.card {
	& .title, & .body, & {
		color: red;
	}
}
```

Nest adjacent `@media` and `@layer` blocks containing related rules, including repeated single selectors without a preceding parent rule. A single rule may use the exact parent; `@supports`, `@container`, and `@starting-style` require that exact selector and declarations only:

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

Contextual overrides can include refinements, mix with direct selectors, and occur inside `@media` or `@layer`. The parent must be compound and outside ancestor style rules:

```css
/* ❌ */
.card { color: red; }
.card:hover, .theme .card.active { color: blue; }

/* ✅ */
.card {
	color: red;
	&:hover, .theme &.active { color: blue; }
}
```

Attached groups and suffixes use `&`:

```css
/* ❌ */
.card:is(.foo, #bar)::before {
	content: "test";
}

/* ✅ */
.card {
	&:is(.foo, #bar)::before {
		content: "test";
	}
}
```

Leading and trailing groups also support `>`, `+`, and `~`. Trailing groups after these combinators stay wrapped.

## Specificity

Trailing `:is()` is unwrapped only when its arguments have equal specificity and unwrapping preserves [forgiving selector-list behavior](https://drafts.csswg.org/selectors/#forgiving-selector). Complex arguments and arguments with pseudo-classes, attribute flags, namespace syntax, or invalid IDs stay wrapped.

`:where()` always stays wrapped to preserve zero specificity.

Leading `:is()` groups preserve their maximum specificity, even with mixed arguments. The result can trigger [`no-nesting-with-mixed-specificity`](./no-nesting-with-mixed-specificity.md); disable that rule for intentional mixed-specificity nesting.

## Limitations

Uses literal prefixes or compound contextual parents. Conditional-only discovery requires one identical selector per block; other conditional children must all relate to the parent. Selector-group conversions require one outer selector and at least two arguments.

Skips existing `&`, escaped group names, opaque parent arguments, `@scope`, and files with `@namespace`. Comments, missing semicolons, or unsafe formatting can prevent fixes.
