# Creating a new rule

## Prerequisite

- Ensure [`@eslint/css`](https://github.com/eslint/css#rules) doesn't already have the rule built-in.
- [Read the ESLint docs on creating a new rule.](https://eslint.org/docs/latest/extend/custom-rules)
- Look at an existing rule, for example [`prefer-short-hex-color`](../rules/prefer-short-hex-color.js), for inspiration.

## Tip

Use the [`astexplorer` site](https://astexplorer.net) with the `csstree` parser to inspect the CSS AST. `@eslint/css` uses [CSSTree](https://github.com/csstree/csstree) to parse CSS.

## Steps

- Run `npm run create-rule` to create files for the new rule.
- Open “test/{RULE_ID}.js” and [write some tests](./write-tests.md) before implementing the rule.
- Open “rules/{RULE_ID}.js” and implement the rule logic.
- Add the correct [`meta.type`](https://eslint.org/docs/latest/extend/custom-rules#rule-structure) to the rule.
- Open “docs/rules/{RULE_ID}.md” and write some documentation. Explain *why* the rule exists in the opening description, and make clear what is and isn't covered in the examples.
- Run `npm test` to ensure the tests pass.
- Open a pull request with a title in exactly the format `` Add `rule-name` rule ``, for example, `` Add `prefer-short-hex-color` rule ``.
- The pull request description should include the issue it fixes, for example, `Fixes #123`.

## Implementation note

1. Name boolean options in the positive `check*` form (for example, `checkProperties`), never the negated `ignore*`/`skip*` form. This keeps option naming consistent across rules.
1. Try your best to provide an autofix if possible.
1. Try to provide a suggestion if an autofix is not possible.
1. Make sure the autofix doesn't change how the browser applies the styles.
1. Make sure the suggestion doesn't cause a syntax error.
1. CSS is ASCII case-insensitive in many places, and identifiers can contain escapes (`\63 olor` is `color`). Use `normalizeCssIdentifier()` from `rules/utils/` before you compare names with keywords.
1. Fixes must not remove comments. If a fix replaces or removes a range, use `hasCommentInRange()` from `rules/utils/` and report without a fix when comments would be lost.
