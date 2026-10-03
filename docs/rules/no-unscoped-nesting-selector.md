# no-unscoped-nesting-selector

📝 Disallow unscoped CSS nesting selectors.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The [CSS nesting selector](https://drafts.csswg.org/css-nesting/#nest-selector) (`&`) is valid at the top level, but often indicates misplaced or malformed nested CSS.

This rule reports `&` without an ancestor style rule, `@scope` block, or scoping-root at-rule. By default, the Tailwind CSS v4 at-rules `@utility` and `@custom-variant` are scoping roots. It cannot be autofixed safely.

In an `@scope` prelude, `&` in the start uses the outer context, while `&` in the limit uses the new scope.

## Examples

```css
/* ❌ */
& .item {
	color: red;
}

/* ✅ */
.list {
	& .item {
		color: red;
	}
}
```

## Options

### scopingRootAtRules

Type: `string[]`\
Default: `['utility', 'custom-variant']`

At-rules that provide a scoping root. Names omit `@` and are matched ASCII case-insensitively. The scope continues through grouping at-rules such as `@media`, but stops at `@keyframes`.

The default supports the [Tailwind CSS](https://tailwindcss.com/docs/adding-custom-styles) `@utility` and `@custom-variant` directives:

```css
@utility scrollbar-hidden {
	&::-webkit-scrollbar {
		display: none;
	}
}

@custom-variant theme-midnight {
	&:where([data-theme="midnight"] *) {
		@slot;
	}
}
```

Setting this option replaces the default list. Include the default names to keep them:

```js
{
	scopingRootAtRules: [
		'utility',
		'custom-variant',
		'my-scope',
	],
}
```

Set it to an empty array to only accept style rules and `@scope` blocks:

```js
{
	scopingRootAtRules: [],
}
```
