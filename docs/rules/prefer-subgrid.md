# prefer-subgrid

📝 Prefer subgrid over repeated parent grid track definitions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Reports full-span nested grids that repeat parent track definitions and suggests [`subgrid`](https://www.w3.org/TR/css-grid-2/#subgrids) to share those tracks.

There is no autofix because subgrid changes layout, but a suggestion is provided. Review the rendered result: grandchildren affect parent sizing; shared axes use the parent's gaps by default, cannot create implicit tracks, and stretch regardless of size or alignment constraints. See [browser examples](https://web.dev/articles/css-subgrid).

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

Native nesting supports `> .child` and `& > .child`:

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

Checks columns and rows independently when both blocks declare a grid display and matching templates, and the child spans `1 / -1` using the axis shorthand or start and end longhands.

Supports single, unique direct-child selectors in the same block, in either source order, and immediately nested `> child` or `& > child` rules. Shared `@media`, `@supports`, `@container`, `@layer`, and `@scope` wrappers are supported.

Template comparison ignores formatting, comments, and keyword, function, and unit casing; line names remain case-sensitive. Fixed `repeat()`, `minmax()`, `fit-content()`, and arithmetic math functions are supported without evaluating or expanding them.

Suggestions replace only the child template and are omitted if they would remove comments.

## Limitations

No cascade or markup analysis, selector-list matching, or combining declarations across blocks. Templates must match structurally, including numeric spellings.

The rule skips:

- Substitutions such as `var()`, random values, invalid templates, auto-repeat, CSS-wide keywords, `none`, `subgrid`, masonry, and unsupported functions.
- Ambiguous declarations, `all`, `grid`, `grid-template`, `grid-template-areas`, and local `writing-mode`.
- Child blocks declaring `grid-area`, `position`, `contain`, `content-visibility`, `container`, or `container-type`.
- Pseudo-elements, CSS Modules interop, unsupported at-rules, and blocks in `@supports` queries testing `subgrid`, including negated queries.

Use an ESLint disable comment for intentional independent grids or fallbacks. External styles can affect the suggestion.
