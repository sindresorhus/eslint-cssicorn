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

- Only the later animation needs `replace`. Earlier animations may use `replace`, `add`, or `accumulate`.
- Duration, delay, iteration count, play state, and timeline must be established in the same style block. An `animation` shorthand supplies omitted defaults. Longhand-only declarations must establish every required control locally.
- Shorter control lists repeat to match `animation-name`, and excess values are ignored. Source order and `!important` determine the effective declarations.
- Only positive overlap between active intervals after initial application is checked. Literal seconds, milliseconds, finite or fractional iteration counts, `infinite`, and negative delays are supported. Touching intervals do not overlap.
- Finite constant calculations such as `calc(1s + 250ms)` are supported for durations and delays, and unitless calculations such as `calc(3 / 2)` are supported for iteration counts. Calculated negative durations and iteration counts are clamped to zero.
- Both definitions must explicitly set the shared property at `0%` and `100%`, including `from`, `to`, and comma-separated selectors. Missing endpoints can use underlying values, so sparse keyframes are skipped.
- Known property aliases and shorthand longhands are compared. Individual `translate`, `rotate`, and `scale` properties are distinct from `transform`. Logical and physical properties are not mapped to each other.

See [CSS animation composition](https://www.w3.org/TR/css-animations-2/#animation-composition) and [Web Animations effect composition](https://www.w3.org/TR/web-animations-1/#effect-composition) for the stacking behavior.

## Limitations

- Definitions must be unique, unprefixed `@keyframes` directly inside the stylesheet. Duplicate names anywhere in the file, including conditional and prefixed definitions, make a name ambiguous. Definitions inside grouping rules, layers, or scopes are skipped.
- Each style block is analyzed independently. External stylesheets, selector cascade, and animation start times changed by scripts or later style changes are not resolved.
- Active interval boundaries are rounded to the nearest millisecond. Shorter overlaps may be missed.
- Default replacement without explicit `animation-composition` is not reported. The `animation` shorthand does not reset an explicit composition.
- Paused animations, non-document timelines, fill-only overlap, and blocks containing `all`, `animation-delay-start`, `animation-delay-end`, or `animation-trigger` are skipped.
- Animation declarations inside `@starting-style` are skipped because they only establish transition starting values and do not start animations.
- Definitions containing non-important keyframe-level `animation-composition` are skipped. Important keyframe declarations are ignored, as they are by browsers.
- Custom properties, unknown properties, and non-animatable properties are ignored. A candidate property is skipped if a relevant keyframe declaration has a substitution, CSS-wide value, malformed value, or unsupported syntax. Unresolved animation controls and calculations with unsupported units or non-finite results also prevent comparison.

## Related rules

- [no-unknown-animations](no-unknown-animations.md) checks whether referenced keyframes exist.
- [no-ineffective-keyframe-declarations](no-ineffective-keyframe-declarations.md) checks declarations that do not work inside keyframes.
- [no-ineffective-transitions](no-ineffective-transitions.md) checks whether declared properties can transition.
