# no-self-referencing-custom-properties

📝 Disallow cyclic dependencies in CSS custom properties.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A custom-property declaration such as `--spacing: calc(var(--spacing) + 1px)` creates a cyclic dependency. It does not increment an inherited value, and using `var(--spacing, 1px)` does not repair the cycle. See the [CSS specification](https://www.w3.org/TR/css-variables-1/#cycles).

This rule disallows syntactic self-references and indirect dependency cycles within the same declaration block, including references inside fallbacks and conditional functions. It reports once per declaration involved in a cycle and does not provide an autofix or suggestion because the intended value or variable is unknown.

For indirect cycles, the rule uses the winning declaration of each custom property in the block: `!important` declarations take precedence, and the last declaration wins when importance is equal. Direct self-references are reported even in overridden declarations. Properties that merely reference a cycle are not reported as part of that cycle.

> [!NOTE]
> The rule conservatively counts every literal `var()` reference, including unused fallbacks and conditional branches. A reported declaration may still be valid under the [current CSS draft](https://drafts.csswg.org/css-variables-2/#using-variables), which evaluates fallbacks conditionally (see [web-platform tests](https://github.com/web-platform-tests/wpt/blob/master/css/css-variables/variable-cycles.html)).

## Examples

```css
/* ❌ */
.component {
	--spacing: calc(var(--spacing) + 1px);
}

/* ✅ */
.component {
	--spacing: calc(var(--base-spacing) + 1px);
}
```

```css
/* ❌ */
.component {
	--spacing: var(--spacing, 1px);
	--color: var(--theme-color, var(--color));
}

/* ✅ */
.component {
	--spacing: var(--base-spacing, 1px);
	--color: var(--theme-color, black);
}
```

```css
/* ❌ */
.component {
	--one: var(--two);
	--two: var(--one);
}

/* ✅ */
.component {
	--one: var(--two);
	--two: 1px;
}
```

```css
/* ❌ */
.component {
	--base: 1px;
	--one: var(--base, var(--two));
	--two: var(--one);
}

/* ✅ */
.component {
	--base: 1px;
	--one: var(--base, 1px);
	--two: var(--one);
}
```

Custom-property names are case-sensitive, so `--spacing: var(--SPACING)` is allowed. The rule ignores strings, comments, URL text, and at-rule preludes. Literal references inside `if()` conditions are still analyzed. It does not extract CSS from JavaScript.

## Limitations

Each block is analyzed independently. The rule does not detect cycles spanning separate rules or nested blocks, resolve inheritance or the cascade across blocks, or account for registered-property semantics.

The analysis is syntactic, so declarations ignored by browsers, such as `!important` declarations in keyframes, are still analyzed.

The rule analyzes literal `var()` references. Dynamic property names such as `var(var(--alias))` are not resolved, and draft [variable units](https://drafts.csswg.org/css-variables-2/#variable-units), such as `1--spacing`, are not analyzed.
