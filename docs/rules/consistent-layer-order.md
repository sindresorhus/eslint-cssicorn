# consistent-layer-order

📝 Enforce consistent ordering of cascade layer statements.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

An initial `@layer` statement establishes the intended sibling order. Later statements cannot reorder existing layers. See [CSS layer ordering](https://drafts.csswg.org/css-cascade-5/#layer-order).

This rule checks later statements against that order in each scope. Subsets and repeated names are allowed; only each sibling's first occurrence counts, including dotted names. Layer blocks and named imports may appear in any order.

The initial statement must precede other layer declarations or imports in its scope and may be nested only in `@layer` blocks. Single-name statements also establish a contract; later statements never extend it. Scopes without a contract are unchecked.

The rule is opt-in because file-local contracts may not suit modular stylesheets.

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

Layer blocks do not need to follow the statement's order:

```css
@layer reset, base, theme;

@layer theme {}
@layer reset {}
```

An earlier conditional declaration also prevents a contract:

```css
@media screen {
	@layer theme;
}

/* This scope is unchecked because a layer was already declared. */
@layer base, theme;
@layer theme, base;
```

## Options

### `checkUndeclaredLayers`

Type: `boolean`\
Default: `false`

Check statements, named blocks, and named imports for names absent from their scope's contract. This catches typos that silently create new layers. By default, undeclared names are ignored.

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

A parent contract permits any child names unless the child scope has its own contract: `@layer theme;` permits `@layer theme.components {}`. Names are case-sensitive; equivalent escapes match.

## Autofix

Fixes reorder names only when every segment belongs to an earlier contract and the statement contains no comments. Original spellings and formatting are preserved. Undeclared names are never fixed.

## Limitations

- Checks only the current file; imported contents are not resolved.
- Grouping rules other than `@layer` cannot establish contracts; their statements are still checked.
- Anonymous blocks have independent scopes and are never undeclared-name errors.
- Ignores layer syntax the parser leaves unparsed, including some escaped at-rule and import-function spellings.

Use [`css/use-layers`](https://github.com/eslint/css/blob/main/docs/rules/use-layers.md) to require layers or a naming pattern.

```css
/* No initial statement: this scope is unchecked. */
@layer theme {}
@layer base {}
```
