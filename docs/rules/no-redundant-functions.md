# no-redundant-functions

📝 Disallow redundant function calls and arguments.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

In declarations, including custom properties, this rule reports and fixes redundant function wrappers, default and repeated function arguments, and functions that a keyword can replace. Fixes preserve comments, escapes, whitespace, grouping, typed zeros, signed zeros, and substitution boundaries, and do not enforce formatting.

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

Default arguments are removed, but the whitespace around them is kept:

```css
/* ❌ */
a { transform: translate(10px, 0); }

/* ✅ */
a { transform: translate(10px ); }
```

> [!NOTE]
> The extra spaces are by design. A formatter cleans them up.

Standard `cubic-bezier()` curves become keywords:

```css
/* ❌ */
a { transition: opacity 200ms cubic-bezier(0.25, 0.1, 0.25, 1); }

/* ✅ */
a { transition: opacity 200ms ease; }
```

## Supported simplifications

### Math

Math functions include comparison, rounding, trigonometric, exponential, and sign functions, and `progress()` and `random()`. Sibling-counting functions are `sibling-count()` and `sibling-index()`.

- Remove `calc()` inside a math function, and around a sole math function, sibling-counting function, or `calc-mix()`.
- Remove `calc()` and single-argument `min()` and `max()` in `calc-size()` arguments and in the numeric bounds of `media-progress()` and `container-progress()`. Grouping and the sizing basis are preserved.
- Unwrap `calc()` around a finite nonnegative literal in standard declarations and in supported arguments: filters, transforms, colors, color mixes, gradients, `image-set()`, shapes, rays, grid, easing, view insets, and anchors. The rule validates the containing grammar, and retains unitless zeros and step counts below 2.
- Unwrap single-argument `min()` and `max()` where math is accepted. Elsewhere, replace them with `calc()`.
- Remove equivalent literal or constant arguments of `min()` and `max()`.
- Simplify `clamp()` with `none` bounds or with equivalent literal or constant bounds.
- Unwrap a nested `clamp()` when its bounds are equivalent literals or constants, or when the outer bounds are wider safe integer numbers and the inner bounds strictly increase.
- Collapse `clamp()` to its minimum only when the inputs are finite numeric literals or constants, and dimensions have matching units. Reversed number bounds also collapse when all inputs are finite literals or constants.
- Simplify neutral or dominant infinity bounds and absorbing `NaN` in `min()`, `max()`, and `clamp()` when all inputs are number literals or calculation constants, preserving the selected operand and the calculation context.
- Remove `abs()` around nonnegative number and dimension literals and calculation constants, retaining the calculation context.
- Remove repeated `abs()` and `sign()`, and `abs()` inside `hypot()`, inside the base of an even power, and inside the steps of `round()` and `rem()`. Even exponents must be safe integer literals.
- Unwrap `abs()` around `hypot()`, `exp()`, `acos()`, sibling-counting functions, or `pow()` with an even safe integer literal exponent.
- Unwrap `abs()` around `min()`, `round()` (except in `line-width`), `atan2()`, `sign()`, `pow()`, `sqrt()`, `asin()`, and `atan()` when nonnegative literals, constants, or functions prove a nonnegative result. The same applies to `max()` and `clamp()` with a nonnegative first argument, and to `random()` without a key or step and with a nonnegative minimum.
- The functions that prove a nonnegative result are `abs()`, `hypot()`, `exp()`, `acos()`, sibling-counting functions, and even powers. Bare percentages and negative-zero spellings are retained.
- `hypot()`: Remove literal zero components with matching types and units when at least two nonzero finite literals remain.
- Replace `pow(number, 1)` with `calc(number)` for literals, calculation constants, and math functions with a proven number result.
- `round()`: Omit `nearest`, and number steps of `1` and `-1` (except in `line-width`). Unwrap unit-step rounding of safe integer literals, `sign()`, sibling-counting functions, and nested unit-step rounding, including whole inputs to `abs()`, `min()`, `max()`, and `clamp()`. For safe integer literals (numbers, `px`, `deg`, `s`, `dppx`, and `x`) with a matching nonzero step, unwrap zero, equal magnitudes, and aligned multiples within ±2²⁴.
- `log()`: Remove the outer `abs()` when literal numbers or constants prove that the value and base are at least `1` (or `NaN`).
- `calc-size(calc-size(...), size)`: Remove the outer wrapper, retaining the inner sizing basis and interpolation behavior.
- [`random()`](https://drafts.csswg.org/css-values-5/#random): Omit `auto`. Omit nonpositive literal number and dimension steps, and positive-zero percentage steps, with matching numeric types and units.

Different spellings of the same safe integer, and units that differ only in case or escapes, are equivalent. Types and signed zeros are preserved.

### Default arguments

- `translate()` and `skew()`: Omit a second length or angle that is a positive zero.
- `scale()`: Omit a repeated number or percentage.
- `brightness()`, `contrast()`, `grayscale()`, `invert()`, `opacity()`, `saturate()`, and `sepia()`: Omit `1` and `100%`. Larger literals are retained because they can affect filter interpolation.
- `blur()` and `hue-rotate()`: Omit a positive-zero length or angle.
- `drop-shadow()`: Omit a positive-zero third length and `currentcolor`.
- Modern color functions, including `device-cmyk()`: Omit an absolute alpha of `1` or `100%`. Omit a relative `/ alpha`, which inherits the origin alpha (including a missing alpha). Over-range alpha is retained, so that [`no-clamped-values`](./no-clamped-values.md) can report it.
- [`light-dark()`](https://drafts.csswg.org/css-color-5/#light-dark): Collapse equivalent literal colors, and nested calls with literal inner colors, keeping the branch selected by the outer call. Equivalent colors include safe integer channel spellings and the aliases `rgb()` and `rgba()`, `hsl()` and `hsla()`, and `xyz` and `xyz-d65`.
- [`superellipse()`](https://drafts.csswg.org/css-borders-4/#funcdef-superellipse): Replace literal `0`, `1`, `2`, `-1`, `infinity`, and `-infinity` with corner-shape keywords.
- `counter()`, `counters()`, and their `target-` variants: Omit `decimal`.
- `symbols()`: Omit `symbolic`.
- [Generated content](https://drafts.csswg.org/css-content-3/): Omit `first` in `string()` and `element()`, `text` in `content()`, and `content` in `target-text()`.
- [`anchor-size()`](https://drafts.csswg.org/css-anchor-position-1/#funcdef-anchor-size): Omit matching physical axes in sizing longhands. Logical axes, and axes in inset and margin properties, are retained.
- [`stripes()`](https://drafts.csswg.org/css-images-4/#stripes): Omit `1fr` thicknesses.
- [`image-set()`](https://drafts.csswg.org/css-images-4/#image-set-notation): Omit gradient resolutions of `1x`, `1dppx`, or `96dpi`. External image resolutions are retained because they override image metadata.
- `attr()`: Omit an untyped empty-string fallback, and `raw-string` with a literal string fallback. Fixes preserve [missing-attribute behavior](https://drafts.csswg.org/css-values-5/#attr-notation).
- `circle()` and `ellipse()`: Omit `closest-side`. Omit center positions, but only in `clip-path` and `shape-outside`.
- `polygon()`: Omit `nonzero` and positive-zero rounding.
- `ray()`: Omit `closest-side`.
- `path()` and `shape()`: Omit `nonzero` in `clip-path`, `shape-outside`, `offset-path`, and `offset`. It is retained in SVG geometry and custom properties.
- `inset()`: Condense repeated offsets.
- `inset()`, `rect()`, and `xywh()`: Condense repeated radii, omit equivalent vertical radii, and omit `round` clauses where all values are positive zero.
- [`shape()`](https://drafts.csswg.org/css-shapes/#shape-function): Omit arc `small`, `ccw`, positive-zero rotation, repeated length radii, and default control-point origins (`from origin` with `to`, and `from start` with `by`).
- [`scroll()` and `view()`](https://drafts.csswg.org/scroll-animations-1/#scroll-notation): Omit the default `block` axis.
- `scroll()`: Omit `nearest`.
- `view()`: Omit insets that are all `auto`, and condense repeated insets.

Numeric defaults and repeated values must be literals. Equivalent safe integer spellings match. Transform, filter, and image functions themselves are retained.

### Mixing and gradients

[`color-mix()`, `palette-mix()`, `cross-fade()`, and `calc-mix()`](https://drafts.csswg.org/css-values-5/#mixing) omit these weights:

- Equal default weights.
- A sole `100%` weight.
- The final weight, when all explicit weights total 100%.

`color-mix()` and `calc-mix()` also omit equal weights whose total exceeds 100%.

Only literal integer weights are checked, and `calc-mix()` requires single-token values. The mixing functions themselves are retained. Explicit color spaces are retained because the bundled CSS grammar rejects their omission.

[`dynamic-range-limit-mix()`](https://drafts.csswg.org/css-color-hdr-1/#dynamic-range-limit-mix) with multiple inputs and literal integer weights becomes a keyword when all positive weights contribute the same keyword. Mixes where all weights are zero are retained.

Gradients, `color-mix()`, and `palette-mix()` omit the default `shorter hue` interpolation. Standard and repeating gradients omit these defaults:

- Linear: `to bottom`, `180deg`, `200grad`, and `.5turn`.
- Radial: `farthest-corner`, an implied `circle` or `ellipse`, and center positions.
- Conic: Positive-zero `from` angles and center positions.

Gradients also omit a single first-stop `0%` position and a single last-stop `100%` position, including equivalent conic angles. Double-position stops and transition hints are retained.

### Easing

- `steps()`: Omit `end` and `jump-end`, and replace one-step functions with keywords.
- `cubic-bezier()`: Replace the four standard presets with `ease`, `ease-in`, `ease-out`, or `ease-in-out`. Diagonal curves are retained because browser sampling can differ from `linear`.
- `linear()`: Replace an identity function with two endpoints with `linear`. Omit a single first `0%` position, a single last `100%` position, and uniform literal positions with 2, 4, 8, … intervals.

Easing simplifications only apply to top-level values in `animation`, `transition`, and their timing-function longhands, including vendor-prefixed ones. Custom properties and direct substitutions are excluded.

## Limitations

- The rule ignores at-rule conditions, CSS Modules interop declarations, and unknown or vendor-prefixed functions.
- When a whole function that contains a comment would be replaced, the rule reports it without a fix.
- The rule retains wrappers and arguments that affect typing, clamping, interpolation, metadata, or precision, such as nested `min()` and `max()`, single-argument `hypot()`, `pow(e, value)`, explicit `log()` bases, `alpha()`, `calc()` around anchors, and `abs()` around `mod()` and `rem()`.
- The rule does not evaluate arithmetic, simplify inverse functions, deduplicate expressions, or remove `random()` calls.
- Wrappers within `calc-mix()` arguments and literal `calc()` in `cross-fade()` are retained.
- Gradients are only checked when the bundled CSS grammar matches their first argument. Removing a part from an invalid gradient, like `linear-gradient(180deg red, blue)` without the comma, could make it apply. So gradients with a nested `var()`, a newer color function, or an escaped keyword like `r\65 d` in the first argument are not checked.

## Related rules

- [`prefer-clamp`](./prefer-clamp.md) reports mixed `min()` and `max()` nesting.
- [`no-zero-length-unit`](./no-zero-length-unit.md) reports zero length units outside calculations.
- [`prefer-modern-syntax`](./prefer-modern-syntax.md) enforces modern color syntax and percentage alpha.
- [`no-clamped-values`](./no-clamped-values.md) reports values that browsers clamp, such as over-range alpha.
