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

The rule resolves declaration order, `!important`, and shorthand overrides within each individual style block. It requires explicit, known values for both axes. It does not combine separate rules or parent and nested blocks, resolve custom properties, or infer values from the full cascade.

A lone declaration such as `overflow-x: hidden` is intentionally ignored, even though an otherwise unset opposite axis defaults to `visible`. Blocks mixing physical and logical overflow longhands, including `overflow` alongside logical longhands, are also ignored because resolving their interaction requires writing-mode context.

Winning CSS-wide keywords, substitution functions, and `all` resets make the affected axes unknown. Invalid literal values do not override earlier valid declarations. Keyframes, descriptor blocks, and CSS Modules `:import`/`:export` blocks are ignored.

The rule does not report `clip` paired with scrollable values. Older browsers compute `clip` to `hidden` in this combination, but the latest specification preserves `clip` to support single-axis scrolling. Browser behavior is transitioning, so this rule focuses on the unchanged `visible`-to-`auto` behavior.

This rule has no autofix or suggestions because the appropriate change depends on whether clipping, scrolling, or visible overflow was intended.

## References

- [CSS Overflow: Overflow properties](https://drafts.csswg.org/css-overflow-3/#overflow-properties)
- [CSS Positioned Layout: Sticky positioning](https://drafts.csswg.org/css-position-3/#sticky-pos)
- [Chrome: Single-axis scroll containers](https://developer.chrome.com/blog/single-axis-scroll-containers-ready-for-testing)
