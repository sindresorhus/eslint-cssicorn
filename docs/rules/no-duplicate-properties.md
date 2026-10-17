# no-duplicate-properties

📝 Disallow duplicate properties within CSS declaration blocks.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-cssicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports duplicate properties in the same CSS declaration block. They can override one another or hide editing mistakes.

It checks ordinary and custom properties, and decodes CSS escapes before comparison. Ordinary property names are ASCII case-insensitive, and custom property names are case-sensitive.

A duplicate that directly follows a declaration of the same property with a different value is allowed (except for custom properties), because this is the common way to write fallbacks for browsers that do not support the later value. Chains of fallbacks, and comments between the declarations, are also allowed.

These duplicates are still reported:

- A duplicate with the same value as the declaration directly before it. Insignificant whitespace is ignored, but values are compared case-sensitively, so `color: red; color: RED;` counts as a fallback.
- A duplicate with another declaration, nested rule, or at-rule between it and the earlier declaration.
- A duplicate where only one of the two declarations has `!important`.
- A duplicate custom property, even with a different value. Custom properties accept any value, so the earlier declaration cannot act as a fallback.

Declarations in keyframes and descriptor blocks such as `@font-face` and `@property` are also checked.

Shorthand and longhand properties are not duplicates. Use [`unicorn/no-shorthand-property-overrides`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-shorthand-property-overrides.md) for those.

There is no autofix because the rule cannot know which declaration is intended, but a suggestion is provided. It removes the later declaration, and is omitted when removal would also remove a comment or change the scope of an `eslint-disable-next-line` directive.

## Examples

```css
/* ❌ */
.button {
	color: red;
	color: red;
}

/* ✅ */
.button {
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

/* ✅ */
.component {
	--theme-color: red;
	margin: 0;
}
```

Custom property names are case-sensitive:

```css
/* ✅ */
.component {
	--theme-color: red;
	--Theme-Color: blue;
}
```

A fallback must directly precede the declaration that it falls back from. Here, the suggestion would remove `position: sticky`, so move the fallback by hand instead:

```css
/* ❌ */
.header {
	position: -webkit-sticky;
	top: 0;
	position: sticky;
}

/* ✅ */
.header {
	position: -webkit-sticky;
	position: sticky;
	top: 0;
}
```

For other intentional duplicates, use a disable comment.
