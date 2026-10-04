# consistent-layer-order

📝 Enforce consistent ordering of cascade layer statements.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

An initial `@layer` statement documents the intended order of sibling layers. Later statements cannot reorder layers that have already been declared, so contradicting that statement can hide a mistaken assumption about the cascade. See [CSS layer ordering](https://drafts.csswg.org/css-cascade-5/#layer-order).

This rule checks later statements against the initial statement in each layer scope. Subsets and repeated names are allowed. Layer blocks and named imports may appear in any order.

The initial statement must precede other layer declarations or imports in its scope and must be outside conditional or other grouping rules. A scope without an initial statement is left unchecked. Single-name statements also establish a contract; later statements do not extend it.

This rule is opt-in because a file-local contract may not describe a project's modular stylesheet architecture.

## Examples

```css
/* ❌ */
@layer reset, base, theme;
@layer theme, base;

/* ✅ */
@layer reset, base, theme;
@layer base, theme;
```

Nested layers have their own sibling order. Dotted names and nested blocks refer to the same scope, including when a layer block is reopened.

```css
/* ❌ */
@layer theme.base, theme.components;
@layer theme {
	@layer components, base;
}

/* ✅ */
@layer theme.base, theme.components;
@layer theme {
	@layer base, components;
}
```

Layer blocks do not need to follow the statement's order:

```css
@layer reset, base, theme;

@layer theme {}
@layer reset {}
```

## Options

### `checkUndeclaredLayers`

Type: `boolean`\
Default: `false`

Check names in statements, layer blocks, and named `@import` layers against the initial statement in their sibling scope. This can catch typos that would silently create a new layer. Without this option, names absent from the initial statement are ignored.

```js
{
	'cssicorn/consistent-layer-order': ['error', {checkUndeclaredLayers: true}],
}
```

```css
/* ❌ */
@layer reset, base, theme;
@layer themes {}

/* ✅ */
@layer reset, base, theme;
@layer theme {}
```

A parent contract does not restrict its children's names unless those children also have an initial statement. For example, `@layer theme;` permits `@layer theme.components {}`. Layer names are case-sensitive, and escaped spellings of the same name are equivalent.

## Autofix

Contradictory statements are fixed only when every name segment belongs to a contract established before that statement. The fix preserves the names' original spellings, whitespace, indentation, and line endings. Statements containing comments or names outside those contracts are reported without a fix. Undeclared names are never corrected automatically.

## Limitations

- Only the current file is checked. Imported contents, other stylesheets, and runtime layer creation are not analyzed.
- Statements inside grouping rules, such as `@media`, `@supports`, `@container`, and `@scope`, cannot establish a contract. They can be checked against an existing unconditional contract.
- Each anonymous layer block has an independent scope. Anonymous layers themselves are not reported as undeclared.
- Unsupported parser shapes are ignored, including escaped at-rule or import-function spellings that the parser does not expose as layer nodes. Tolerant parsing of malformed CSS is best effort.

Use [`css/use-layers`](https://github.com/eslint/css/blob/main/docs/rules/use-layers.md) to require layer usage or a naming pattern. This rule does not require layers, an initial ordering statement, or a particular naming convention.

```css
/* No initial statement: this scope is unchecked. */
@layer theme {}
@layer base {}
```
