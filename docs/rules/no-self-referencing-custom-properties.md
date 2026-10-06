# no-self-referencing-custom-properties

📝 Disallow cyclic dependencies in CSS custom properties.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A custom-property declaration such as `--spacing: calc(var(--spacing) + 1px)` creates a cyclic dependency. It does not increment an inherited value, and using `var(--spacing, 1px)` does not repair the cycle. See the [CSS substitution algorithm](https://drafts.csswg.org/css-values-5/#substitution).

This rule disallows direct and indirect dependency cycles within the same declaration block. It follows literal `var()` references and evaluates a fallback only when the referenced local value is known to be invalid. It reports once per declaration involved in a cycle and does not provide an autofix or suggestion because the intended value or variable is unknown.

The rule resolves references using the winning declaration of each custom property in the block: `!important` declarations take precedence, and the last declaration wins when importance is equal. It also checks overridden declarations for evaluated direct self-references. Properties that merely reference a cycle are not reported as part of that cycle.

> [!NOTE]
> Unused fallbacks do not create cycles. For example, `--base: 1px; --one: var(--base, var(--two)); --two: var(--one)` is allowed because both `--one` and `--two` resolve to `1px`. This follows the [current CSS draft](https://drafts.csswg.org/css-variables-2/#using-variables) and its [web-platform tests](https://github.com/web-platform-tests/wpt/blob/master/css/css-variables/variable-cycles.html).

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

Custom-property names are case-sensitive, so `--spacing: var(--SPACING)` is allowed. The rule ignores strings, comments, URL text, and at-rule preludes. It does not extract CSS from JavaScript.

## Limitations

Each block is analyzed independently. The rule does not detect cycles spanning separate rules or nested blocks, resolve inheritance or the cascade across blocks, or account for registered-property semantics.

Values outside the block and runtime conditions are unknown. The rule does not assume an external reference is missing, so it skips that reference’s fallback. It also skips conditional branches inside `if()` and other runtime substitution functions. Consequently, some cycles require browser evaluation to detect.

Overlapping cycles are detected on a best-effort basis. The rule stops evaluating a declaration after detecting a cycle involving it, so some additional cycle members may remain unreported.

Declarations ignored by browsers, such as `!important` declarations in keyframes, are still analyzed.

The rule analyzes literal `var()` references. Dynamic property names such as `var(var(--alias))` are not resolved, and draft [variable units](https://drafts.csswg.org/css-variables-2/#variable-units), such as `1--spacing`, are not analyzed.
