# prefer-nesting

📝 Prefer CSS nesting for related rules and selector groups.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer native CSS nesting for repeated parent selectors, conditional overrides, and structural `:is()` and `:where()` groups.

## Examples

Nest shared literal prefixes in selector lists and adjacent rules, including adjacent lists. Grouped parents require equal specificity and every parent/suffix combination:

```css
/* ❌ */
.card .title, .panel .title, .card .body, .panel .body {
	color: red;
}

/* ✅ */
.card, .panel {
	& .title, & .body {
		color: red;
	}
}
```

Nest related rules through `@media` and `@layer` chains, including sibling groups and shared prefixes without a preceding parent rule. The parent can appear in a later conditional block; declaration order is preserved. Paths through `@supports`, `@container`, or `@starting-style` require the exact parent and declarations only:

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

Factor shared compound suffixes and contextual overrides. Contextual overrides inside nested rules require an existing `&` in the parent when the prefix contains combinators:

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

Shared prefixes can begin with `>`, `+`, or `~`:

```css
/* ❌ */
.card {
	> .item { color: red; }
	> .item:hover { color: blue; }
}

/* ✅ */
.card {
	> .item {
		color: red;
		&:hover { color: blue; }
	}
}
```

Attached `:is()` groups use `&` at each nesting level:

```css
/* ❌ */
.card:is(.foo, #bar)::before {
	content: "test";
}

/* ✅ */
.card {
	&.foo, &#bar {
		&::before {
			content: "test";
		}
	}
}
```

Leading and attached groups support existing `&` references, type selectors, ordinary states such as `:hover`, and the `>`, `+`, and `~` combinators. Existing references remain at their original nesting level; only the following suffix is moved.

## Specificity

Trailing `:is()` is unwrapped only when its arguments have equal specificity and unwrapping preserves [forgiving selector-list behavior](https://drafts.csswg.org/selectors/#forgiving-selector). Supported arguments include ordinary states, validated logical and `:nth-*()` functions, single unquoted `:lang()` ranges, case-insensitive attribute matches, and wildcard namespace prefixes. Complex trailing arguments and uncertain selectors stay wrapped.

`:where()` stays intact, including its uncertain branches and existing `&` references. Related grouped parents require equal specificity, including inherited specificity; functional `&` references are allowed only inside intact top-level `:where()` functions. Uncertain functions can remain in a single literal parent. Exact declaration-only conditional overrides preserve mixed parent specificity and pseudo-elements without adding `&`.

Inside nested rules, unprefixed leading groups can expand only when every argument contains `&` or every argument contains none. Complex arguments in these unprefixed groups require a reference in every branch; otherwise the group stays wrapped to preserve ancestor matching.

Leading and attached `:is()` groups preserve their maximum specificity, even with mixed arguments. The result can trigger [`no-nesting-with-mixed-specificity`](./no-nesting-with-mixed-specificity.md); disable that rule for intentional mixed-specificity nesting.

## Limitations

Inferred groups use the first compound as parent, including any leading relative combinator. Conditional discovery follows first-child paths; every moved child must relate to the parent. `:is()` and `:where()` conversions require one outer selector and at least two arguments. Attached groups stay wrapped unless a suffix follows.

Skips ambiguous grouped matches, parser-sensitive type/pseudo-class prefixes, opaque parent arguments, `@scope`, and files with `@namespace`. Suffix and contextual factoring skip selectors beginning with a combinator. Related parent factoring skips ancestor references inside `:host()` or `:host-context()`. Comments, missing semicolons, or unsafe formatting can prevent fixes.

Autofixes target HTML and SVG elements. Other XML namespaces are unsupported.
