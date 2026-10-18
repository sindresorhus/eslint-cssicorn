# prefer-subgrid

📝 Prefer subgrid over repeated parent grid track definitions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports full-span nested grids that repeat their parent's track definition, and suggests sharing those tracks with [`subgrid`](https://www.w3.org/TR/css-grid-2/#subgrids). This expresses the layout relationship without maintaining two sizing definitions.

There is no autofix because subgrid changes layout behavior, but a suggestion is provided. Review the rendered layout after accepting it: grandchildren participate in parent track sizing, gaps behave differently, and subgridded axes cannot create implicit tracks. Dimensions and alignment can also behave differently. See [the browser examples](https://web.dev/articles/css-subgrid).

## Examples

```css
/* ❌ */
.form {
	display: grid;
	grid-template-columns: 20ch 1fr;
}

.form > .section {
	display: grid;
	grid-column: 1 / -1;
	grid-template-columns: 20ch 1fr;
}

/* ✅ */
.form {
	display: grid;
	grid-template-columns: 20ch 1fr;
}

.form > .section {
	display: grid;
	grid-column: 1 / -1;
	grid-template-columns: subgrid;
}
```

Native nesting is supported with `> .child` or `& > .child`:

```css
/* ❌ */
.menu {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));

	> .section {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

/* ✅ */
.menu {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));

	> .section {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: subgrid;
	}
}
```

## Recognition

Both blocks must explicitly declare a grid display: `grid`, `inline-grid`, `block grid`, or `inline grid`. The reversed two-keyword forms `grid block` and `grid inline` are also supported. Columns and rows are checked independently, with one report per matching child axis.

The child must span `1 / -1` through `grid-column` or `grid-row`, or the corresponding start and end longhands. Other numeric placements, named placements, and `span` values are ignored.

Templates must match structurally, ignoring formatting, comments, and keyword, function, and unit casing. Named lines retain their case sensitivity. Fixed `repeat()`, `minmax()`, `fit-content()`, and arithmetic math functions such as `calc()`, `min()`, `max()`, and `clamp()` are supported. Calculations and repetitions are not evaluated or expanded, and different numeric spellings are not equated.

Flat rules must have single selectors in the same containing block. Removing the final `>` and child compound from the child's selector must produce the parent's exact serialized selector. Parent and child rules may appear in either order. Immediately nested direct-child rules are also checked. Pseudo-element targets and duplicate selectors are ignored.

The suggestion replaces only the repeated child template with `subgrid`, retaining placement, gaps, and `!important`. Identical named lines are inherited from the parent. If replacement would remove comments, the rule reports without a suggestion.

## Limitations

The rule ignores:

- Descendant and sibling relationships, selector lists, and relationships requiring nesting-selector resolution.
- Declarations split across blocks, separate conditional wrappers, and external stylesheets. It does not reconstruct the cascade or inspect markup.
- Templates using substitutions such as `var()`, random values, auto-repeat, CSS-wide keywords, `none`, existing `subgrid`, masonry, or invalid values.
- Templates with other functions, such as `container-progress()`, `anchor-size()`, or `calc-size()`, even when nested inside a supported function.
- Pairs with local `all`, `grid`, `grid-template`, `grid-template-areas`, or `writing-mode` declarations.
- Duplicate controlling declarations, mixed placement shorthands and longhands, and child `grid-area` declarations.
- Child blocks declaring `position`, `contain`, `content-visibility`, `container`, or `container-type`, regardless of value. These properties are not evaluated, and some values prevent subgrid. Parent blocks may still declare them.
- Keyframes, descriptor blocks, CSS Modules interop blocks, and unsupported at-rules.
- Blocks inside any `@supports` condition explicitly testing `subgrid`, regardless of polarity.

Pairs inside the same `@media`, `@supports`, `@container`, `@layer`, or `@scope` wrapper are supported. Declarations inside a wrapper nested between the parent and child are not combined with the outer declarations.

Identical templates can intentionally define independent grids. Use an ESLint disable comment for these layouts or compatibility fallbacks that the rule cannot recognize. Styles elsewhere, including writing modes, can affect whether the suggestion is appropriate.

## Related rules

- [`prefer-existing-custom-properties`](./prefer-existing-custom-properties.md) shares configured authored values rather than actual grid tracks.
- [`css/no-invalid-properties`](https://github.com/eslint/css/blob/main/docs/rules/no-invalid-properties.md) validates property names and values.
