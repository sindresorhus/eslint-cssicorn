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

Factor shared compound suffixes and contextual overrides. Nested contextual overrides need an existing `&` in the parent when the prefix contains a combinator:

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

Groups support type selectors, common pseudo-classes, attributes, and the `>`, `+`, and `~` combinators. Existing `&` references keep their original ancestor context.

## Specificity

Trailing `:is()` is unwrapped only when its arguments have equal specificity and unwrapping preserves [forgiving selector-list behavior](https://drafts.csswg.org/selectors/#forgiving-selector). Complex trailing arguments and uncertain selectors stay wrapped.

`:where()` stays wrapped. Related grouped parents require equal specificity, including inherited specificity. Functional `&` references in grouped parents are supported only inside top-level `:where()` functions.

Inside nested rules, groups stay wrapped when expansion could change ancestor matching. Exact declaration-only conditional overrides preserve mixed parent specificity and pseudo-elements without adding `&`.

Leading and attached `:is()` groups preserve their maximum specificity, even with mixed arguments. Both the original mixed `:is()` arguments and the resulting mixed nesting parents can trigger [`no-nesting-with-mixed-specificity`](./no-nesting-with-mixed-specificity.md); disable that rule for intentional mixed specificity.

## Limitations

Inferred groups use the first compound as parent, including a leading combinator. Conditional discovery follows first-child paths; every moved child must relate to the parent. `:is()` and `:where()` conversions require one outer selector and at least two arguments. Attached groups need a following suffix to be unwrapped.

Skips ambiguous grouped matches, parser-sensitive type/pseudo-class prefixes, opaque parent arguments, `@scope`, and files with `@namespace`. Suffix and contextual factoring skip selectors beginning with a combinator. Related parent factoring skips ancestor references inside `:host()` or `:host-context()`. Comments, missing semicolons, or unsafe formatting can prevent fixes.

Autofixes target HTML and SVG elements. Other XML namespaces are unsupported.
