# no-ineffective-keyframe-declarations

📝 Disallow ineffective declarations in keyframes.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow animation controls, unused terminal easing, and `!important` declarations inside [`@keyframes`](https://drafts.csswg.org/css-animations-1/#keyframes).

Autofix removes the whole declaration unless it contains comments.

## Examples

```css
/* ❌ */
@keyframes fade {
	from {
		animation-duration: 2s;
		opacity: 0 !important;
		transform: scale(0);
	}

	to {
		opacity: 1;
		animation-timing-function: ease-in;
	}
}

/* ✅ */
.element {
	animation: fade 2s;
}

@keyframes fade {
	from {
		transform: scale(0);
		animation-timing-function: ease-in;
	}

	to {
		opacity: 1;
	}
}
```

## Checked properties

The following animation controls belong on the animated element:

- `animation-name`
- `animation-duration`
- `animation-delay`
- `animation-delay-start`
- `animation-delay-end`
- `animation-iteration-count`
- `animation-direction`
- `animation-fill-mode`
- `animation-play-state`
- `animation-timeline`
- `animation-range`
- `animation-range-start`
- `animation-range-end`
- `animation-trigger`

`animation-timing-function` is allowed on initial, intermediate, and mixed keyframes such as `0%, 100%`. `animation-composition` is allowed at every offset.

## Scope

Supports `@keyframes` and its `-webkit-`, `-moz-`, and `-o-` variants, escapes, and ASCII casing. Only the listed animation controls are checked; the `animation` shorthand is not interpreted.

Terminal easing is checked only when all selectors are `from`, `to`, or `0%`–`100%` and exactly one block includes `to` or `100%`. [Duplicate terminal blocks](https://drafts.csswg.org/css-animations-2/#keyframes) can make easing affect the animation.

`!important` is checked on all declarations inside keyframes, including custom properties.
