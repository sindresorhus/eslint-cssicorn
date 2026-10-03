# consistent-compound-selector-order

📝 Enforce consistent ordering of compound selector components.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Ordering applies to simple selectors within each compound selector. -->

Enforces a consistent order for the components of each compound selector:

1. Type or universal selector (`button`, `*`, `svg|a`)
2. Nesting selectors (`&`)
3. ID selectors (`#save`)
4. Class selectors (`.button`)
5. Attribute selectors (`[disabled]`)
6. Pseudo-classes (`:hover`, `:not(...)`)

Components of the same kind keep their original order. Each compound selector is checked independently, including native nested rules and at-rules such as `@media` and `@scope`.

Selectors inside functional pseudo-classes and pseudo-elements are checked only when the CSS parser exposes them as selector nodes. Arguments kept as raw text, such as those in `::cue(.foo#id)` or an escaped `:is()` name like `:i\73 (.foo#id)`, are not inspected.

Pseudo-elements form a boundary: the rule only orders the components before the first pseudo-element in each compound. It preserves the pseudo-element and everything after it, because `:hover::before` and `::before:hover` target different things. Legacy pseudo-elements such as `:before` receive the same treatment.

Autofixes preserve original casing, escapes, and formatting. When the affected components contain comments, the rule reports the ordering problem without an autofix.

Compounds containing CSS Modules' `:local` or `:global`, unsupported selector nodes, or a type selector in an invalid position are ignored. The rule targets native CSS and does not repair invalid selectors.

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

## References

- [Compound selectors](https://drafts.csswg.org/selectors/#compound)
- [Pseudo-compound selectors](https://drafts.csswg.org/selectors/#pseudo-compound)
- [Nesting selector](https://drafts.csswg.org/css-nesting-1/#nest-selector)
