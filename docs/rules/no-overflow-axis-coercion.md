# no-overflow-axis-coercion

📝 Disallow overflow values that are coerced by the other axis.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When one overflow axis is `visible` and the other is `hidden`, `auto`, or `scroll`, the browser computes `visible` to `auto`. The legacy `overlay` alias of `auto` has the same effect.

For example, `overflow-x: hidden; overflow-y: visible` computes to `overflow-x: hidden; overflow-y: auto`. This can clip content, enable scrolling, and change sticky descendants' nearest scrollport.

The rule reports the affected `visible` value and both resulting axis values. It checks `overflow`, `overflow-x`/`overflow-y`, and `overflow-block`/`overflow-inline`.

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

The same interaction applies to the two-value shorthand:

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

Use `clip` with `visible` when you intend to clip one axis while letting content overflow the other:

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

Unlike `hidden`, `clip` forbids programmatic scrolling and does not establish a formatting context. If you also need a formatting context, consider `display: flow-root`.

With `clip` on one axis and `visible` on the other, `border-radius` does not round the overflow clipping edge.

Logical overflow axes are supported too:

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

- Requires known values for both axes in one style block; respects declaration order, `!important`, and shorthand overrides.
- Skips mixed physical/logical axes, substitutions such as `var()`, and cascade resolution across blocks.
- Ignores `clip` paired with scrollable values because browser behavior is changing.

No fixes or suggestions are offered because the intended behavior is ambiguous.
