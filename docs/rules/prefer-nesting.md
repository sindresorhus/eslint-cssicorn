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

Factor shared compound suffixes and contextual overrides. A literal compound parent can appear anywhere; inside ancestor style rules, contextual overrides require an explicit `&` in the parent:

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

Parsed standard pseudo-classes, including `:host()`, can be retained as parents. Existing `&` references must stay in one retained literal parent. Grouped parents require equal inherited specificity and no functional `&` references.

## Specificity

Trailing `:is()` is unwrapped only when its arguments have equal specificity and unwrapping preserves [forgiving selector-list behavior](https://drafts.csswg.org/selectors/#forgiving-selector). Complex arguments and arguments with pseudo-classes, attribute flags, namespace syntax, or invalid IDs stay wrapped.

`:where()` and uncertain forgiving branches stay wrapped. Exact declaration-only conditional overrides preserve mixed parent specificity and pseudo-elements without adding `&`.

Leading `:is()` groups preserve their maximum specificity, even with mixed arguments. The result can trigger [`no-nesting-with-mixed-specificity`](./no-nesting-with-mixed-specificity.md); disable that rule for intentional mixed-specificity nesting.

## Limitations

Inferred groups use the first compound as parent. Conditional discovery follows first-child paths; every moved child must relate to the parent. `:is()` and `:where()` conversions require one outer selector and at least two arguments.

Skips ambiguous grouped matches, parser-sensitive type/pseudo-class prefixes, opaque parent arguments, `@scope`, and files with `@namespace`. Comments, missing semicolons, or unsafe formatting can prevent fixes.
