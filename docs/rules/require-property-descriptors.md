# require-property-descriptors

📝 Require descriptors in CSS `@property` rules.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports CSS [`@property`](https://www.w3.org/TR/css-properties-values-api-1/#at-property-rule) registrations that are missing a mandatory descriptor, because browsers ignore them:

- `syntax` and `inherits` are always required.
- `initial-value` is required unless the syntax string is `"*"`, optionally surrounded by ASCII whitespace. It is checked only when `syntax` is a single string.

There is no autofix because descriptor values require author intent.

## Examples

```css
/* ❌ */
@property --brand {
	syntax: "<color>";
	inherits: false;
}

/* ✅ */
@property --brand {
	syntax: "<color>";
	inherits: false;
	initial-value: rebeccapurple;
}
```

`initial-value` is optional for the universal syntax:

```css
/* ✅ */
@property --brand {
	syntax: "*";
	inherits: false;
}
```

## Limitations

The rule checks only that the descriptors are present, and empty values count. It does not validate values, computational independence, `!important`, property names, or placement.

At-rule and descriptor names are case-insensitive, and CSS escapes are decoded. Only direct declarations count, and the last of duplicated descriptors wins. The rule does not model how browsers recover from invalid values.

## Related rules

- [`css/no-invalid-at-rules`](https://github.com/eslint/css/blob/main/docs/rules/no-invalid-at-rules.md) checks at-rule names, preludes, and descriptor value grammar.
