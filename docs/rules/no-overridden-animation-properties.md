# no-overridden-animation-properties

📝 Disallow properties overridden by overlapping animations.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports properties replaced by a later animation during overlapping active intervals. For example, two animations can work separately but fail to combine because both animate `transform` and the later effect replaces the earlier effect.

Earlier and later refer to positions in the `animation-name` list, regardless of when each animation starts.

Only locally explicit `animation-composition: replace` is checked. Replacement can be intentional; use an ESLint disable comment for those cases. This rule does not prove that an entire animation is ineffective.

There is no autofix because changing composition or combining property values changes the animation's behavior.

## Examples

```css
/* ❌ */
@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

@keyframes bounce {
	from { transform: translateY(0); }
	to { transform: translateY(10px); }
}

.icon {
	animation: spin 1s infinite, bounce 1s infinite;
	animation-composition: replace;
}
```

```css
/* ✅ */
@keyframes spin {
	from { rotate: 0deg; }
	to { rotate: 360deg; }
}

@keyframes bounce {
	from { translate: 0 0; }
	to { translate: 0 10px; }
}

.icon {
	animation: spin 1s infinite, bounce 1s infinite;
	animation-composition: replace;
}
```

The individual transform properties above can express independent rotation and translation. With the original `transform` keyframes, `animation-composition: replace, add` combines `bounce` with `spin` instead of replacing it. Transform order matters, so choose properties and composition based on the intended result; they are not interchangeable for every transform sequence.

## Detection

- Requires explicit `replace` on the later track. Earlier tracks may use any composition; the `animation` shorthand preserves composition.
- Names, duration, delay, iteration count, play state, and timeline must resolve in the same style block. The shorthand supplies defaults; control lists repeat or truncate to match `animation-name`. Source order and `!important` apply.
- Checks positive active overlap after initial application, excluding touching intervals and fill-only overlap.
- Supports `s`, `ms`, negative delays, fractional or infinite iteration counts, and finite constant calculations. Calculated negative durations and counts become zero.
- Both definitions must explicitly set the shared property at `0%` and `100%`, including `from`, `to`, and comma-separated selectors.
- Expands known aliases and supported shorthands. Keeps `transform` separate from individual transform properties, and logical properties separate from physical properties.

See [CSS animation composition](https://www.w3.org/TR/css-animations-2/#animation-composition) and [Web Animations effect composition](https://www.w3.org/TR/web-animations-1/#effect-composition) for the stacking behavior.

## Limitations

- Only unique, unprefixed, top-level `@keyframes` are resolved. Duplicate names anywhere, including conditional and prefixed definitions, are ambiguous.
- External cascade and runtime history are not inferred. Interval boundaries round to the nearest millisecond, so shorter overlaps may be missed.
- Skips paused tracks, non-document timelines, `@starting-style`, and blocks containing `all`, `animation-delay-start`, `animation-delay-end`, or `animation-trigger`.
- Ignores `!important` keyframe declarations; otherwise, keyframe-level `animation-composition` skips the definition.
- Ignores custom, unknown, and non-animatable properties. Skips properties with unresolved keyframe values and comparisons with unresolved controls, including substitutions, CSS-wide values, invalid syntax, or unsupported or non-finite calculations.

## Related rules

- [no-unknown-animations](no-unknown-animations.md) checks whether referenced keyframes exist.
- [no-ineffective-keyframe-declarations](no-ineffective-keyframe-declarations.md) checks declarations that do not work inside keyframes.
- [no-ineffective-transitions](no-ineffective-transitions.md) checks whether declared properties can transition.
