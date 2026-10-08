# consistent-compound-selector-order

📝 Enforce consistent ordering of compound selector components.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Orders each compound selector as follows:

1. Type or universal selector (`button`, `*`, `svg|a`)
2. Nesting selectors (`&`)
3. ID selectors (`#save`)
4. Class selectors (`.button`)
5. Attribute selectors (`[disabled]`)
6. Pseudo-classes (`:hover`, `:not(...)`)

Components of the same kind keep their order. Supports nesting, at-rules, and parsed functional pseudo arguments. Unparsed arguments, including `::cue()` and escaped `:is()`, are ignored.

Ordering stops at the first pseudo-element, including legacy forms such as `:before`.

Fixes preserve spelling and formatting; comments in the affected range prevent fixing.

Compounds containing CSS Modules' `:local` or `:global`, unsupported nodes, or misplaced type selectors are ignored.

## Examples

```css
/* ❌ */
[disabled].button#save:hover {}

/* ✅ */
#save.button[disabled]:hover {}
```

```css
/* ❌ */
:is(a, button).button {}

/* ✅ */
.button:is(a, button) {}
```

```css
/* ❌ */
.button {
	:hover& {}
}

/* ✅ */
.button {
	&:hover {}
}
```

```css
/* ❌ */
.button#save::before:hover {}

/* ✅ */
#save.button::before:hover {}
```
