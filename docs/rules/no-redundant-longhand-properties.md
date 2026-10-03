# no-redundant-longhand-properties

📝 Disallow longhand properties that can be combined into a shorthand.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports longhands that can be combined into one shorthand. It pairs with [`unicorn/no-shorthand-property-overrides`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-shorthand-property-overrides.md), which catches shorthands that override earlier longhands.

Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.

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

The rule skips invalid values, duplicate longhands, mixed `!important` declarations, and values containing `var()`, `random()`, or similar functions. It also skips some ambiguous or inconsistently supported animation, font, column, and list-style values.

Comma-separated values can repeat across shorthand layers, but lists longer than the primary list are skipped. If a shorthand would also reset another property, such as `border-image`, the rule only reports when it can verify that reset is safe.

Autofix requires contiguous declarations with no comments in the replaced text. Otherwise, the rule reports without fixing. If the same block declares the shorthand earlier with the same `!important` flag, the fix replaces that declaration too, so `gap: 0; row-gap: 1px; column-gap: 2px;` becomes `gap: 1px 2px;`. This also removes an earlier shorthand that was meant as a fallback for browsers that do not support the longhand values, like `overflow: hidden` before `overflow-x: clip; overflow-y: clip;`. Disable the rule for that declaration if you need the fallback. It preserves explicit `background-blend-mode` declarations to account for browser differences.

Nested rules and vendor-prefixed declarations split groups. Descriptor blocks such as `@font-face` and vendor-prefixed groups are ignored.

## Options

### `ignoreShorthands`

Type: `string[]`

Default: `[]`

The exact shorthand names to ignore.

```js
export default [
	{
		rules: {
			'cssicorn/no-redundant-longhand-properties': [
				'error',
				{
					ignoreShorthands: [
						'transition',
						'font',
					],
				},
			],
		},
	},
];
```
