# require-selector-scope

📝 Require a positive scoping boundary for every selector.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Require a positive scoping boundary in every selector branch. Use this architectural policy in component stylesheets to catch accidentally unanchored selectors while permitting element selectors inside components.

This rule is opt-in. Global and reset stylesheets commonly need unanchored selectors. It cannot be autofixed safely because the intended boundary is unknown.

A selector qualifies through:

- A direct class or ID selector, anywhere across its combinators.
- `:host`, `:host()`, or `:host-context()`.
- `:is()` or `:where()` when every argument branch qualifies.
- `:nth-child()` or `:nth-last-child()` when every `of` selector branch qualifies.
- `::slotted()` when its compound argument qualifies.
- An enclosing [`@scope`](https://www.w3.org/TR/css-cascade-6/#scoped-styles), including one without an explicit root.
- A positive explicit or implicit nesting reference to a parent whose every branch qualifies.

Classes and IDs inside `:not()` or `:has()` do not establish a boundary. An outer positive anchor still qualifies: `.card:has(button)` and `.card:is(button, a)` are allowed. Bare `:scope`, attribute selectors, universal selectors, and element selectors do not establish a boundary.

## Examples

Every comma-separated branch must qualify:

```css
/* ❌ */
.card, button {
	color: red;
}

/* ✅ */
.card, .card button {
	color: red;
}
```

Every alternative in a positive selector function must qualify:

```css
/* ❌ */
:is(.card, button) {
	color: red;
}

/* ✅ */
:is(.card, #panel) button {
	color: red;
}
```

Mentioning a class inside an exclusion or relationship test is insufficient:

```css
/* ❌ */
button:has(.card) {
	color: red;
}

/* ✅ */
.card button:has(.icon) {
	color: red;
}
```

An enclosing scope permits element selectors:

```css
/* ❌ */
button {
	color: red;
}

/* ✅ */
@scope (.card) {
	button {
		color: red;
	}
}
```

Implicit nesting inherits the boundary:

```css
/* ❌ */
body {
	button {
		color: red;
	}
}

/* ✅ */
.card {
	button {
		color: red;
	}
}
```

An explicit `&` inside `:not()` or `:has()` can escape the nesting parent. The [CSS nesting specification](https://drafts.csswg.org/css-nesting/#nesting) expands `.card { :not(&) {} }` to `:not(.card)`. A leading combinator always implies an initial parent reference, so `.card { > :not(&) {} }` is allowed.

```css
/* ❌ */
.card {
	:is(&, body) {
		color: red;
	}
}

/* ✅ */
.card {
	:is(&, .other-card) {
		color: red;
	}
}
```

The `of` filter must constrain every alternative:

```css
/* ❌ */
:nth-child(2n of .card, button) {
	color: red;
}

/* ✅ */
:nth-child(2n of .card, #panel) {
	color: red;
}
```

Slotted elements can qualify through their compound selector:

```css
/* ❌ */
::slotted(*) {
	color: red;
}

/* ✅ */
::slotted(.card) {
	color: red;
}
```

## Usage

Enable the rule only for component stylesheets, exempting global and reset files:

```js
import cssicorn from 'eslint-cssicorn';

export default [
	cssicorn.configs.recommended,
	{
		files: ['src/components/**/*.css'],
		ignores: ['**/global.css', '**/reset.css'],
		rules: {
			'cssicorn/require-selector-scope': 'error',
		},
	},
];
```

## Limitations

This is a positive-anchor policy, not a guarantee of containment or component ownership. For example, `.card + button` qualifies even though it targets a sibling outside `.card`, and `@scope (:root)` qualifies even though it covers the document. Use native scope when DOM containment is required.

The rule cannot infer scoping supplied by a framework, compiler, stylesheet import, or runtime Shadow DOM attachment. Custom at-rules such as Tailwind's `@utility` are not treated as scoping roots. Arguments of other pseudo-selector functions do not establish boundaries. Logical equivalences such as `:not(:not(.card))` are not analyzed.

Unparsed rule preludes are skipped, and keyframes are excluded. If a parent has an unanchored branch, its unanchored nested selectors are reported too. CSS keywords are matched ASCII case-insensitively, and escaped names of supported pseudo-selectors are recognized.
