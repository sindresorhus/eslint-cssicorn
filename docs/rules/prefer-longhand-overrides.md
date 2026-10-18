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

The suggested component can itself be a shorthand, such as `border-color` or `background-position`.

## Matching base styles

The rule compares an override with one earlier base declaration of the same shorthand and importance:

- Separate rules must be siblings in the same containing block. The override selector must preserve the base selector's exact structure and append classes, IDs, attributes, or pseudo-classes to its final compound. For example, `.button:hover` and `.button.active` can override `.button`, but `.primary.button:hover` is not matched with `.button.primary`.
- A directly nested rule must refine the same element with a leading `&`, such as `&:hover` or `&.active`. Descendant selectors such as `& .icon` are not compared with their parent.
- Selector lists are supported when every override selector matches the same unique base rule. For example, `.button, .link` can be the base for `.button:hover, .link:hover`. Separate base rules are not combined, even when their values are identical.

Conditional and layer boundaries are not crossed. Rules inside the same `@media`, `@supports`, `@container`, `@layer`, or `@scope` block can still be compared.

Rules with unsupported selectors and declarations that affect supported shorthands interrupt comparisons with earlier bases. A later supported base can start a new comparison.

Only one component may differ. The replacement must come from the override's explicit values or the shorthand's defined copying and dependent default rules. Independently omitted components are not filled with initial values. The defined `font-synthesis` keyword mappings are expanded to `auto` and `none` longhand values. The rule requires equal item counts for `background`, `background-position`, `mask`, `animation`, `animation-range`, `transition`, `scroll-timeline`, and `view-timeline`. A `position-try` fallback list is treated as one component. Other components are compared structurally without evaluating calculations or converting equivalent colors and units. Recognized keywords are ASCII case-insensitive; custom names remain case-sensitive.

## Limitations

- This rule does not calculate the winning cascade or inspect imports and other stylesheets. Repeating a shorthand can intentionally reset another matching style.
- Ambiguous bases, conflicting declarations of an affected property, `all`, mismatched `!important`, pseudo-elements, vendor-prefixed declarations, and unsupported selector relationships are skipped.
- The legacy `grid-gap` alias is not supported.
- Every `background-position` layer must have exactly two values in horizontal and vertical order, such as `left top` or `10px 20%`. Single values, reversed keywords, and three-value or four-value edge offsets are skipped.
- Ambiguous component assignments are skipped. This includes `font-variant: normal` and `mask` values containing geometry boxes or lengths and percentages that could specify either position or size.
- `grid` and `grid-template` values containing template-area strings or `auto-flow` are skipped. Every `animation-range` item must explicitly specify both its start and end.
- Legacy `white-space` keywords (`normal`, `pre`, `pre-wrap`, and `pre-line`) and `text-box: normal` are skipped.
- CSS-wide keywords, substitution functions such as `var()`, `random()`, invalid or unclassified syntax, system fonts, `flex: none`, `outline` values containing `auto`, and timeline syntax in the `animation` shorthand are skipped.
- Declarations in keyframes, descriptor blocks, and CSS Modules interop blocks are ignored.
- A comment in the replaced declaration prevents the suggestion. Other comments are kept.

## Related rules

- [`no-ineffective-overrides`](./no-ineffective-overrides.md) reports state and conditional overrides blocked by cascade priority.
- [`no-redundant-longhand-properties`](./no-redundant-longhand-properties.md) combines longhands in the same block into a shorthand.
- [`no-redundant-shorthand-values`](./no-redundant-shorthand-values.md) removes repeated values within one shorthand.
- [`prefer-individual-transform-properties`](./prefer-individual-transform-properties.md) suggests individual transform properties so states can change transform components independently.
