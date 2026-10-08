# no-duplicate-at-rule-definitions

📝 Disallow duplicate named at-rule definitions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- This rule compares single-name definitions within the same parent. -->

Repeated named definitions often come from copying or merging stylesheets. For example, two same-name [`@keyframes` blocks](https://www.w3.org/TR/css-animations/#keyframes) do not combine their animation tracks; a later definition can replace the earlier one.

This rule reports repeated names in `@keyframes`, `@property`, `@counter-style`, and `@position-try` definitions that share the same immediate parent. Every repetition refers to the first definition's line. Other at-rules, including merging constructs such as `@layer`, are ignored.

At-rule names are ASCII case-insensitive. Definition names are compared case-sensitively after decoding CSS escapes. Quoted and unquoted keyframe names are equivalent. Each at-rule kind is checked independently, and prefixed and unprefixed keyframes are compared separately to allow compatibility declarations.

The rule provides no automatic fixes or suggestions because choosing which definition to keep requires author intent.

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
@property --accent {
	syntax: "<color>";
	inherits: false;
	initial-value: red;
}

@property --accent {
	syntax: "<color>";
	inherits: false;
	initial-value: blue;
}

/* ✅ */
@property --accent {
	syntax: "<color>";
	inherits: false;
	initial-value: blue;
}
```

```css
/* ❌ */
@counter-style markers { system: cyclic; symbols: "•"; }
@counter-style markers { system: cyclic; symbols: "*"; }

/* ✅ */
@counter-style markers { system: cyclic; symbols: "*"; }
```

```css
/* ❌ */
@position-try --above { position-area: top; }
@position-try --above { position-area: bottom; }

/* ✅ */
@position-try --above { position-area: top; }
@position-try --below { position-area: bottom; }
```

Definitions in separate parent blocks are allowed, even when the conditions or layer names are identical:

```css
/* ✅ */
@media (width > 40rem) {
	@keyframes fade { to { opacity: 1; } }
}

@media (width > 40rem) {
	@keyframes fade { to { opacity: 0.5; } }
}
```

Compatibility pairs are allowed, while repeated definitions with the same prefix are reported:

```css
/* ✅ */
@-webkit-keyframes fade { to { opacity: 1; } }
@keyframes fade { to { opacity: 1; } }
```

## Limitations

This is a syntactic check of single-name definitions, not an analysis of browser validity or runtime collisions. Definitions in different parent blocks or files are not compared.

`@property` definitions are checked regardless of descriptor validity. Browsers use the last [valid registration](https://www.w3.org/TR/css-properties-values-api-1/#at-property-rule), so intentional registration fallbacks can be reported. Use an ESLint disable comment for intentional repetitions. Comma-separated registration names introduced in the [current editor's draft](https://drafts.css-houdini.org/css-properties-values-api/#at-property-rule) are outside this rule's single-name contract.

[Predefined counter-style names](https://drafts.csswg.org/css-counter-styles-3/#the-counter-style-rule) have case aliases in browsers. This rule does not resolve those aliases, so `upper-roman` and `UPPER-ROMAN` are not reported as duplicates. Custom counter-style names remain case-sensitive.
