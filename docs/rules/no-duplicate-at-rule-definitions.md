# no-duplicate-at-rule-definitions

📝 Disallow duplicate named at-rule definitions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports repeated names in `@keyframes`, `@property`, `@counter-style`, and `@position-try` with the same immediate parent, and points to the first definition. Other at-rules, including `@layer`, are ignored.

Later definitions can replace earlier ones; [`@keyframes` blocks](https://www.w3.org/TR/css-animations/#keyframes) do not merge.

Names are compared after decoding CSS escapes, and are case-sensitive, except [predefined counter-style names](https://drafts.csswg.org/css-counter-styles-3/#the-counter-style-rule). At-rule names are ASCII case-insensitive. Different kinds and vendor prefixes are checked separately. Quoted and unquoted keyframe names are equivalent.

There is no autofix because choosing which definition to keep requires author intent.

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

Separate parent blocks are allowed, even with identical conditions or layer names, though the definitions can still override each other:

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

> [!NOTE]
> `@property` is checked regardless of [registration validity](https://www.w3.org/TR/css-properties-values-api-1/#at-property-rule), so intentional fallbacks can be reported. Use a disable comment before the repeated definition:

```css
/* ✅ */
@property --accent { syntax: "*"; inherits: false; }
/* eslint-disable-next-line cssicorn/no-duplicate-at-rule-definitions -- Intentional compatibility fallback. */
@property --accent { syntax: "<color>"; inherits: false; initial-value: red; }
```
