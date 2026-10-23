# prefer-longhand-overrides

📝 Prefer longhand properties when overriding one shorthand component.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports an override that repeats a base shorthand while changing only one component, and suggests declaring that component instead. This keeps states tied to the base styles: changing a button's border width later also updates states that only change its color.

There is no autofix because narrowing a shorthand can change which styles apply, but a suggestion is provided. [Shorthands set all their constituent properties](https://www.w3.org/TR/css-cascade-5/#shorthand), including omitted components and reset-only properties such as `border-image` for `border`. Review other matching styles before applying a suggestion. For example, another matching rule may change the border width; accepting `border-color` preserves that width instead of resetting it.

## Examples

```css
/* ❌ */
.button {
	border: 1px solid red;

	&:hover {
		border: 1px solid blue;
	}
}

/* ✅ */
.button {
	border: 1px solid red;

	&:hover {
		border-color: blue;
	}
}
```

Separate base and state rules are also supported:

```css
/* ❌ */
.label {
	font: 16px / 1.5 sans-serif;
}
.label.active {
	font: bold 16px / 1.5 sans-serif;
}

/* ✅ */
.label {
	font: 16px / 1.5 sans-serif;
}
.label.active {
	font-weight: bold;
}
```

One component can change across several animation or transition items:

```css
/* ❌ */
.loader {
	animation: fade 1s ease, slide 2s linear;

	&:hover {
		animation: fade 2s ease, slide 3s linear;
	}
}

/* ✅ */
.loader {
	animation: fade 1s ease, slide 2s linear;

	&:hover {
		animation-duration: 2s, 3s;
	}
}
```

Background components are checked without changing the other layers:

```css
/* ❌ */
.card {
	background: linear-gradient(red, blue), url("texture.svg") center / cover no-repeat white;

	&:hover {
		background: linear-gradient(red, blue), url("texture.svg") center / cover no-repeat black;
	}
}

/* ✅ */
.card {
	background: linear-gradient(red, blue), url("texture.svg") center / cover no-repeat white;

	&:hover {
		background-color: black;
	}
}
```

## Supported shorthands

- `margin`, `padding`, `inset`, `scroll-margin`, and `scroll-padding`, including their `-block` and `-inline` variants.
- `border`, its physical and logical side and axis shorthands, `border-width`, `border-style`, `border-color`, their `border-block-*` and `border-inline-*` variants, `border-radius`, and `border-image`.
- `gap`, `overflow`, `overscroll-behavior`, `place-content`, `place-items`, and `place-self`.
- `columns`, `column-rule`, `flex`, and `flex-flow`.
- `grid-row`, `grid-column`, `grid-area`, and explicit track forms of `grid` and `grid-template`.
- `list-style`, `mask`, `mask-border`, `outline`, `text-decoration`, and `text-emphasis`.
- `font`, `font-synthesis`, `font-variant`, `background`, `background-position`, `animation`, `animation-range`, and `transition`.
- `text-wrap`, `white-space`, `text-box`, `caret`, `container`, `offset`, and `position-try`.
- `contain-intrinsic-size` and `interest-delay`.
- The speech shorthands `cue`, `pause`, and `rest`.
- `scroll-timeline` and `view-timeline`.
- `corner-shape` and its physical and logical side variants.
- The standardized [`-webkit-text-stroke`](https://compat.spec.whatwg.org/#text-fill-and-stroking) shorthand. Suggestions retain the prefix. Stroke-width keywords (`thin`, `medium`, and `thick`) are skipped.

The suggested component can itself be a shorthand, such as `border-color` or `background-position`.

## Matching base styles

The rule requires one unambiguous earlier declaration of the same shorthand, with matching `!important`, in the same containing block.

Sibling selectors must preserve the ancestor path and extend the final compound, such as `.button` → `.button:hover`. Direct nesting supports same-element refinements such as `&.active`. All selector-list branches must share the same base declaration.

Only one component may change, and its replacement must be explicit or derived from the shorthand. Layered lists need matching item counts. Comparison is structural, with ASCII case-insensitive keywords and case-sensitive custom names.

## Limitations

- No cascade resolution or cross-file matching. Conflicts, `all`, and unsupported selectors can prevent matching. Pseudo-elements are skipped.
- Independently omitted components are not expanded. `background-position` needs explicit horizontal and vertical values; `animation-range` needs explicit endpoints.
- Implicit or ambiguous forms may be skipped, including system fonts, grid template areas, animation timelines, and some `white-space` keywords.
- `grid-gap`, vendor-prefixed shorthands other than `-webkit-text-stroke`, CSS-wide keywords, substitutions, `random()`, and invalid values are skipped.
- Keyframes, descriptor blocks, and CSS Modules interop blocks are ignored. Declaration comments prevent suggestions.
