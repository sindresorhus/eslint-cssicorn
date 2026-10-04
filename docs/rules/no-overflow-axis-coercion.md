# no-overflow-axis-coercion

📝 Disallow overflow values that are coerced by the other axis.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When one overflow axis is `visible` and the other is `hidden`, `auto`, or `scroll`, the browser computes `visible` to `auto`. The legacy `overlay` alias of `auto` has the same effect.

For example, `overflow-x: hidden; overflow-y: visible` computes to `overflow-x: hidden; overflow-y: auto`. Content does not remain visible outside the vertical edges: it can be clipped and become scrollable. The resulting scroll container can also change how sticky descendants behave, because sticky positioning uses the nearest scrollport.

This rule reports the affected `visible` value and explains both resulting axis values. It checks `overflow`, `overflow-x`/`overflow-y` pairs, and `overflow-block`/`overflow-inline` pairs.

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

The rule requires explicit, known values for both axes within one style block, respecting declaration order, `!important`, and shorthand overrides. It skips mixed physical/logical axes and does not resolve the full cascade or substitutions such as `var()`.

`clip` paired with scrollable values is ignored because its browser behavior is changing. The rule provides no fixes or suggestions because the intended overflow behavior is ambiguous.
