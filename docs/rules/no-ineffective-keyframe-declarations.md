# no-ineffective-keyframe-declarations

📝 Disallow ineffective declarations in keyframes.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports declarations inside [`@keyframes`](https://drafts.csswg.org/css-animations-1/#keyframes) that have no effect: animation controls, easing on the final keyframe, and declarations with `!important`.

The autofix removes the declaration. It is skipped when the declaration contains a comment.

## Examples

Animation controls belong on the animated element:

```css
/* ❌ */
@keyframes fade {
	from {
		opacity: 0;
		animation-duration: 2s;
	}

	to {
		opacity: 1;
	}
}

/* ✅ */
@keyframes fade {
	from {
		opacity: 0;
	}

	to {
		opacity: 1;
	}
}
```

Browsers ignore declarations with `!important` inside keyframes:

```css
/* ❌ */
@keyframes fade {
	from {
		opacity: 0 !important;
		transform: scale(0);
	}

	to {
		transform: scale(1);
	}
}

/* ✅ */
@keyframes fade {
	from {
		transform: scale(0);
	}

	to {
		transform: scale(1);
	}
}
```

The easing of the final keyframe is never used, because no keyframe follows it:

```css
/* ❌ */
@keyframes fade {
	from {
		opacity: 0;
	}

	to {
		opacity: 1;
		animation-timing-function: ease-in;
	}
}

/* ✅ */
@keyframes fade {
	from {
		opacity: 0;
	}

	to {
		opacity: 1;
	}
}
```

## Checked properties

The rule reports these animation controls:

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

`!important` is checked on all declarations inside keyframes, including custom properties.

The rule supports `@keyframes` and its `-webkit-`, `-moz-`, and `-o-` variants, escapes, and any ASCII casing.

## Limitations

- The `animation` shorthand is not interpreted.
- Easing on the final keyframe is only checked when all selectors are `from`, `to`, or percentages from `0%` to `100%`, and exactly one block includes `to` or `100%`. [Duplicate terminal blocks](https://drafts.csswg.org/css-animations-2/#keyframes) can make easing affect the animation.
