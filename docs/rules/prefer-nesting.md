# prefer-nesting

📝 Prefer CSS nesting for related rules and selector groups.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports selectors that can use native CSS nesting: repeated parent selectors, conditional overrides, and structural `:is()` and `:where()` groups. The autofix rewrites them as nested rules.

## Examples

The rule nests shared literal prefixes in selector lists and adjacent rules, including adjacent selector lists. When it groups several parents, such as `.card` and `.panel`, the list must contain every combination of a parent and a suffix:

```css
/* ❌ */
.card .title, .panel .title, .card .body, .panel .body {
	color: red;
}

/* ✅ */
.card, .panel {
	.title, .body {
		color: red;
	}
}
```

Related rules are nested through chains of `@media` and `@layer` rules, including sibling groups and shared prefixes without a preceding parent rule. The parent can also be in a later conditional block, and declaration order is kept. Through `@supports`, `@container`, or `@starting-style`, only declaration-only rules with the exact parent selector are moved:

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

`:is()` and `:where()` groups are nested, also when suffixes or further selectors follow them:

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

Shared compound suffixes, such as `:hover`, are factored out, and so are contextual overrides, which add context before the parent selector:

```css
/* ❌ */
.card {
	color: red;
}
.card:hover, .theme .card.active {
	color: blue;
}

/* ✅ */
.card {
	color: red;
	&:hover, .theme &.active {
		color: blue;
	}
}
```

No contextual override is written when the parent selector contains a combinator, such as `.x .card`. When the parent rule is itself nested and the context contains a combinator, the parent selector must already contain `&`, such as `&.card`.

Shared prefixes can begin with `>`, `+`, or `~`:

```css
/* ❌ */
.card {
	> .item {
		color: red;
	}
	> .item:hover {
		color: blue;
	}
}

/* ✅ */
.card {
	> .item {
		color: red;
		&:hover {
			color: blue;
		}
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

Groups can contain type selectors, common pseudo-classes, attribute selectors, and the `>`, `+`, and `~` combinators. An existing `&` keeps its original ancestor context.

## Specificity

- A trailing `:is()` is unwrapped only when all its arguments have the same specificity and unwrapping keeps the [forgiving selector list behavior](https://drafts.csswg.org/selectors/#forgiving-selector). Complex or uncertain arguments stay wrapped.
- `:where()` always stays wrapped.
- Grouped parents must have the same specificity, including what they inherit through `&`. In grouped parents, `&` inside a pseudo-class function is supported only inside a top-level `:where()`.
- Inside nested rules, a group stays wrapped when expanding it could change which ancestors match.
- A conditional override that repeats the exact parent selector and contains only declarations is nested without `&`, which keeps mixed parent specificity and pseudo-elements.
- Leading and attached `:is()` groups keep the maximum specificity of their arguments. With mixed specificity, the resulting parents can trigger [`no-nesting-with-mixed-specificity`](./no-nesting-with-mixed-specificity.md), so disable that rule when it is intentional.

## Limitations

- A group inferred without a parent rule uses the first compound selector as the parent, including a leading combinator.
- In conditional blocks, the rule follows only the first child of each block, and every moved child must be related to the parent.
- `:is()` and `:where()` are converted only in a single-selector list, and only when they have at least two arguments.
- An attached group, such as `.card:is(.foo, #bar)`, is unwrapped only when a suffix follows it.
- The rule skips ambiguous grouped matches, unparsable nested selectors and parent arguments, `@scope`, and files with `@namespace`.
- Suffix and contextual factoring skip selectors that begin with a combinator.
- Factoring related parents skips `&` inside `:host()` or `:host-context()`.
- Comments, missing semicolons, or unsafe formatting can prevent fixes.
- Autofixes target HTML and SVG elements, not other XML namespaces.
