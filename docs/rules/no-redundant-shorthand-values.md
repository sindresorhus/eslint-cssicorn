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
}

/* ✅ */
.button {
	margin: 1px;
	border-radius: 4px;
	place-items: center;
}
```

```css
/* ❌ */
.example {
	border: 1px solid currentColor;
	font: normal normal 16px/normal sans-serif;
	flex-flow: row nowrap;
}

/* ✅ */
.example {
	border: 1px solid;
	font: 16px sans-serif;
	flex-flow: row;
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
- `gap`, `grid-gap`, `overflow`, `overscroll-behavior`, and `border-radius`.
- `place-content`, `place-items`, and `place-self`.

Four-value edge declarations are not reduced to three, because naming every edge can be easier to read, but are still reduced to one or two values. This exception does not apply to `border-radius`.

Slash-separated `border-radius` values are shortened independently without removing the slash.

`-webkit-border-radius` without a slash is never shortened to two values, because WebKit and Blink parse `-webkit-border-radius: 1px 2px` as `1px / 2px`.

## Default components

The following unprefixed shorthands also support omitting default components:

| Shorthand | Defaults |
| --- | --- |
| `border` and its physical and logical side shorthands | `medium`, `none`, and `currentcolor`. |
| `outline` | Width `medium` and style `none`. Explicit colors are retained, including `auto`, which is not supported consistently across browsers. |
| `column-rule` | `medium`, `none`, and `currentcolor`. |
| `font` | Optional `normal` components, weight `400`, and line height `/normal`. Size and family are required. |
| `flex-flow` | `row` and `nowrap`. |
| `columns` | Optional `auto` components, including height after `/`. |
| `list-style` | Type `disc`, position `outside`, and image `none`. |
| `text-decoration` | Line `none`, style `solid`, color `currentcolor`, and thickness `auto`. |
| `text-emphasis` | Style `none` and color `currentcolor`. The separate `text-emphasis-position` property is preserved. |
| `text-wrap` | Mode `wrap` and style `auto`. |
| `background` | Image `none`, position `0% 0%`, size `auto auto`, repeat `repeat`, attachment `scroll`, origin `padding-box`, clip `border-box`, and color `transparent`. |
| `animation` | Duration `auto`, easing `ease`, delay `0s`, iteration count `1`, direction `normal`, fill mode `none`, play state `running`, and name `none`. |
| `transition` | Property `all`, duration and delay `0s`, easing `ease`, and behavior `normal`. |

Equivalent defaults are recognized conservatively, including constant numeric expressions, transparent-black hexadecimal and RGB colors, and `cubic-bezier(.25, .1, .25, 1)` for `ease`. Other color spaces and expressions that cannot be evaluated are retained.

Numeric expressions must have the correct CSS type. For example, a zero-valued time such as `calc(0s)` cannot be omitted as a background position, and unitless `calc(0)` is not a length.

At least one original component is retained in each comma-separated layer. Layers are never merged or removed. Components that disambiguate another value are retained, such as the easing in `animation: 1s ease ease` or the duration in `transition: opacity 0s 1s`.

Explicit animation duration `0s` is retained because omitted duration defaults to `auto`, which can behave differently with scroll timelines. Nondefault values are retained even when they currently have no visible effect, such as a duration in `animation: 1s none`.

## Limitations

- Declarations that cannot be validated are ignored.
- Declarations with functions that may not repeat the same value are ignored: `random()` and the substitution functions (`attr()`, `env()`, `first-valid()`, `ident()`, `if()`, `inherit()`, `random-item()`, `var()`, and custom functions such as `--spacing()`).
- For repeated positional values, other functions are compared without evaluation, and numeric spellings such as `1px` and `1.0px` are kept distinct.
- Default omission is limited to the component grammars listed above. Declarations with unrecognized component syntax are ignored.
- Default components in query conditions such as `@supports`, `@import supports()`, and `@container style()` are retained to preserve the syntax being tested.
- Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.
- The autofix is skipped if it would remove a comment.
