# no-redundant-longhand-properties

📝 Disallow longhand properties that can be combined into a shorthand.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports longhands that can be combined into one shorthand, and the autofix replaces them with it.

## Examples

```css
/* ❌ */
div {
	margin-top: 1px;
	margin-right: 2px;
	margin-bottom: 3px;
	margin-left: 4px;
}

/* ✅ */
div {
	margin: 1px 2px 3px 4px;
}
```

If the same block declares the shorthand earlier with the same `!important` flag, the fix replaces that declaration too:

```css
/* ❌ */
div {
	gap: 0;
	row-gap: 1px;
	column-gap: 2px;
}

/* ✅ */
div {
	gap: 1px 2px;
}
```

When the fix merges `background` longhands, it keeps an explicit `background-blend-mode` declaration, because some browsers do not reset it with `background`.

An explicit `animation-composition` declaration is preserved when combining `animation` longhands, because the shorthand does not reset composition.

## Options

### ignoreShorthands

Type: `string[]`\
Default: `[]`

The shorthands to ignore. Only supported shorthands are accepted, as listed in [`rules/shared/css-shorthand-properties.js`](../../rules/shared/css-shorthand-properties.js).

```js
{
	ignoreShorthands: [
		'transition',
		'font',
	],
}
```

## Limitations

- The autofix requires contiguous declarations with no comments in the replaced text, or the rule reports without fixing.
- The fix also removes an earlier shorthand that was meant as a fallback for browsers that do not support the longhand values, like `overflow: hidden` before `overflow-x: clip; overflow-y: clip;`. To keep the fallback, disable the rule for that declaration.
- The rule ignores invalid values, duplicate longhands, mixed `!important` declarations, values containing `var()`, `random()`, or similar functions, and some ambiguous or inconsistently supported animation, font, column, and list-style values.
- `transition` longhands are only combined when `transition-behavior` is `normal`, which the shorthand leaves out. Browsers without `transition-behavior` support drop a `transition` declaration that contains a behavior keyword. Property names `normal` and `allow-discrete` are ignored because the shorthand would interpret them as behavior keywords.
- `text-decoration` longhands are only combined when the style, color, and thickness are initial (`solid`, `currentcolor`, and `auto`), which the shorthand leaves out. Safari before 26.2 drops a `text-decoration` declaration with a style, color, or thickness.
- Comma-separated values can repeat across shorthand layers, but lists longer than the primary list are ignored.
- If a shorthand would also reset another property, such as `border-image`, the rule only reports when it can verify that the reset is safe.
- Nested rules and vendor-prefixed declarations split groups. Descriptor blocks such as `@font-face` and vendor-prefixed groups are ignored.
- Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.

## Related rules

- [`unicorn/no-shorthand-property-overrides`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-shorthand-property-overrides.md) reports shorthands that override earlier longhands.
