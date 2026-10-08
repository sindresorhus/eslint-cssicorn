# no-redundant-functions

📝 Disallow redundant function calls and arguments.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Simplify redundant function wrappers and arguments without evaluating arithmetic or enforcing formatting.

## Examples

[Math functions](https://drafts.csswg.org/css-values-4/#math) already accept calculations:

```css
/* ❌ */
a { width: min(100%, calc(20rem + 2vw)); }

/* ✅ */
a { width: min(100%, 20rem + 2vw); }
```

Fixes preserve grouping:

```css
/* ❌ */
a { width: calc(2 * calc(20rem + 2vw)); }

/* ✅ */
a { width: calc(2 * (20rem + 2vw)); }
```

## Supported simplifications

### Math

- Remove `calc()` inside math or around a sole math, sibling-counting, or `calc-mix()` function.
- Remove `calc()` and single-argument `min()` / `max()` in `calc-size()` arguments and numeric bounds of `media-progress()` / `container-progress()`; preserve grouping and the sizing basis.
- Unwrap finite nonnegative literal `calc()` in standard declarations and supported arguments: filters/transforms, colors/mixes, gradients, `image-set()`, shapes/rays, grid, easing, view insets, and anchors. Validate the containing grammar; retain unitless zeros and step counts below 2.
- Unwrap single-argument `min()` / `max()` where math is accepted; otherwise use `calc()`.
- Remove equivalent literal or constant `min()` / `max()` arguments.
- Simplify `clamp()` with `none` bounds or equivalent literals/constants; unwrap nested calls with equivalent literal/constant bounds or wider outer safe integer number bounds with strictly increasing inner bounds. Collapsing to the minimum requires finite numeric literals/constants; dimensions must have matching units. Also collapse reversed number bounds when all inputs are finite literals/constants.
- Simplify neutral or dominant infinity bounds and absorbing `NaN` in `min()` / `max()` / `clamp()` when all inputs are number literals or calculation constants. Preserve the selected operand and calculation context.
- Equivalent comparisons match safe integer spellings and unit case/escapes, preserving types and signed zeros.
- Remove `abs()` around nonnegative number/dimension literals and calculation constants, retaining calculation context, and repeated `abs()` / `sign()` and `abs()` inside `hypot()`, an even-power base, or `round()` / `rem()` steps. Even exponents must be safe integer literals.
- Unwrap `abs()` around `hypot()`, `exp()`, `acos()`, sibling-counting functions, or `pow()` with an even safe integer literal exponent.
- Unwrap `abs()` when nonnegative literals, constants, or retained functions prove its result nonnegative: `min()`, `max()` / `clamp()` with a nonnegative first argument, unkeyed/unstepped `random()` with a nonnegative minimum, `round()` (except `line-width`), `atan2()`, `sign()`, `pow()`, `sqrt()`, `asin()`, and `atan()`. Function proofs cover `abs()`, `hypot()`, `exp()`, `acos()`, sibling counts, and even powers. Bare percentages and negative-zero spellings remain.
- `hypot()`: Remove literal zero components with matching types/units when at least two nonzero finite literals remain.
- Replace `pow(number, 1)` with `calc(number)` for literals, calculation constants, and math functions with a proven number result.
- `round()`: Omit `nearest` and number steps `1` / `-1` (except with `line-width`); unwrap unit-step rounding of safe integer literals, `sign()`, sibling counts, and nested unit-step rounding, including whole inputs to `abs()` / `min()` / `max()` / `clamp()`. For safe integer literals (numbers, `px`, `deg`, `s`, `dppx`, `x`) with a matching nonzero step, unwrap zero, equal magnitudes, or aligned multiples within ±2²⁴.
- `log()`: Remove outer `abs()` when literal numbers or constants prove the value and base at least `1` (or `NaN`).
- `calc-size(calc-size(...), size)`: Remove the outer wrapper, retaining the inner sizing basis and interpolation behavior.
- [`random()`](https://drafts.csswg.org/css-values-5/#random): Omit `auto`; omit nonpositive literal number/dimension steps and positive-zero percentage steps with matching numeric types and units.

Math includes comparison, rounding, trigonometric, exponential, sign, `progress()`, and `random()` functions. Sibling-counting means `sibling-count()` / `sibling-index()`. Wrappers within `calc-mix()` arguments and literal `calc()` in `cross-fade()` remain.

### Default arguments

- `translate()` / `skew()`: Omit the second positive-zero length / angle. `scale()`: Omit a repeated number or percentage; equivalent safe integer spellings also match.
- `brightness()`, `contrast()`, `grayscale()`, `invert()`, `opacity()`, `saturate()`, `sepia()`: Omit `1` / `100%`; also omit larger literals in `grayscale()`, `invert()`, `opacity()`, and `sepia()` because they clamp to `1`.
- `blur()` / `hue-rotate()`: Omit positive-zero length / angle. `drop-shadow()`: Omit a positive-zero third length and `currentcolor`.
- Modern color functions, including `device-cmyk()`: Omit absolute literal alpha at or above `1` / `100%` and relative `/ alpha` (inherits origin alpha, including missing alpha).
- [`light-dark()`](https://drafts.csswg.org/css-color-5/#light-dark): Collapse equivalent literal colors (safe integer channels and `rgb()`/`rgba()`, `hsl()`/`hsla()`, `xyz`/`xyz-d65` aliases) and nested calls with literal inner colors, keeping the branch selected by the outer call.
- [`superellipse()`](https://drafts.csswg.org/css-borders-4/#funcdef-superellipse): Replace literal `0`, `1`, `2`, `-1`, `infinity`, and `-infinity` with corner-shape keywords.
- `counter()` / `counters()` and their `target-` variants: Omit `decimal`. `symbols()`: Omit `symbolic`.
- [Generated content](https://drafts.csswg.org/css-content-3/): Omit `first` in `string()` / `element()`, `text` in `content()`, and `content` in `target-text()`.
- [`anchor-size()`](https://drafts.csswg.org/css-anchor-position-1/#funcdef-anchor-size): Omit matching physical axes in sizing longhands; retain logical axes and inset/margin axes.
- [`stripes()`](https://drafts.csswg.org/css-images-4/#stripes): Omit literal `1fr` thicknesses.
- [`image-set()`](https://drafts.csswg.org/css-images-4/#image-set-notation): Omit gradient resolutions of `1x`, `1dppx`, or `96dpi`; retain external image resolutions because they override metadata.
- `attr()`: Omit an untyped empty-string fallback and `raw-string` with a literal string fallback.
- `circle()` / `ellipse()`: Omit `closest-side`; omit center positions in `clip-path` / `shape-outside` only.
- `polygon()`: Omit `nonzero` and positive-zero rounding. `ray()`: Omit `closest-side`.
- `path()` / `shape()`: Omit `nonzero` in `clip-path`, `shape-outside`, `offset-path`, and `offset`; retain it in SVG geometry and custom properties.
- `inset()`: Condense repeated offsets. `inset()` / `rect()` / `xywh()`: Condense repeated radii, omit equivalent literal vertical radii (including safe integer spellings), and omit all-positive-zero `round` clauses.
- [`shape()`](https://drafts.csswg.org/css-shapes/#shape-function): Omit arc `small`, `ccw`, positive-zero rotation, repeated length radii, and default control-point origins (`from origin` with `to`, `from start` with `by`).
- [`scroll()` / `view()`](https://drafts.csswg.org/scroll-animations-1/#scroll-notation): Omit the default `block` axis. `scroll()`: Omit `nearest`. `view()`: Omit all-`auto` insets and condense repeated literal insets.

Numeric defaults and repeated values must be literals; equivalent safe integer spellings match. Transform, filter, and image wrappers remain. Attribute fixes preserve [missing-attribute behavior](https://drafts.csswg.org/css-values-5/#attr-notation).

### Mixing and gradients

[`color-mix()`, `palette-mix()`, `cross-fade()`, and `calc-mix()`](https://drafts.csswg.org/css-values-5/#mixing) omit equal default weights, a sole 100% weight, and the final weight when all explicit weights total 100%. `color-mix()` / `calc-mix()` also omit equal weights whose total exceeds 100%. Only literal integer weights are checked; `calc-mix()` requires single-token values. Mixing wrappers remain. Explicit color spaces remain because the bundled validator rejects their omission.

[`dynamic-range-limit-mix()`](https://drafts.csswg.org/css-color-hdr-1/#dynamic-range-limit-mix) becomes a keyword when all positive weights contribute the same keyword. Requires multiple inputs with literal integer weights; all-zero mixes remain.

Gradients and `color-mix()` / `palette-mix()` omit default `shorter hue` interpolation. Standard and repeating gradients omit these defaults:

- Linear: `to bottom` / `180deg` / `200grad` / `.5turn`.
- Radial: `farthest-corner`, implied `circle` / `ellipse`, and center positions.
- Conic: Positive-zero `from` angles and center positions.

Gradients also omit single first-stop `0%` and last-stop `100%` positions, including equivalent conic angles. Double-position stops and transition hints remain.

### Easing

- Omit `end` / `jump-end` in `steps()`; replace one-step functions with keywords.
- Replace the four standard `cubic-bezier()` presets with `ease`, `ease-in`, `ease-out`, or `ease-in-out`; retain diagonal curves because browser sampling can differ from `linear`.
- Replace identity two-endpoint `linear()` with `linear`; omit single first `0%` / last `100%` positions and uniform literal positions with 2, 4, 8, … intervals.

Easing-specific simplifications require top-level values in `animation`, `transition`, or their timing-function longhands, including vendor prefixes; custom properties and direct substitutions are excluded.

## Autofix limits

- Checks declarations, including custom properties; skips at-rule conditions, CSS Modules interop, and unknown or vendor-prefixed functions.
- Preserves comments, escapes, whitespace, grouping, typed zeros, signed zeros, and substitution boundaries. Commented whole-function replacements are reported without a fix.
- Retains wrappers or arguments that affect typing, clamping, interpolation, metadata, or precision (including nested `min()` / `max()`, single-argument `hypot()`, `pow(e, value)`, explicit `log()` bases, `alpha()`, `calc()` around anchors, and `abs()` around `mod()` / `rem()`). Does not evaluate arithmetic, simplify inverse functions, deduplicate expressions, or remove random calls.

## Related rules

- [`prefer-clamp`](./prefer-clamp.md): Mixed `min()` / `max()` nesting.
- [`no-zero-length-unit`](./no-zero-length-unit.md): Zero length units outside calculations.
- [`prefer-modern-syntax`](./prefer-modern-syntax.md): Modern color syntax and percentage alpha.
