# require-prefers-reduced-motion

📝 Require motion effects inside prefers-reduced-motion: no-preference media queries.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Require declarations that select potentially moving effects inside `@media (prefers-reduced-motion: no-preference)`.

Start with usable static styles, then enable nonessential movement when the user has not requested reduced motion. This follows the opt-in approach documented in [W3C technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39).

This rule is opt-in because it enforces a particular authoring contract. It reports movement enabled outside the query even if a later `prefers-reduced-motion: reduce` override disables it. It does not establish WCAG compliance or determine whether an effect is essential.

## Examples

```css
/* ❌ */
.card {
	animation: slide-in 300ms;
}

/* ✅ */
@media (prefers-reduced-motion: no-preference) {
	.card {
		animation: slide-in 300ms;
	}
}
```

```css
/* ❌ */
.card {
	transition-property: transform;
	transition-duration: 200ms;
}

/* ✅ */
@media (prefers-reduced-motion: no-preference) {
	.card {
		transition-property: transform;
		transition-duration: 200ms;
	}
}
```

```css
/* ❌ */
html {
	scroll-behavior: smooth;
}

/* ✅ */
@media (prefers-reduced-motion: no-preference) {
	html {
		scroll-behavior: smooth;
	}
}
```

Every alternative in a comma-separated or `or` query must require `no-preference`. A viewport condition or a bare `(prefers-reduced-motion)` does not authorize movement. The latter selects users who request reduced motion.

```css
/* ❌ */
@media (prefers-reduced-motion: no-preference), (min-width: 600px) {
	.card {
		transition: transform 200ms;
	}
}

/* ✅ */
@media (prefers-reduced-motion: no-preference) and (min-width: 600px) {
	.card {
		transition: transform 200ms;
	}
}
```

A qualifying outer query also protects declarations inside nested rules, `@supports`, `@layer`, `@scope`, and additional media queries. Negated equivalents such as `not (prefers-reduced-motion: reduce)` intentionally do not satisfy this explicit opt-in contract.

## Non-motion effects

Static transforms and ordinary positioning or sizing declarations are allowed. Transitions of recognized explicit color and opacity properties are also allowed, even with variable durations. These properties are `color`, `opacity`, and known properties ending in `-color` or `-opacity`.

```css
/* ✅ */
.card {
	transform: translateX(10px);
	transition: background-color var(--duration), opacity 200ms;
}
```

Animations are allowed without a preference query when every same-file definition of their name contains only these properties and, optionally, `animation-timing-function`.

```css
/* ✅ */
@keyframes fade-in {
	from { opacity: 0; }
	to { opacity: 1; }
}

.card {
	animation: fade-in 200ms;
}
```

Other properties are treated conservatively. This includes `filter`, SVG paint properties such as `fill` and `stroke`, custom properties, and shorthands such as `background` and `border`. Use explicit properties such as `background-color` when the effect changes only color.

## Declaration placement

The rule checks `animation`, `animation-name`, `transition`, `transition-property`, `transition-duration`, and `scroll-behavior`, including vendor-prefixed animation and transition properties.

Potentially moving animation names and transition-property selections must be inside the query even when their duration is absent or zero. The rule does not infer whether other selectors currently activate them. A guarded keyframes definition does not exempt an unguarded animation reference.

Complete transition shorthand layers with an omitted or literal zero duration are allowed. A positive delay does not count as a positive duration. Zero-duration animations are still checked because [scroll-driven timelines can reinterpret their duration](https://drafts.csswg.org/css-animations-2/#animation-duration).

A nonzero or unresolved `transition-duration` is checked independently because the initial transition property is `all`. It is exempt when exactly one `transition` or `transition-property` declaration in the same block explicitly selects only non-motion properties or `none`. Duplicate controllers and controllers in other selectors do not establish this exemption.

Standalone animation-duration, delay, easing, iteration, and timeline declarations are not checked: the animation name selection is checked where it is declared. Explicit disabling values and `initial`/`unset` resets are allowed. Inherited and reverted values remain potentially moving.

## Limitations and exceptions

Unknown animation names, imported keyframes, opaque animation or transition values, and unresolved scrolling values require the guard. Custom-property definitions themselves are allowed; the declarations consuming them are checked. The rule does not resolve variables, inspect JavaScript, reconstruct the cascade, or verify distant overrides.

Harmless external fades and other conservative exceptions can use an ESLint disable comment. Essential motion should also use a suppression with a reason:

```css
.motion-preview {
	/* eslint-disable-next-line cssicorn/require-prefers-reduced-motion -- Previewing the selected motion is the purpose of this control. */
	animation: selected-motion 1s;
}
```

Parsing is handled by `@eslint/css`, whose current parser rejects some valid nested media conditions before rules run.

This rule has no automatic fixes or suggestions. Authors must choose usable static fallback styles and intentionally place movement inside the preference query. View transitions, fixed-background parallax, and JavaScript-controlled motion are outside its scope.
