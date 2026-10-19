# no-redundant-shorthand-values

📝 Disallow redundant values in CSS shorthand properties.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports repeated values and default components that can be omitted from a shorthand without changing its complete expansion, and the autofix removes them.

## Examples

```css
/* ❌ */
.button {
	margin: 1px 1px 1px 1px;
	border-radius: 4px 4px 4px 4px;
	place-items: center center;
	contain-intrinsic-size: auto 100px auto 100px;
	background-repeat: round round;
	corner-shape: bevel scoop notch scoop;
	corner-block-start-shape: squircle squircle;
	border-image-width: 1 1 1 1;
}

/* ✅ */
.button {
	margin: 1px;
	border-radius: 4px;
	place-items: center;
	contain-intrinsic-size: auto 100px;
	background-repeat: round;
	corner-shape: bevel scoop notch;
	corner-block-start-shape: squircle;
	border-image-width: 1;
}
```

```css
/* ❌ */
.example {
	border: 1px solid currentColor;
	font: normal normal 16px/normal sans-serif;
	flex-flow: row nowrap;
	offset: normal path("M0 0L100 100") auto / auto;
}

/* ✅ */
.example {
	border: 1px solid;
	font: 16px sans-serif;
	flex-flow: row;
	offset: path("M0 0L100 100");
}
```

```css
/* ❌ */
.example {
	background: 0% 0% / auto repeat scroll padding-box border-box red;
	animation: 1s ease 0s 1 normal none running slide;
	transition: opacity 1s ease 0s normal;
}

/* ✅ */
.example {
	background: red;
	animation: 1s slide;
	transition: opacity 1s;
}
```

```css
/* ❌ */
.heading {
	text-wrap: wrap balance;
	text-emphasis: filled circle currentcolor;
}

/* ✅ */
.heading {
	text-wrap: balance;
	text-emphasis: filled circle;
}
```

```css
/* ❌ */
.example {
	mask: url("mask.svg") 0% 0% / auto auto repeat add match-source;
	background-repeat: round round, space space;
	mask-repeat: no-repeat no-repeat, round round;
	border-image-repeat: stretch stretch;
}

/* ✅ */
.example {
	mask: url("mask.svg");
	background-repeat: round, space;
	mask-repeat: no-repeat, round;
	border-image-repeat: stretch;
}
```

```css
/* ❌ */
.example {
	container: Card / normal;
	white-space: preserve wrap;
}

/* ✅ */
.example {
	container: Card;
	white-space: preserve;
}
```

```css
/* ❌ */
.example {
	text-box: trim-both cap alphabetic;
	position-try: normal --above, --below;
}

/* ✅ */
.example {
	text-box: cap alphabetic;
	position-try: --above, --below;
}
```

```css
/* ❌ */
.example {
	scroll-timeline: --page block, --sidebar inline;
	view-timeline: --card block auto auto;
}

/* ✅ */
.example {
	scroll-timeline: --page, --sidebar inline;
	view-timeline: --card;
}
```

```css
/* ❌ */
.example {
	flex: 2 1 10px;
	border-image: url("border.svg") 100% / 1 stretch;
}

/* ✅ */
.example {
	flex: 2 10px;
	border-image: url("border.svg");
}
```

```css
/* ❌ */
.table {
	border-spacing: 2px 2px;
}

/* ✅ */
.table {
	border-spacing: 2px;
}
```

```css
/* ❌ */
.card {
	scroll-snap-align: center center;
	interest-delay: 1s 1s;
	border-start-start-radius: 10% 10%;
}

/* ✅ */
.card {
	scroll-snap-align: center;
	interest-delay: 1s;
	border-start-start-radius: 10%;
}
```

These are not reported:

```css
/* ✅ */
.button {
	margin: 1px 2px 3px 2px;
	border-radius: 4px / 4px;
	padding: var(--padding) var(--padding);
}
```

## Repeated values

- Physical edges: `margin`, `padding`, `border-color`, `border-style`, `border-width`, `scroll-margin`, `scroll-padding`, and `inset`.
- Logical edges: the `-block` and `-inline` variants of those properties.
- `gap`, `grid-gap`, `overflow`, `overscroll-behavior`, `border-radius`, and `border-spacing`.
- `scroll-snap-align` and `interest-delay`.
- Individual physical and logical corner radii, such as `border-top-left-radius` and `border-start-start-radius`.
- `place-content`, `place-items`, and `place-self`.
- `contain-intrinsic-size`, including repeated `auto` and size groups.
- `background-repeat` and `mask-repeat`, independently in each comma-separated layer.
- `border-image-repeat`.
- `border-image-slice`, `border-image-width`, and `border-image-outset`. Slice values containing `fill` are retained.
- `corner-shape` and its physical and logical side shorthands, such as `corner-top-shape` and `corner-block-start-shape`.

For `contain-intrinsic-size`, both complete components must match, including `auto`. Values such as `100px auto 100px` are retained because the width and height components differ.

Four-value edge declarations are not reduced to three, because naming every edge can be easier to read, but are still reduced to one or two values. This exception does not apply to `border-radius` or `corner-shape`.

