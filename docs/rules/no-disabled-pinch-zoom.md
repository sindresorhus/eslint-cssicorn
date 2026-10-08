# no-disabled-pinch-zoom

📝 Disallow `touch-action` values that disable browser pinch zoom.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Examples pair explicit zoom restrictions with zoom-permitting values. -->

Pan-only `touch-action` values allow browser panning but disable browser pinch zoom. A carousel reserving one gesture axis can unintentionally prevent users from zooming. The [WHATWG Compatibility Standard](https://compat.spec.whatwg.org/#touch-action) recommends `pan-y pinch-zoom` for this case.

This rule reports `none`, the six pan keywords (`pan-x`, `pan-left`, `pan-right`, `pan-y`, `pan-up`, and `pan-down`), and valid combinations containing one horizontal and one vertical pan keyword. Values such as `auto`, `manipulation`, and combinations containing `pinch-zoom` already permit pinch zoom.

Suggestions add `pinch-zoom` to pan-only values or replace `none` with `pinch-zoom`. There is no automatic fix because changing browser gesture handling can interfere with application-owned gestures. `pinch-zoom` also permits multi-finger panning; replacing `none` still suppresses single-finger browser panning.

## Examples

```css
/* ❌ */
.carousel {
	touch-action: pan-y;
}

/* ✅ */
.carousel {
	touch-action: pan-y pinch-zoom;
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

## Scope

This rule checks each explicit declaration independently, including declarations later overridden by another value. It does not resolve variables, CSS-wide keywords, the cascade, selectors, or JavaScript gesture handlers. Invalid value combinations, custom properties, prefixed properties, feature-query conditions, and CSS Modules `:export`/`:import()` declarations are ignored.

Suggestions permit pinch zoom locally. [Ancestor restrictions can still prevent browser zoom](https://www.w3.org/TR/pointerevents3/#determining-supported-direct-manipulation-behavior), and the rule does not guarantee that zoom is available across the page.

## When not to use it

Drawing tools, maps, and other custom gesture surfaces may intentionally disable browser pinch zoom. Disable this rule for those declarations when the application needs to own the gestures:

```css
.drawing-surface {
	/* eslint-disable-next-line cssicorn/no-disabled-pinch-zoom -- The drawing tool handles these gestures. */
	touch-action: none;
}
```
