# consistent-layer-order

📝 Enforce consistent ordering of cascade layer statements.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports `@layer` statements that list layers in a different order than the initial order. A layer gets its place in the [layer order](https://drafts.csswg.org/css-cascade-5/#layer-order) where its name first appears, so a later statement cannot reorder existing layers, and a different order is misleading.

The first `@layer` statement in a scope sets its initial order, also with one name, but only when it comes before all other layer declarations and imports in that scope. Later statements do not add names to it. Scopes without an initial order are not checked.

A later statement can list some of the layers and repeat a layer. Only the first occurrence of each layer in a statement counts, also in a dotted name.

## Examples

```css
/* ❌ */
@layer reset, base, theme;
@layer theme, base;

/* ✅ */
@layer reset, base, theme;
@layer base, theme;
```

Nested layers have their own order. Dotted names and reopened blocks share the same scope.

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

`@layer` blocks and named layer imports can appear in any order:

```css
/* ✅ */
@layer reset, base, theme;

@layer theme {}
@layer reset {}
```

A layer block before the first statement prevents an initial order:

```css
/* ✅ */
@layer theme {}
@layer base, theme;
@layer theme, base;
```

So does an earlier declaration inside a conditional at-rule:

```css
/* ✅ */
@media screen {
	@layer theme;
}

/* This scope is unchecked because a layer was already declared. */
@layer base, theme;
@layer theme, base;
```

## Options

### checkUndeclaredLayers

Type: `boolean`\
Default: `false`

When `true`, the rule also reports names in statements, named blocks, and named imports that are not in the initial order of their scope, to catch typos that silently create new layers.

```js
{
	checkUndeclaredLayers: true,
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

Child layers are only checked when their own scope has an initial order, so `@layer theme;` allows `@layer theme.components {}`. Layer names are case-sensitive, and names with equivalent escapes match.

## Autofix

The autofix keeps the spelling and formatting of each name. It is skipped when the statement contains a comment, or a name with a part that is not in an earlier initial order.

There is no autofix for names reported by `checkUndeclaredLayers`, because the intended name is unknown.

## Limitations

- Imported files are not read.
- A statement nested in something other than an `@layer` block, such as `@media`, cannot set the initial order, but it is still checked.
- Each anonymous `@layer {}` block has its own scope, and it is never reported as undeclared.
- Syntax that is not parsed is ignored, such as some escaped spellings of at-rule names and of the `layer()` import function.

## Related rules

- [`css/use-layers`](https://github.com/eslint/css/blob/main/docs/rules/use-layers.md) requires layers, or a naming pattern for them.
