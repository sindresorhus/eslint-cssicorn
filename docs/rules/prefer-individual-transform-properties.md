# prefer-individual-transform-properties

📝 Prefer individual transform properties over transform functions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer individual `translate`, `rotate`, and `scale` properties so states can change one component without repeating a whole `transform` list. This rule offers suggestions because conversion can change behavior. Review related styles, transitions, animations, and scripts before applying them.

## Examples

After converting both declarations, remove the repeated hover translation so the hover state only changes scale.

```css
/* ❌ */
.button {
	transform: translateY(-2px);

	&:hover {
		transform: translateY(-2px) scale(1.05);
	}
}

/* ✅ */
.button {
	translate: 0 -2px;

	&:hover {
		scale: 1.05;
	}
}
```

```css
/* ❌ */
.card {
	transform: translate3d(10px, 20px, 30px) rotateX(45deg) scale(2) !important;
}

/* ✅ */
.card {
	translate: 10px 20px 30px !important;
	rotate: x 45deg !important;
	scale: 2 !important;
}
```

## Checked declarations

The rule checks single functions and lists with at most one translation, one rotation, and one scale, in that order, including 3D forms.

It ignores other transform types, repeated or reordered operations, values containing substitutions (such as `var()`) or `random()`, and blocks with fallback transforms, individual transform properties, or motion paths. Keyframes, vendor-prefixed declarations, and CSS Modules `:export`/`:import()` blocks are also ignored.

Declarations containing comments are reported without suggestions.

See [CSS individual transform properties](https://web.dev/articles/css-individual-transform-properties) and the [CSS Transforms Level 2 specification](https://drafts.csswg.org/css-transforms-2/#individual-transforms).
