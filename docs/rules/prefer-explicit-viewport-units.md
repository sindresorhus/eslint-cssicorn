# prefer-explicit-viewport-units

📝 Prefer explicit viewport units.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`vh` and `vw` use the large viewport, so on mobile, browser controls can obscure content in a `100vh` layout. This rule reports `100vh` and `100vw` in sizing properties, also inside math functions such as `calc()` and `clamp()`, to make the intended viewport explicit. Legacy fallback declarations are also reported, so disable the report when browsers without the configured unit need a fallback.

There is no autofix because the new unit can size the element differently on mobile, but a suggestion is provided. Choose a unit based on the intended design:

- `dvh` and `dvw` fill the visible viewport, but can resize while scrolling.
- `svh` and `svw` keep content clear of browser controls, but can leave unused space.
- `lvh` and `lvw` fill the largest viewport, but browser controls can obscure content.

## Examples

```css
/* ❌ */
.hero {
	min-height: 100vh;
}

/* ✅ */
.hero {
	min-height: 100dvh;
}
```

## Options

### unit

Type: `'dvh' | 'svh' | 'lvh'`\
Default: `'dvh'`

Set the preferred viewport-height unit. The matching viewport-width unit is selected automatically.

```js
{
	unit: 'svh',
}
```

```css
/* ❌ */
.dialog {
	max-height: 100vh;
	width: 100vw;
}

/* ✅ */
.dialog {
	max-height: 100svh;
	width: 100svw;
}
```

## Limitations

Only the value `100`, not other values such as `50vh`, is checked, and only in `width`, `height`, `inline-size`, `block-size`, and their `min-` and `max-` forms. Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.
