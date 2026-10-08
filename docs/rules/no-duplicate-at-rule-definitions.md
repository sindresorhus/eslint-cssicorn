# no-duplicate-at-rule-definitions

📝 Disallow duplicate named at-rule definitions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- This rule compares named definitions within the same parent. -->

Reports repeated names in `@keyframes`, `@property`, `@counter-style`, and `@position-try` within the same immediate parent in one file. Each repetition points to the first definition. Other at-rules, including `@layer`, are ignored.

Later definitions can replace earlier ones; [`@keyframes` blocks](https://www.w3.org/TR/css-animations/#keyframes) do not merge.

Names are compared after decoding CSS escapes. Definition names are case-sensitive, except [predefined counter-style names](https://drafts.csswg.org/css-counter-styles-3/#the-counter-style-rule), which are ASCII case-insensitive. At-rule names are also ASCII case-insensitive. Different kinds and vendor prefixes are checked separately. Quoted and unquoted keyframe names are equivalent.

No fixes or suggestions are provided because choosing which definition to keep requires author intent.

## Examples

```css
/* ❌ */
@keyframes fade { from { opacity: 0; } }
@keyframes fade { to { opacity: 1; } }

/* ✅ */
@keyframes fade {
	from { opacity: 0; }
	to { opacity: 1; }
}
```

```css
/* ❌ */
@property --accent { syntax: "<color>"; inherits: false; initial-value: red; }
@property --accent { syntax: "<color>"; inherits: false; initial-value: blue; }

/* ✅ */
@property --accent { syntax: "<color>"; inherits: false; initial-value: blue; }
```

Comma-separated `@property` names are checked individually, including repetitions within a list ([editor's draft](https://drafts.css-houdini.org/css-properties-values-api/#at-property-rule)).

```css
/* ❌ */
@property --width, --height { syntax: "*"; inherits: false; }
@property --height { syntax: "*"; inherits: false; }

/* ✅ */
@property --width, --height { syntax: "*"; inherits: false; }
```

> [!NOTE]
> `@property` is checked regardless of [registration validity](https://www.w3.org/TR/css-properties-values-api-1/#at-property-rule), so intentional fallbacks can be reported. Suppress them with `/* eslint-disable-next-line cssicorn/no-duplicate-at-rule-definitions -- Intentional compatibility fallback. */` before the repeated definition.

```css
/* ❌ */
@counter-style upper-roman { system: cyclic; symbols: "*"; }
@counter-style UPPER-ROMAN { system: cyclic; symbols: "•"; }

/* ✅ */
@counter-style upper-roman { system: cyclic; symbols: "•"; }
```

```css
/* ❌ */
@position-try --above { position-area: top; }
@position-try --above { position-area: bottom; }

/* ✅ */
@position-try --above { position-area: top; }
@position-try --below { position-area: bottom; }
```

Separate parent blocks are allowed, even with identical conditions or layer names. These definitions can still override each other in browsers:

```css
/* ✅ */
@media (width > 40rem) {
	@keyframes fade { to { opacity: 1; } }
}

@media (width > 40rem) {
	@keyframes fade { to { opacity: 0.5; } }
}
```

Prefixed and unprefixed keyframes can coexist:

```css
/* ✅ */
@-webkit-keyframes fade { to { opacity: 1; } }
@keyframes fade { to { opacity: 1; } }
```
