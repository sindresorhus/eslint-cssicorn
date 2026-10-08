# prefer-light-dark

📝 Prefer `light-dark()` over paired light and dark color declarations.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[The `light-dark()` function](https://drafts.csswg.org/css-color-5/#light-dark) keeps related theme colors together and can remove duplicated declarations and selectors.

This rule provides editor suggestions only. `light-dark()` selects a branch using the element's used color scheme, while `prefers-color-scheme` queries the user's preference. A locally forced scheme can therefore change the result after applying a suggestion. Review suggestions against your theme behavior and browser support requirements.

## Examples

An ordinary style rule immediately followed by a media override with the same serialized selector list:

```css
:root {
	color-scheme: light dark;
}

/* ❌ */
.card {
	color: white;
}

@media (prefers-color-scheme: dark) {
	.card {
		color: black;
	}
}

/* ✅ */
.card {
	color: light-dark(white, black);
}
```

A direct nested media override at the end of a style rule, including a color component in a shorthand:

```css
/* ❌ */
.card {
	color-scheme: light dark;
	border: 1px solid white;

	@media (prefers-color-scheme: dark) {
		border: 1px solid black;
	}
}

/* ✅ */
.card {
	color-scheme: light dark;
	border: 1px solid light-dark(white, black);
}
```

Color-valued custom properties are also supported:

```css
:root {
	color-scheme: light dark;
}

/* ❌ */
.card {
	--surface: white;

	@media (prefers-color-scheme: dark) {
		--surface: black;
	}
}

/* ✅ */
.card {
	--surface: light-dark(white, black);
}
```

> [!IMPORTANT]
> A custom property containing `light-dark()` resolves its color when consumed as a color value, using the consuming element's color scheme. Descendants with a different scheme can therefore render differently from an inherited literal branch color. Custom properties consumed as strings or non-color values may also change behavior.

## Supported patterns

The media query must contain only `(prefers-color-scheme: light)` or `(prefers-color-scheme: dark)`. For adjacent rules, the media block must contain exactly one style rule, and both style blocks must contain only declarations. For the nested form, ordinary declarations must precede a single final media block containing only declarations. Matching can occur inside other style rules and grouping at-rules, preserving their conditions and layers.

The rule requires a literal `color-scheme` declaration supporting both `light` and `dark` in the base rule, or in an unconditional bare `:root` or `html` rule in the same stylesheet. Root rules inside `@layer` blocks count. Either mode order and an optional `only` keyword are accepted. Duplicate or incompatible scheme declarations in participating blocks are skipped. Conflicting unconditional root scheme declarations do not provide root evidence.

This setup is eligibility evidence, not proof of the complete cascade. The rule does not infer setup from other files, HTML, or JavaScript, and never inserts `color-scheme`.

Differing components must be literal named colors, hex colors, or absolute color functions. A custom property's entire value must be one literal color. For ordinary properties, corresponding top-level components must match except for literal colors, and the combined value must pass CSSTree's property grammar. Unchanged components are preserved, including dynamic colors and gradients. Multiple color components can be combined, such as in `border-color` or `box-shadow`. Matching property names are decoded, custom-property case is preserved, and `!important` status must match.

Each convertible override declaration is reported separately. A suggestion replaces its differing base color components and removes that override declaration. Unrelated declarations remain. Empty wrappers are removed only when they contain no comments. Reports involving comments in either paired declaration have no suggestion.

## Limitations

The rule skips separated pairs, two explicit media branches, nested selector overrides, additional media conditions, and gradients requiring internal rewriting. Differing components containing dynamic colors such as `var()` and `currentColor`, system colors, relative colors, or existing `light-dark()` calls are skipped. It also skips duplicate target declarations, overlapping shorthand and longhand declarations, ambiguous logical and physical border declarations, blocks containing vendor-prefixed ordinary declarations, `all` resets, keyframes, descriptor blocks, CSS Modules interop declarations, and unparseable values.

The rule skips `all` even for custom-property pairs because it also resets the required `color-scheme`. Vendor-prefixed ordinary declarations are skipped because their aliases can hide shorthand conflicts.

Equivalent branch colors are ignored on a best-effort basis. Named colors, expanded hex colors, and literal `rgb()`/`rgba()` values are compared in sRGB, normalizing channel units and alpha without rounding. Other absolute functions use conservative comparisons within the same color space. The rule does not perform general color-space conversion, so some equivalent colors may still be reported.

[`no-redundant-functions`](./no-redundant-functions.md) simplifies existing function calls. This rule introduces `light-dark()` suggestions and does not expand that rule's autofix behavior.
