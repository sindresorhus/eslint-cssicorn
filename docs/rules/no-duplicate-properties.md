# no-duplicate-properties

📝 Disallow duplicate properties within CSS declaration blocks.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Duplicate properties in the same CSS declaration block can override one another or hide editing mistakes.

This rule checks both ordinary and custom properties. Ordinary property names are compared ASCII case-insensitively, while custom property names are case-sensitive. CSS escapes are decoded before comparison.

A duplicate that directly follows a declaration of the same property with a different value is allowed (except for custom properties), since this is the common way to write fallbacks for browsers that do not support the later value. Chains of fallbacks are also allowed. Comments between the declarations do not matter.

These duplicates are still reported:

- A duplicate with the same value as the declaration directly before it. Insignificant whitespace is ignored, but values are compared case-sensitively, so `color: red; color: RED;` counts as a fallback.
- A duplicate with another declaration, nested rule, or at-rule between it and the earlier declaration.
- A duplicate where only one of the two declarations has `!important`.
- A duplicate custom property, even with a different value. Custom properties accept any value, so browsers never drop one, and the earlier declaration cannot act as a fallback.

Declarations in keyframes and descriptor blocks such as `@font-face` and `@property` are also checked.

Shorthand and longhand properties are not duplicates. Use [`unicorn/no-shorthand-property-overrides`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-shorthand-property-overrides.md) to check those relationships.

The rule only runs on CSS parsed through `css/css`, including configured custom syntax. It does not inspect JavaScript object properties or JSX props.

The editor suggestion removes the later declaration. It is omitted when removal would also remove a comment or change the scope of an `eslint-disable-next-line` directive.

## Examples

```css
/* ❌ */
.button {
	color: red;
	color: red;
}
```

```css
/* ❌ */
.component {
	--theme-color: red;
	margin: 0;
	--theme-color: blue;
}
```

```css
/* ✅ */
.component {
	--theme-color: red;
	--Theme-Color: blue;
}
```

```css
/* ❌ */
.header {
	position: -webkit-sticky;
	top: 0;
	position: sticky;
}
```

```css
/* ✅ */
.header {
	position: -webkit-sticky;
	position: sticky;
	top: 0;
}
```

If other duplicate declarations are intentional, use an ESLint disable comment for that declaration.
