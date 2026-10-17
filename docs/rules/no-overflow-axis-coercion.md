# no-overflow-axis-coercion

📝 Disallow overflow values that are coerced by the other axis.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When one overflow axis is `visible` and the other is `hidden`, `auto`, `scroll`, or `overlay` (a legacy alias of `auto`), the browser computes `visible` to `auto`. For example, `overflow-x: hidden; overflow-y: visible` computes to `overflow-x: hidden; overflow-y: auto`, which can clip content, enable scrolling, and change sticky descendants' nearest scrollport.

The rule reports the affected `visible` value and both resulting axis values, in `overflow`, `overflow-x` with `overflow-y`, and `overflow-block` with `overflow-inline`.

There is no autofix because the intended behavior is ambiguous.

## Examples

Make scrolling explicit when it is intended:

```css
/* ❌ */
.card {
	overflow-x: hidden;
	overflow-y: visible;
}

/* ✅ */
.card {
	overflow-x: hidden;
	overflow-y: auto;
}
```

The same applies to the two-value shorthand:

```css
/* ❌ */
.card {
	overflow: visible scroll;
}

/* ✅ */
.card {
	overflow: auto scroll;
}
```

To clip one axis and let content overflow the other, use `clip`:

```css
/* ❌ */
.card {
	overflow: hidden visible;
}

/* ✅ */
.card {
	overflow: clip visible;
}
```

Unlike `hidden`, `clip` forbids programmatic scrolling and does not establish a formatting context (use `display: flow-root` if you need one). With `clip` on one axis and `visible` on the other, `border-radius` does not round the overflow clipping edge.

Logical axes are also checked:

```css
/* ❌ */
.card {
	overflow-block: hidden;
	overflow-inline: visible;
}

/* ✅ */
.card {
	overflow-block: hidden;
	overflow-inline: auto;
}
```

## Limitations

- The rule needs known values for both axes in one style block, and respects declaration order, `!important`, and shorthand overrides.
- It ignores a physical axis paired with a logical axis, substitutions such as `var()`, and the cascade across blocks.
- It ignores `clip` paired with a scrollable value. [CSS Overflow](https://drafts.csswg.org/css-overflow-3/#overflow-control) used to compute such a `clip` to `hidden`, but [now allows](https://github.com/w3c/csswg-drafts/issues/12289) clipping one axis while scrolling the other. Browsers can still follow the old behavior.
