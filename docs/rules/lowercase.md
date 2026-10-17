# lowercase

📝 Enforce lowercase CSS syntax.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces lowercase for property names, at-rule names, units, standard function names, pseudo-class and pseudo-element names, media and container size feature names, known value keywords, and hexadecimal color digits, which CSS treats as ASCII case-insensitive.

Transform functions that the CSS specifications write in camelCase (`translateX()`, `translateY()`, `translateZ()`, `scaleX()`, `scaleY()`, `scaleZ()`, `rotateX()`, `rotateY()`, `rotateZ()`, `skewX()`, and `skewY()`) must use that casing, so `TRANSLATEY(0)` and `translatey(0)` are fixed to `translateY(0)`.

The rule uses the CSS grammar to distinguish value keywords from case-sensitive custom identifiers such as animation names, font families, grid names, and counters.

When a declaration contains a substitution such as `var()`, `env()`, `attr()`, or a custom function, its value identifiers are not changed, because the substitution can decide whether an identifier is a keyword or a case-sensitive name. Units, function names, and hexadecimal colors outside the substitution are still checked.

The rule autofixes the casing.

## Examples

```css
/* ❌ */
@MEDIA (MIN-WIDTH: 40REM) {
	button:HOVER::BEFORE {
		COLOR: RGB(0 0 0 / 50%);
		border: 1PX SOLID #ABCDEF;
	}
}

/* ✅ */
@media (min-width: 40rem) {
	button:hover::before {
		color: rgb(0 0 0 / 50%);
		border: 1px solid #abcdef;
	}
}
```

```css
/* ❌ */
a {
	transform: TRANSLATEY(0) translatex(0);
}

/* ✅ */
a {
	transform: translateY(0) translateX(0);
}
```

## Limitations

Property names that are not known CSS properties or descriptors are not changed, because they can be author-defined. This includes standard properties that the CSS grammar does not know yet. The same goes for unknown function names, because non-standard functions, like `myFunc()` from a PostCSS plugin, can be case-sensitive.

Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.

Font family names keep their casing, including the non-standard system font names `-apple-system` and `BlinkMacSystemFont`. Generic font families like `sans-serif` and CSS-wide keywords like `inherit` are still lowercased.

The rule does not change these:

- Custom property names and values, including `@property` initial values
- Custom functions and custom at-rules, and their contents
- Other author-defined names that begin with `--`
- Font feature value names
- Type selectors
- Classes
- IDs
- Attribute data
- Environment variable data
- Paint worklet arguments
- Strings
- URL payloads
- User data in selector arguments

The rule does not change `@charset`, because the browser recognizes it only by its exact initial byte sequence. To enforce the casing of its encoding name, use [`unicorn/text-encoding-identifier-case`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/text-encoding-identifier-case.md).

The rule does not check `!important`. Use [`no-unknown-annotations`](./no-unknown-annotations.md) to report and fix `!IMPORTANT`.

```css
/* ✅ */
linearGradient.Theme#Main[data-mode="DARK"] {
	--ThemeColor: CALC(1PX) #ABCDEF;
	animation-name: FadeIn;
	font-family: Times New Roman, BlinkMacSystemFont, sans-serif;
	background-image: url("IMAGE.PNG#ABC");
}

:export {
	primaryColor: red;
}
```
