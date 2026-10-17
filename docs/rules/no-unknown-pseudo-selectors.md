# no-unknown-pseudo-selectors

📝 Disallow unknown pseudo-class and pseudo-element selectors.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-cssicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Typos in pseudo-classes and pseudo-elements silently create selectors that never match. This rule checks their names and kinds against current CSS specifications, including Editor's Drafts, using [`@webref/css`](https://www.npmjs.com/package/@webref/css) with missing definitions added.

There is no autofix because the intended name is unknown.

## Examples

```css
/* ❌ */
:foucs {}
::befor {}

/* ✅ */
:focus {}
::before {}
```

Pseudo-class and pseudo-element names are distinct, so `::hover` and `:backdrop` are unknown even though `:hover` and `::backdrop` are standard.

Vendor-prefixed pseudo-selectors are ignored, because they are not part of the specifications:

```css
/* ✅ */
::-webkit-scrollbar {}
:-moz-focusring {}
```

The unprefixed WebKit scrollbar pseudo-classes, like `:horizontal` and `:decrement`, are allowed after a vendor-prefixed pseudo-element in the same compound selector, also inside pseudo-class arguments like `:not()`.

```css
/* ✅ */
::-webkit-scrollbar-button:vertical:decrement {}
::-webkit-scrollbar-thumb:not(:window-inactive) {}
```

## Options

### allow

Type: `string[]`\
Default: `[]`

Nonstandard selectors to allow. Each entry must include one or two leading colons to identify its kind. Matching is ASCII case-insensitive and covers both functional and non-functional forms. Give the bare name without parentheses, like `'::theme-part'`, not `'::theme-part()'`.

These are allowed automatically:

- [CSS custom selectors](https://drafts.csswg.org/css-extensions/#custom-selectors) starting with `--`, such as `:--heading`.
- Selectors that common build tools remove: CSS Modules (`:global`, `:local`, `:export`, `:import`), Vue (`:deep`, `:slotted`, `:global`, `::v-deep`, `::v-slotted`, `::v-global`), Svelte (`:global`), and Angular (`::ng-deep`).

```js
{
	allow: [
		':tooltip',
		'::theme-part',
	],
}
```

## Limitations

The WebKit scrollbar pseudo-classes are allowed after any vendor-prefixed pseudo-element, but browsers only accept them after `::-webkit-scrollbar*` and `::-webkit-resizer`, and only inside `:is()`, `:where()`, and `:not()`. So selectors that browsers drop, like `::-webkit-slider-thumb:horizontal`, are not reported. `::selection:window-inactive` is reported, although Chrome and Safari support it, so add `':window-inactive'` to `allow` if you use it.

The rule does not validate context or arguments. Nested pseudo-selectors are checked only when `@eslint/css` parses the arguments as selectors.
