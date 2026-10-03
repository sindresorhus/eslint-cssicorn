# Agents

This plugin only has rules for CSS. Rules that target CSS together with other languages, belong in `eslint-plugin-unicorn`, not here.

## Philosophy

Keep rules simple. Target common patterns, skip rare edge cases rather than overcomplicating the rule.

Avoid duplicating rules that already exist in [`@eslint/css`](https://github.com/eslint/css/tree/main/docs/rules) or [Stylelint](https://stylelint.io/user-guide/rules). Before adding a rule, check both. Only add an overlapping rule if it is clearly better, for example simpler, more accurate, or with an autofix.

## Rule anatomy

Rules export a default config object with `create` and `meta`. The `create` function uses `context.on(NodeType, listener)` to register visitors (this is a custom API, not standard ESLint). See the [ESLint custom rules guide](https://eslint.org/docs/latest/extend/custom-rules) for the underlying API.

Key differences from standard ESLint:

- Use `context.on('NodeType', listener)` and `context.onExit('NodeType', listener)` instead of returning a visitor object.
- Listeners return or yield problem objects (`{node, messageId, fix, suggest, data}`) directly. The adapter calls `context.report()` for you.
- Fix functions receive `(fixer, {abort})`. Call `abort()` to bail out of an unfixable case.

The node types are [CSSTree](https://github.com/csstree/csstree/blob/master/docs/ast.md) node types from [`@eslint/css`](https://github.com/eslint/css) (`StyleSheet`, `Rule`, `Atrule`, `Declaration`, `Identifier`, and others).

```js
const MESSAGE_ID = 'rule-name';

const messages = {
	[MESSAGE_ID]: 'Error message with {{placeholder}}.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Declaration', node => {
		return {
			node,
			messageId: MESSAGE_ID,
			data: {placeholder: 'value'},
			fix: fixer => fixer.replaceText(node, 'replacement'),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce …',
			recommended: true, // 'unopinionated' (safest, in both presets), true (in recommended only), or false (opt-in)
		},
		fixable: 'code', // or omit; add hasSuggestions: true for suggestions
		schema: [],
		defaultOptions: [{option: 'default'}], // merged automatically
		languages: ['css/css'],
		messages,
	},
};
export default config;
```

Options are accessed via `context.options[0]`. Use `meta.defaultOptions` for defaults (no manual merging).

### `recommended` config level

`meta.docs.recommended` picks the preset that enables the rule. `'unopinionated'` does NOT mean "too opinionated" — it means the opposite:

- **`'unopinionated'`** — Catches bugs: code that does not do what the author intended, such as a typo, a deprecated feature, or a declaration that browsers ignore. In both `unopinionated` and `recommended` (the former is a subset). The default for new rules.
- **`true`** — Style or modernization, or a bug check that also reports intentional patterns (such as fallback declarations). In `recommended` only.
- **`false`** — Off by default, only in `all`. Only for rules that cannot work well in normal projects, such as `no-unknown-animations`, which only sees `@keyframes` in the same file, and `no-descending-specificity`, which reports intentional "specific before general" ordering.

| `recommended` | `unopinionated` | `recommended` config | `all` |
|---|---|---|---|
| `'unopinionated'` | on | on | on |
| `true` | off | on | on |
| `false` (or omitted) | off | off | on |

Every rule should be in `recommended` unless it cannot work well in normal projects. If unsure which level fits, share your recommendation and ask.

The preset configs apply to `**/*.css` files, set `language: 'css/css'`, and add the `@eslint/css` plugin.

Name boolean options in the positive `check*` form (for example, `checkProperties`), never the negated `ignore*`/`skip*` form, so option naming stays consistent across rules. This does not apply to array/pattern options like `ignore` (a list of patterns to ignore), which follow ESLint's own conventions.

### Helper naming

Name helpers after what they return or do:

- `is*`/`has*`/`should*`/`can*`/`needs*` must return booleans. Prefer explicit `false` over `undefined` in predicate helpers.
- `get*Problem` returns one problem object or `undefined`; `get*Problems` returns/yields multiple problem objects.
- `report*` should call `context.report()` directly.
- Avoid `check*` for private helpers. Reserve `check*` for public boolean options, like `checkProperties`.
- Do not combine reporting/yielding with a predicate return. Split into a problem builder and a boolean at the call site.

## Rule languages

Every rule must declare the official [`meta.languages`](https://eslint.org/docs/latest/extend/custom-rules#rule-languages) field as `['css/css']`. `test/package.js` enforces this.

## Reusable utilities

`../eslint-node-test` adapts its infrastructure (rule adapter, snapshot test harness, doc generation) from `eslint-plugin-unicorn`, like this plugin. When changing shared patterns here (rule anatomy, testing conventions, autofix rules), consider whether the equivalent should be ported over there.

`../eslint-plugin-unicorn` has CSS utilities too (`rules/shared/css-identifiers.js`, `rules/shared/css-numbers.js`, and the CSS parts of `rules/utils/`). Keep the rule utilities here and the CSS utilities there in sync. When you fix a bug or add an edge case in one, make the same change in the other.

Before writing helpers, check these:

- **`@eslint/css-tree`** - `ident.decode()` for CSS escapes, `tokenize()`/`tokenTypes`, `parse()`, `walk()`, `generate()`, and `keyword()` for vendor prefixes.
- **`rules/utils/`** - Small helpers for rules. See `rules/utils/index.js` for the list; each one has a doc comment.
- **`rules/shared/`** - Larger shared CSS logic and data, like selector specificity and shorthand properties.

To compare an identifier with a keyword, use `normalizeCssIdentifier` from `rules/utils/`, never `toLowerCase()`. It decodes escapes and lowercases only ASCII letters, because CSS keywords are ASCII case-insensitive.

Import utils from the barrel `rules/utils/index.js` (e.g., `import {toLocation} from './utils/index.js'`).

When at least two rules need the same non-trivial logic (for example, a keyword list, a name check with escapes and vendor prefixes, or an AST walk), put it in `rules/utils/` or `rules/shared/` instead of copying it, and reuse it from both. Copies drift apart, and then the rules disagree. Keep one-liners and rule-specific helpers local. Before writing a helper, search the rules for an existing one, also under a different name.

## Auto-generated files

- **`rules/index.js`** is auto-generated. Never edit it by hand. Run `npm run create-rules-index-file` to regenerate after adding or removing rules.
- **Doc headers** in `docs/rules/<rule>.md` (everything above `<!-- end auto-generated rule header -->`) and the rules table in `readme.md` are auto-generated by `eslint-doc-generator`. Do not edit them. Run `npm run fix:eslint-docs` to update.
- **`rules/shared/standard-pseudo-selectors.js`** is generated from `@webref/css`. Run `npm run fix:css-pseudo-selectors` to update.

On rebase, `rules/index.js` and the `readme.md` rules table almost always conflict because other rules were added meanwhile. Don't hand-resolve `rules/index.js` — take either side, then run `npm run create-rules-index-file`. For `readme.md`, keep both rows and re-sort the table alphabetically.

## Documentation

Use JavaScript syntax for configuration examples, not JSON-style quoted keys and strings, unless the example is specifically JSON.

For rule documentation examples, prefer one failing (`/* ❌ */`) example followed by one corresponding passing (`/* ✅ */`) example in each `css` code block whenever possible. Use separate blocks for distinct cases instead of grouping all failing and passing examples together.

## Testing

Tests should be comprehensive with many edge cases, but no duplicate coverage. Add lots of focused edge-case tests for matching and fixes/suggestions. Add tests for edge cases the rule intentionally ignores to document the behavior.

Tests use the Node.js test runner (`node:test`). Prefer `test.snapshot()` which auto-generates snapshots for errors, fixes, and suggestions. The test harness parses every test case as CSS:

```js
import {getTester} from './utils/test.js';
const {test} = getTester(import.meta);

test.snapshot({
	valid: ['a { color: red; }'],
	invalid: ['a { color: RED; }'],
});
```

Tolerant mode (`languageOptions: {tolerant: true}`) is best effort. Rules must not crash on its malformed nodes (for example, `Raw` values without `children`), but do not add logic to report correctly on invalid CSS. Only add tolerant tests for crash fixes.

- **While developing, only run targeted tests**: `node --test test/rule-name.js`. Do not run `npm test` or the full suite until all changes are complete.
- **Only run the full test suite (`npm test`) once at the very end** to confirm everything passes.
- Update snapshots: `node --test --test-update-snapshots test/rule-name.js`. Snapshots are in `test/snapshots/`.
- Focus a single case: wrap with `test.only('code')` or `test.only({code, options})` and run `node --test --test-only test/rule-name.js` (remove before committing)
- For non-snapshot tests, use `test()` with explicit `errors` and `output`

### Edge cases to test

Include test cases for these when relevant to the rule:

- **Case** - CSS is ASCII case-insensitive for property names, at-rule names, units, function names, and keywords: `COLOR: RED`.
- **Escapes** - Identifiers with CSS escapes: `\63 olor`.
- **Vendor prefixes** - `-webkit-transition`, `@-webkit-keyframes`.
- **Comments** - Comments inside the targeted node, to verify fixes don't drop them.
- **Nesting** - The pattern inside nested style rules, `@media`, `@supports`, `@container`, `@layer`, and `@scope`.
- **Custom properties and `var()`** - `--foo: …` values are not validated by the browser, and `var()` can hide the real value.
- **`!important`** - Declarations with `!important`.
- **Strings and URLs** - The pattern inside `"…"` and `url(…)`, which usually must be ignored.

## Linting

CI lints with **ESLint**, not `xo` — a clean `npx xo` run does not mean CI passes.

Run `npm run fix` (or `npm run fix:js` for JS only) — it auto-fixes and reports whatever remains. Prefer it over hand-fixing errors one at a time.

Lint enforces single quotes (`avoidEscape: false`, no template literals). Don't write backtick strings in test cases unless you need interpolation — `--fix` can't convert a backtick string that contains a `'`, so you'd have to fix it by hand.

## Autofix

Always try to provide an autofix if it cannot change how the browser applies the styles. If an autofix could change that, try to provide a suggestion instead.

When writing fix functions:

1. **Comments** - Fixes must not remove or relocate comments. If the node being replaced/removed contains comments, either skip the fix (use `abort()`) or use range-aware replacements that preserve them. Check with `hasCommentInRange()` from `rules/utils/`.
2. **Escapes** - Compare decoded names (`ident.decode()`), but do not drop escapes from code that the fix does not need to change.
3. **Generator fixes** - Use `* fix(fixer) { yield ... }` for multi-step fixes.
4. **Suggestions** - Use `suggest` array with `messageId` and `fix` when autofix could change behavior. Set `hasSuggestions: true` in meta.
5. **Indentation and line endings** - ESLint inserts fix text verbatim and does not re-indent it. Never hardcode `\t` or `\n` when building new lines. Reuse the line ending and indentation that the file already has. Test fixes with space-indented and CRLF input, not only tabs and LF.

## Performance

Real stylesheets are large (Bulma is 750 KB with thousands of custom properties), so keep the common path cheap: bail out early with cheap checks before `parse()`, `lexer.match*()`, or `getAncestors()`, avoid looping over large catalogs per node, cache pure results (bound the cache size when keys come from values, which are unlimited), and build report-only data lazily.

Measure on real CSS, not only test cases. Download popular stylesheets (`bootstrap`, `bulma`, `foundation-sites`, `@picocss/pico`) with `npm pack`, lint them with all rules and [`TIMING=all`](https://eslint.org/docs/latest/extend/custom-rules#profile-rule-performance), and use `node --cpu-prof` to find slow functions.

Performance changes must not change behavior. Confirm the `--format json` output for the corpus is identical before and after, and add tests for cases a fast path must still let through (uppercase, escapes).

## Rule naming

Use a clear prefix that signals intent (see [ESLint built-in rules](https://eslint.org/docs/latest/rules/) for inspiration):

- **`no-`** - Disallow something: `no-duplicate-properties`, `no-unknown-animations`
- **`prefer-`** - Suggest a better alternative: `prefer-short-hex-color`, `prefer-media-feature-range-syntax`
- **`require-`** - Mandate something is present: `require-property-descriptors`
- **`consistent-`** - Enforce a single consistent style
- **No prefix** - Enforce a specific pattern: `lowercase`

Name after the target construct, not the fix. Be specific: `no-duplicate-font-family-names` not `no-duplicates`.

## Creating a new rule

1. Run `npm run create-rule` to scaffold the rule file, test file, and doc file. This also regenerates `rules/index.js` and updates doc headers.
2. Write tests in `test/<rule>.js` before implementing the rule.
3. Implement the rule in `rules/<rule>.js`.
4. Write documentation in `docs/rules/<rule>.md` (below the auto-generated header).
5. Run `node --test test/<rule>.js` to verify tests pass.
6. Before pushing, run lint (`npm run lint:js`, which runs `eslint` — see [Linting](#linting)) and then `npm test`.

## Commit message format

Follow these conventions:

- **New rule**: `` Add `rule-name` rule ``
- **Fix/improve existing rule**: `` `rule-name`: Short description ``
- **General fix**: `Fix short description`
- **Add option to rule**: `` `rule-name`: Add `optionName` option ``
- **Drop a rule**: `` Drop `rule-name` rule ``

Always use backticks around rule names and option names in commit messages.
