# no-disabled-pinch-zoom

📝 Disallow `touch-action` values that disable browser pinch zoom.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports `touch-action` values that disable browser pinch zoom: `none`, single pan keywords, and valid pairs of one horizontal and one vertical pan keyword. The [WHATWG Compatibility Standard](https://compat.spec.whatwg.org/#touch-action) recommends `pan-y pinch-zoom` for carousels.

There is no autofix because `pinch-zoom` also permits multi-finger panning and can interfere with custom gestures, but a suggestion is provided. The suggestion adds `pinch-zoom`, or replaces `none` with it. Replacing `none` still blocks single-finger browser panning.

Each declaration is checked, even if it is overridden.

## Examples

```css
/* ❌ */
.carousel {
	touch-action: pan-y;
}

/* ✅ */
.carousel {
	touch-action: pinch-zoom pan-y;
}
```

```css
/* ❌ */
.drag-surface {
	touch-action: none;
}

/* ✅ */
.drag-surface {
	touch-action: pinch-zoom;
}
```

## When not to use it

Disable this rule for drawing tools, maps, or other surfaces that intentionally handle pinch gestures:

```css
/* ✅ */
.drawing-surface {
	/* eslint-disable-next-line cssicorn/no-disabled-pinch-zoom -- The drawing tool handles these gestures. */
	touch-action: none;
}
```

## Limitations

- Variables, CSS-wide keywords, invalid values, custom properties, vendor-prefixed properties, and declarations in query conditions, such as `@supports (touch-action: none)`, are ignored.
- Declarations in CSS Modules `:export` and `:import()` blocks are ignored.
- The suggestion permits zoom on the element, but [ancestors can still restrict it](https://www.w3.org/TR/pointerevents3/#determining-supported-direct-manipulation-behavior). The rule does not resolve the cascade or JavaScript handlers, so it cannot guarantee page zoom.