Slash-separated `border-radius` values are shortened independently without removing the slash.

`-webkit-border-radius` without a slash is never shortened to two values, because WebKit and Blink parse `-webkit-border-radius: 1px 2px` as `1px / 2px`.

## Default components

The following unprefixed shorthands also support omitting default components:

| Shorthand | Defaults |
| --- | --- |
| `border` and its physical and logical side shorthands | `medium`, `none`, and `currentcolor`. |
| `border-image` | Source `none`, single slice `100%`, single width `/1`, and repeat `stretch` or `stretch stretch`. `fill` is retained. |
| `outline` | Width `medium` and style `none`. Explicit colors are retained, including `auto`, which is not supported consistently across browsers. |
| `column-rule` | `medium`, `none`, and `currentcolor`. |
| `offset` | Position `normal`, path `none`, rotation `auto`, and anchor `/auto`. Explicit distances and rotation angles are retained, including zeros. |
| `font` | Optional `normal` components, weight `400`, and line height `/normal`. Size and family are required. |
| `flex-flow` | `row` and `nowrap`. |
| `flex` | Grow and shrink factors `1`. Explicit bases are retained. |
| `columns` | Optional `auto` components, including height after `/`. |
| `container` | Type `/normal`. Names are required and retained. |
| `position-try` | Order `normal`. The required fallback list and its ordering are retained. |
| `scroll-timeline` | Axis `block`. Names and list lengths are retained. |
| `view-timeline` | Axis `block` and insets `auto` or `auto auto`. Names and list lengths are retained. |
| `list-style` | Type `disc`, position `outside`, and image `none`. |
| `text-decoration` | Line `none`, style `solid`, color `currentcolor`, and thickness `auto`. |
| `text-emphasis` | Style `none` and color `currentcolor`. The separate `text-emphasis-position` property is preserved. |
| `text-box` | Trimming `trim-both` and edge `auto`. Explicit trimming `none` is retained. |
| `text-wrap` | Mode `wrap` and style `auto`. |
| `white-space` | Collapsing `collapse` and wrapping `wrap`. Legacy keywords such as `normal` and `pre` are retained. |
| `background` | Image `none`, position `0% 0%`, size `auto auto`, repeat `repeat`, attachment `scroll`, origin `padding-box`, clip `border-box`, and color `transparent`. |
| `mask` | Image `none`, position `0% 0%`, size `auto auto`, repeat `repeat`, composite `add`, and mode `match-source`. Origin and clip boxes are retained. |
| `animation` | Duration `auto`, easing `ease`, delay `0s`, iteration count `1`, direction `normal`, fill mode `none`, play state `running`, and name `none`. |
| `transition` | Property `all`, duration and delay `0s`, easing `ease`, and behavior `normal`. |

Equivalent defaults are recognized conservatively, including constant numeric expressions, transparent-black hexadecimal and RGB colors, and `cubic-bezier(.25, .1, .25, 1)` for `ease`. Other color spaces and expressions that cannot be evaluated are retained.

For `text-box`, omitted trimming defaults to `trim-both`, unlike the longhand's initial value `none`. The `normal` alias is retained.

For `flex`, omitted grow and shrink factors are both `1`. Explicit bases are retained, including `0`, `0px`, and `0%`. Factors that prevent a unitless zero from being reassigned are retained.

Timeline axes `x` and `y` are retained because the default `block` axis depends on the writing mode. Explicit zero view insets are retained because `auto` uses `scroll-padding`.

Numeric expressions must have the correct CSS type. For example, a zero-valued time such as `calc(0s)` cannot be omitted as a background position, and unitless `calc(0)` is not a length.

At least one original component is retained in each comma-separated layer. Layers are never merged or removed. Components that disambiguate another value are retained, such as the easing in `animation: 1s ease ease` or the duration in `transition: opacity 0s 1s`.

Explicit animation duration `0s` is retained because omitted duration defaults to `auto`, which can behave differently with scroll timelines. Nondefault values are retained even when they currently have no visible effect, such as a duration in `animation: 1s none`.

## Limitations

- Declarations that cannot be validated are ignored.
- Declarations with functions that may not repeat the same value are ignored: `random()` and the substitution functions (`attr()`, `env()`, `first-valid()`, `ident()`, `if()`, `inherit()`, `random-item()`, `var()`, and custom functions such as `--spacing()`).
- For repeated positional values, other functions are compared without evaluation, and numeric spellings such as `1px` and `1.0px` are kept distinct.
- Default omission is limited to the component grammars listed above. Declarations with unrecognized component syntax are ignored.
- `border-image` declarations with two slashes are ignored. Multiple slice and width values are retained.
- `mask` declarations containing `no-clip` are ignored.
- `flex` declarations containing functions or unitless zeros are ignored because their component assignment can be ambiguous.
- Default components in query conditions such as `@supports`, `@import supports()`, and `@container style()` are retained to preserve the syntax being tested.
- Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.
- The autofix is skipped if it would remove a comment.
