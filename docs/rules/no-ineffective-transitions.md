# no-ineffective-transitions

📝 Disallow transition targets that cannot transition under the declared behavior.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A valid property name does not necessarily make an effective transition. This rule reports:

- Properties that cannot animate, such as `transition-duration` and `will-change`, regardless of transition behavior.
- Discrete properties, such as `display` and `position`, when the corresponding behavior resolves to `normal` in the same declaration block.

The rule provides suggestions to enable `allow-discrete`. These change behavior, so they are not automatic fixes. A behavior entry can apply to several targets; changing it enables discrete transitions for all of them.

## Examples

```css
/* ❌ */
.panel {
	transition: display 200ms;
	transition-behavior: normal;
}

/* ✅ */
.panel {
	transition: display 200ms allow-discrete;
}
```

```css
/* ❌ */
.panel {
	transition-property: display, opacity;
	transition-duration: 200ms;
	transition-behavior: normal;
}

/* ✅ */
.panel {
	transition-property: display, opacity;
	transition-duration: 200ms;
	transition-behavior: allow-discrete;
}
```

```css
/* ❌ */
.panel {
	transition: will-change 200ms allow-discrete;
}

/* ✅ */
.panel {
	transition: opacity 200ms;
}
```

The `transition` shorthand resets omitted behavior to `normal`. Put an overriding `transition-behavior` declaration after the shorthand:

```css
/* ❌ */
.panel {
	transition-behavior: allow-discrete;
	transition: display 200ms;
}

/* ✅ */
.panel {
	transition: display 200ms;
	transition-behavior: allow-discrete;
}
```

## Limitations

This rule checks target eligibility, rather than guaranteeing that a transition will run. It only resolves literal declarations within the same style block, respecting declaration order and `!important`. It does not combine separate rules or infer behavior from an omitted `transition-behavior` longhand:

```css
/* ✅ Behavior may be declared elsewhere. */
.panel {
	transition-property: display;
}
```

Substitutions such as `var()`, CSS-wide keywords, and unresolved values make the affected controls unknown. Custom properties, vendor-prefixed targets, and shorthand targets are not reported. Later duplicate targets, `all`, and known shorthand expansions override earlier matching entries.

Property classifications come from the bundled, generated Webref data. Properties with missing, prose-defined, or known conflicting classifications are skipped, except for the audited discrete properties `display`, `content-visibility`, and `overlay`. Special interpolation cases such as `visibility` and image-source properties are also skipped. Coverage is intentionally conservative.

The rule does not check timing, endpoint values, browser support, or custom-property registrations. It excludes keyframes, descriptor blocks, and CSS Modules interoperability blocks.

> [!NOTE]
> Entry transitions involving `display: none` can additionally require [`@starting-style`](https://www.w3.org/TR/css-transitions-2/#defining-before-change-style). Enabling `allow-discrete` alone does not establish a starting style. Exit-only transitions do not necessarily need one.

Use [`no-invalid-property-references`](./no-invalid-property-references.md) to catch unknown target names and [`no-ineffective-properties`](./no-ineffective-properties.md) to catch controls disabled by `transition-property: none`.

## References

- [CSS transition behavior](https://www.w3.org/TR/css-transitions-2/#transition-behavior-property)
- [Animation types and special interpolation](https://www.w3.org/TR/web-animations-1/#animating-properties)
- [Webref CSS data](https://github.com/w3c/webref/tree/main/ed/css)
