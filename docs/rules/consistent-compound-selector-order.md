# consistent-compound-selector-order

📝 Enforce consistent ordering of compound selector components.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports compound selectors whose components are not in this order:

1. Type or universal selector (`button`, `*`, `svg|a`)
2. Nesting selectors (`&`)
3. ID selectors (`#save`)
4. Class selectors (`.button`)
5. Attribute selectors (`[disabled]`)
6. Pseudo-classes (`:hover`, `:not(...)`)

Components of the same kind keep their order. The rule also checks nested rules, at-rules, and the parsed arguments of functional pseudo-classes and pseudo-elements, such as `:is()` and `::slotted()`.

Components from the first pseudo-element on, including legacy forms such as `:before`, are not checked.

The autofix keeps the spelling and formatting of each component. It is skipped when a comment is between the components that it reorders, because the fix would remove the comment.

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

## Limitations

- Compound selectors that contain the CSS Modules pseudo-classes `:local` or `:global`, an unsupported component, or a type selector that is not first are ignored.
- Arguments that are not parsed are ignored, such as those of `::cue()` and of an escaped `:is()`.
