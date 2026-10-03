# lowercase

📝 Enforce lowercase CSS syntax.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

CSS treats property names, at-rule names, units, standard function names, pseudo-class and pseudo-element names, media and container size feature names, known value keywords, and hexadecimal color digits as ASCII case-insensitive. This rule enforces lowercase for all of them with a single convention.

The transform functions that the CSS specifications write in camelCase (`translateX()`, `translateY()`, `translateZ()`, `scaleX()`, `scaleY()`, `scaleZ()`, `rotateX()`, `rotateY()`, `rotateZ()`, `skewX()`, and `skewY()`) must use that casing instead. For example, `TRANSLATEY(0)` and `translatey(0)` are fixed to `translateY(0)`.

The rule uses the CSS grammar to distinguish value keywords from case-sensitive custom identifiers such as animation names, font families, grid names, and counters.

When a declaration contains a substitution such as `var()`, `env()`, `attr()`, or a custom function, the rule leaves its value identifiers unchanged because the substitution can determine whether an identifier is a keyword or a case-sensitive name. Units, function names, and hexadecimal colors outside the substitution are still checked.

## Examples

```css
/* ❌ */
@MEDIA (MIN-WIDTH: 40REM) {
	button:HOVER::BEFORE {
		COLOR: RGB(0 0 0 / 50%);
		border: 1PX SOLID #ABCDEF;
	}
}
```

```css
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
```

```css
/* ✅ */
a {
	transform: translateY(0) translateX(0);
}
```

## Ignored syntax

The rule does not change property names that are not known CSS properties or descriptors, because they can be author-defined. This also means that it does not lowercase a standard property that the CSS grammar does not know yet. The same applies to function names, because non-standard functions, like `myFunc()` from a PostCSS plugin, can be case-sensitive.

Declarations in CSS Modules `:export` and `:import()` blocks are ignored, because JavaScript reads them as exact strings.

Font family names keep their casing, including the non-standard system font names `-apple-system` and `BlinkMacSystemFont`. Generic font families like `sans-serif` and CSS-wide keywords like `inherit` are still lowercased.

The rule does not change custom property names or values (including `@property` initial values), custom functions or at-rules and their contents, other author-defined names beginning with `--`, font feature value names, type selectors, classes, IDs, attribute data, environment variable data, paint worklet arguments, strings, URL payloads, or user data in selector arguments. It also leaves `!important` and encoding strings to their dedicated rules.

The `@charset` encoding signature is left unchanged because its exact initial byte sequence determines whether the browser recognizes it.

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
