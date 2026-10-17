# prefer-nesting

📝 Prefer CSS nesting for structural `:is()` groups and rules extending an existing parent.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer native CSS nesting for structural `:is()` groups and adjacent rules that extend an existing parent selector.

## Examples

Replace structural `:is()` groups when nesting safely provides the same grouping:

```css
/* ❌ */
:is(.card, .panel) .title {
	color: red;
}

/* ✅ */
.card, .panel {
	.title {
		color: red;
	}
}
```

Trailing descendant groups require equal argument specificity:

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

Attached groups with a following suffix can be expanded across multiple autofix passes:

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

Merge an uninterrupted run of following rules into an existing parent:

```css
/* ❌ */
a {
	color: red;
}
a.under {
	color: blue;
}
a.upper {
	color: green;
}

/* ✅ */
a {
	color: red;
	&.under {
		color: blue;
	}
	&.upper {
		color: green;
	}
}
```

Following rules can also add a context before the existing parent selector. Contextual merges require a single compound parent selector outside any ancestor style rule:

```css
/* ❌ */
.button {
	color: black;
}
[data-theme=dark] .button {
	color: white;
}

/* ✅ */
.button {
	color: black;
	[data-theme=dark] & {
		color: white;
	}
}
```

Following `@media` and `@layer` blocks can contain rules extending the existing parent. A parser limitation restricts paths through `@supports`, `@container`, or `@starting-style` to exact parent selectors and declaration-only overrides, although [native CSS permits nested style rules in these blocks](https://drafts.csswg.org/css-nesting/#conditionals):

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
		.title {
			color: blue;
		}
	}
}
```

## Intentionally ignored

The rule does not infer new parents from sibling rules or selector lists, reorder compound selectors to find a parent, or introduce nesting solely to retain `:is()` or `:where()`:

```css
/* ✅ */
a.under { color: red; }
a.upper { color: blue; }

.under a, .upper a { color: red; }

a:is(.under, .upper) { color: red; }
.card :is(.title, #title) { color: red; }
.card :where(.title, .subtitle) { color: red; }
```

Existing-parent merges may retain `:is()` and `:where()` because they combine related rules instead of merely wrapping a standalone selector.

## Specificity and safety

Leading and attached `:is()` groups preserve the arguments' maximum specificity. Trailing descendant groups are expanded only when their arguments have equal specificity. Conversions must preserve [forgiving selector-list behavior](https://drafts.csswg.org/selectors/#forgiving-selector) and ancestor matching; uncertain groups are left unchanged.

Related grouped parents require equal specificity, including inherited specificity, and every parent/suffix combination. Functional `&` references in grouped parents are supported only inside top-level `:where()` functions. Exact declaration-only conditional overrides preserve mixed parent specificity and pseudo-elements without adding `&`. Moved content is appended in its original order.

Mixed `:is()` arguments and their resulting nesting parents can trigger [`no-nesting-with-mixed-specificity`](./no-nesting-with-mixed-specificity.md); disable that rule when mixed specificity is intentional.

## Limitations

Standalone conversions require one outer selector and at least two `:is()` arguments. Attached groups need a following suffix. Complex arguments are supported only for leading groups when expansion preserves ancestor matching. Parent rules inside preceding conditional blocks are not discovered or hoisted.

Skips ambiguous grouped matches, opaque parent arguments, `@scope`, and files with `@namespace`. Related parent matching skips ancestor references inside `:host()` or `:host-context()`. Parser limitations, comments, missing semicolons, or unsafe formatting can prevent fixes.

Autofixes target HTML and SVG elements. Other XML namespaces are unsupported.
