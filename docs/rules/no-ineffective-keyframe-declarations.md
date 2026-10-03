# no-ineffective-keyframe-declarations

📝 Disallow ineffective declarations in keyframes.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Some declarations inside [`@keyframes`](https://drafts.csswg.org/css-animations-1/#keyframes) have no effect: animation controls belong on the animated element, easing on a final `to` or `100%` keyframe is ignored, and declarations with `!important` are ignored entirely.

This rule reports each ineffective declaration once. Autofix removes the whole declaration and preserves surrounding comments. Declarations containing comments are reported without a fix. Removing only `!important` could activate the declaration and change the animation, so the rule does not do that automatically.

## Examples

```css
/* ❌ */
@keyframes fade {
	from {
		opacity: 0;
		animation-duration: 2s;
	}
}

/* ✅ */
.element {
	animation: fade 2s;
}

@keyframes fade {
	from {
		opacity: 0;
	}
}
```

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
		animation-timing-function: ease-in;
	}

	to {
		opacity: 1;
	}
}
```

```css
/* ❌ */
@keyframes fade {
	from {
		opacity: 0 !important;
		transform: scale(0);
	}
}

/* ✅ */
@keyframes fade {
	from {
		transform: scale(0);
	}
}
```

## Checked properties

The rule checks these animation control properties regardless of their values:

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

This includes draft controls from [CSS Animations 2](https://drafts.csswg.org/css-animations-2/), [Scroll-driven Animations](https://drafts.csswg.org/scroll-animations-1/), and [Animation Triggers](https://drafts.csswg.org/animation-triggers-1/). Unknown or future `animation-*` properties are not inferred from their names.

[`animation-timing-function`](https://drafts.csswg.org/css-animations-1/#timing-functions) remains meaningful on initial and intermediate keyframes. A block with mixed selectors such as `0%, 100%` is allowed because its easing applies at `0%`. [`animation-composition`](https://drafts.csswg.org/css-animations-2/#animation-composition) is allowed at every offset, including `to`.

## Scope

The rule supports standard `@keyframes` and its `-webkit-`, `-moz-`, and `-o-` variants. The animation-property checks only cover unprefixed property names; CSS identifier escapes and ASCII casing are recognized. Custom properties are allowed, but actual `!important` annotations on them are reported too. Strings containing `"!important"` are unaffected.

Easing is checked only when all selectors in the animation are ordinary `from`, `to`, or percentages between `0%` and `100%`. An animation containing named timeline ranges, calculated offsets, or unfamiliar selectors skips the easing check entirely. Its animation control properties and `!important` declarations are still checked.

Easing is also skipped when multiple keyframe blocks include `to` or `100%`, including blocks with mixed selectors. Easing can affect how these [duplicate keyframes are combined](https://drafts.csswg.org/css-animations-2/#keyframes), so removing it can change the animation. Repeated selectors within a single block, such as `100%, to`, do not trigger this exception.

The rule does not interpret the `animation` shorthand, detect every nonanimatable property, or extract CSS from JavaScript or HTML. It has no options.

The `!important` check overlaps with [`css/no-important`](https://github.com/eslint/css/blob/main/docs/rules/no-important.md) and Stylelint's [`keyframe-declaration-no-important`](https://stylelint.io/user-guide/rules/keyframe-declaration-no-important/). This rule allows `!important` outside keyframes.
