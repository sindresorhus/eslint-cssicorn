# no-self-referencing-custom-properties

📝 Disallow cyclic dependencies in CSS custom properties.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A custom-property declaration such as `--spacing: calc(var(--spacing) + 1px)` creates a cyclic dependency. It does not increment an inherited value, and using `var(--spacing, 1px)` does not repair the cycle. See the [CSS substitution algorithm](https://drafts.csswg.org/css-values-5/#substitution).

This rule reports direct and indirect dependency cycles in one declaration block, once per declaration in a cycle. It follows literal `var()` references, and evaluates a fallback only when the referenced local value is known to be invalid.

There is no autofix because the intended value or variable is unknown.

References resolve to the winning declaration of each custom property in the block: `!important` takes precedence, and otherwise the last declaration wins. Overridden declarations are also checked for evaluated direct self-references. Properties that only reference a cycle are not reported.

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
}

/* ✅ */
.component {
	--spacing: var(--base-spacing, 1px);
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
	--base: initial;
	--one: var(--base, var(--two));
	--two: var(--one);
}

/* ✅ */
.component {
	--base: 1px;
	--one: var(--base, var(--two));
	--two: var(--one);
}
```

> [!NOTE]
> Unused fallbacks do not create cycles. In the last ✅ example, `--one` and `--two` both resolve to `1px`, so the fallback `var(--two)` is unused. This follows the [current CSS draft](https://drafts.csswg.org/css-variables-2/#using-variables) and its [web-platform tests](https://github.com/web-platform-tests/wpt/blob/master/css/css-variables/variable-cycles.html).

Custom-property names are case-sensitive, so `--spacing: var(--SPACING)` is allowed. The rule ignores strings, comments, URL text, and at-rule preludes.

## Limitations

Each block is analyzed independently. The rule does not detect cycles spanning separate rules or nested blocks, resolve inheritance or the cascade across blocks, or account for registered-property semantics.

Values outside the block and runtime conditions are unknown. The rule does not assume an external reference is missing, so it skips that reference's fallback, and it skips conditional branches inside `if()` and other runtime substitution functions. Some cycles therefore need browser evaluation to detect.

Overlapping cycles are best effort. The rule stops evaluating a declaration after it finds a cycle involving it, so some other cycle members can stay unreported.

Declarations ignored by browsers, such as `!important` declarations in keyframes, are still analyzed.

The rule analyzes literal `var()` references. Dynamic property names such as `var(var(--alias))` are not resolved, and draft [variable units](https://drafts.csswg.org/css-variables-2/#variable-units), such as `1--spacing`, are not analyzed.
