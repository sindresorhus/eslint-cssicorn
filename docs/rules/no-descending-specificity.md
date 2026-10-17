# no-descending-specificity

📝 Disallow lower-specificity selectors from following higher-specificity selectors that set the same property.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports a selector that comes after a more specific selector for the same property, because it assumes that a later rule is meant to override an earlier one.

This rule is not in the recommended configs, because stylesheets often put a specific rule, like `.card .title`, before the general one, like `.title`, on purpose. The specific rule still wins, and the rule cannot tell this apart from a mistake. Enable it if your project orders rules from general to specific.

Two selectors are compared only when they set the exact same property in the same at-rule context, have the same last compound selector (ignoring pseudo-classes), and the later selector is a single compound selector without pseudo-classes. For example, `a:hover` can be compared with a later `a`, but `a.foo` and `a::before` are not compared with `a`.

For a nested `&`, the rule uses the highest specificity of the parent selectors. A later `!important` declaration overrides an earlier normal one, so that pair is not reported. Other combinations of importance are compared.

There is no autofix because moving a rule can change other overrides in the stylesheet.

## Examples

```css
/* ❌ */
#navigation a {
	color: red;
}

a {
	color: blue;
}

/* ✅ */
a {
	color: blue;
}

#navigation a {
	color: red;
}
```

## Limitations

Ambiguous selectors and many complex later selectors are skipped to avoid false positives.

## Related rules

- [`no-nesting-with-mixed-specificity`](./no-nesting-with-mixed-specificity.md)
- [`no-duplicate-selectors`](./no-duplicate-selectors.md)
