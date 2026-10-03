# prefer-nesting

📝 Prefer CSS nesting over structural uses of `:is()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer native CSS nesting when `:is()` groups selectors at the beginning of a selector or after a descendant combinator at its end. This separates selector groups into parent and child rules without changing which elements match or the declaration order.

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

```css
/* ❌ */
:is(.foo, .bar) a[data-x] {
	color: red;
}

/* ✅ */
.foo, .bar {
	a[data-x] {
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

When arguments contain pseudo-classes, attribute selector flags, or namespace syntax, the fix keeps the `:is()` wrapper. Its [forgiving selector list](https://drafts.csswg.org/selectors/#forgiving-selector) lets valid branches continue matching when another branch is unsupported or invalid. Unwrapping these arguments into a regular selector list could invalidate the entire rule.

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

For a trailing `:is()`, all arguments must have equal specificity. For example, `a :is(.foo, #bar)` is ignored: splitting its arguments into nested selectors would lower the specificity of the `.foo` branch.

A leading `:is()` can have mixed specificity. The nesting selector takes the maximum specificity of its parent selector list, just like `:is()`, so `.foo, #bar { a {} }` preserves the specificity of `:is(.foo, #bar) a {}`. This result is reported by [`no-nesting-with-mixed-specificity`](./no-nesting-with-mixed-specificity.md), which is also enabled in the recommended config. Disable that rule for intentional mixed-specificity nesting if you want to use this transformation.

## Limitations

The rule only checks rules with one selector and at least two compound `:is()` arguments. It ignores complex arguments such as `.foo .bar`, selectors that already contain `&`, single-argument or standalone `:is()`, other pseudo-classes, and patterns such as `a:is(.foo, .bar)`, `a :is(.foo, .bar) b`, or `:is(.foo, .bar) > a`. It does not merge neighboring rules or their generated parent wrappers.

Unrepresentable selectors and files containing `@namespace` are ignored. Pseudo-class names are case-insensitive, and selector escapes are preserved. Escaped `:is()` names are ignored because `@eslint/css` exposes their arguments as raw text rather than parsed selectors.

Autofix preserves declaration order, nested blocks, and line endings. Multiline fixes reuse the existing body indentation. The rule reports without fixing when the rule contains comments or line breaks consumed by CSS escapes, when reindentation could change multiline raw values, or when indentation cannot be inferred safely.

Only standard CSS parsed by `@eslint/css` is supported. Enable this rule when your target browsers support native CSS nesting, or when your build transforms nesting for them.

## Related rules

Stylelint's [`relative-selector-nesting-notation`](https://stylelint.io/user-guide/rules/relative-selector-nesting-notation/) controls explicit versus implicit `&` notation. [`stylelint-use-nesting`](https://github.com/csstools/stylelint-use-nesting) merges neighboring rules into nesting. This rule specifically replaces structural uses of `:is()`.
