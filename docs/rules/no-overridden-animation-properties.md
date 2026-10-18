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

Compares tracks in one style block. Reports positive active overlap when the later track explicitly uses `replace` and both definitions set the shared property at `0%` and `100%` (`from` and `to`).

Resolves local controls, shorthand defaults, list cycling, source order, and `!important`. Supports fractional or infinite iteration counts, negative delays, and finite constant calculations. Recognizes aliases and supported shorthands, keeping logical and physical properties separate and `transform` distinct from individual transforms.

See [CSS animation composition](https://www.w3.org/TR/css-animations-2/#animation-composition) and [Web Animations effect composition](https://www.w3.org/TR/web-animations-1/#effect-composition) for the stacking behavior.

## Limitations

- Requires unprefixed, top-level `@keyframes` with names unique in the file; external cascade and runtime changes are not resolved.
- Rounds timing to milliseconds, so shorter overlaps may be missed.
- Skips paused tracks, non-document timelines, `@starting-style`, non-important keyframe-level composition, and blocks containing `all`, `animation-delay-start`, `animation-delay-end`, or `animation-trigger`.
- Ignores `!important` keyframe declarations, custom, unknown, or non-animatable properties, and unresolved or invalid values.
