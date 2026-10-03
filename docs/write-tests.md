# Writing tests

Tests are in the `/test` directory.

A rule test file should look like this:

```js
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Valid test cases goes here
	],
	invalid: [
		// Invalid test cases goes here
	],
});
```

The test harness parses every test case as CSS with [`@eslint/css`](https://github.com/eslint/css).

## `test.snapshot()`

This runs [`SnapshotRuleTester`](../test/utils/snapshot-rule-tester.js), which auto-generates the snapshot for test results, including error messages, error locations, autofix result, and suggestions. All you have to do is check the snapshot and make sure the results are expected before committing.

It's recommended to use this approach as it simplifies test writing.

```js
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { color: red; }',
	],
	invalid: [
		'a { color: RED; }',
	],
});
```

## Focus on one rule

We use the [Node.js test runner](https://nodejs.org/api/test.html). To focus on a specific rule test, you can:

```console
node --test test/rule-name.js
```

To update snapshots in `test/snapshots/`, add [`--test-update-snapshots`](https://nodejs.org/api/cli.html#--test-update-snapshots):

```console
node --test --test-update-snapshots test/rule-name.js
```

## Focus on one test case

To focus on a single test case, you can:

```js
test.snapshot({
	valid: [],
	invalid: [
		// Wrap test case with `test.only`
		test.only({
			code: 'a { color: RED; }',
			options: [{checkFoo: true}],
		}),

		// Use `only: true`
		{
			code: 'a { color: RED; }',
			options: [{checkFoo: true}],
			only: true,
		},
	],
});
```

Then run the file with [`--test-only`](https://nodejs.org/api/cli.html#--test-only):

```console
node --test --test-only test/rule-name.js
```

**Please remove `test.only` and `only: true` before committing.**

## `test()`

This runs ESLint's [`RuleTester`](https://eslint.org/docs/latest/integrate/nodejs-api#ruletester):

```js
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'a { color: red; }',
	],
	invalid: [
		{
			code: 'a { color: RED; }',
			errors: 1,
			output: 'a { color: red; }',
		},
	],
});
```

## `languageOptions`

Use `languageOptions` to set [`@eslint/css` language options](https://github.com/eslint/css#tolerant-mode) for a single test case:

```js
test.snapshot({
	valid: [],
	invalid: [
		{
			code: 'a { color: red; }}',
			languageOptions: {tolerant: true},
		},
	],
});
```
