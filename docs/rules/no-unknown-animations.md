# no-unknown-animations

📝 Disallow unknown animations.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports names in `animation` and `animation-name` that match no `@keyframes` in the same file, which silently prevents the animation from running.

There is no autofix because the intended keyframes name is unknown.

## Examples

```css
/* ❌ */
.button {
	animation: fade-in 300ms ease;
}

@keyframes fade-out {
	to {
		opacity: 0;
	}
}

/* ✅ */
.button {
	animation: fade-in 300ms ease;
}

@keyframes fade-in {
	to {
		opacity: 1;
	}
}
```

## Name matching

Names are case-sensitive, and CSS escapes are decoded. Quoted and unquoted names match where both forms are valid.

To reference keyframes named `none`, `default`, or a CSS-wide keyword, quote the name, as CSS requires.

The rule recognizes `@keyframes` and its `-webkit-`, `-moz-`, and `-o-` variants.

## Limitations

- Leave the rule disabled when keyframes are defined in another stylesheet, which is why it is not in the `recommended` config.
- Vendor-prefixed animation properties and CSS Modules interop declarations are ignored.
- Names inside functions such as `var()`, including fallbacks, are ignored, but unambiguous static names outside them are checked.
- Ambiguous shorthands such as `animation: backwards none --fade` may be missed when the CSS lexer interprets `none` as the name and `--fade` as the timeline.
