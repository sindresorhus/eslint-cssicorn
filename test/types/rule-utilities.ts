import type {CssNodePlain} from '@eslint/css-tree';
import type {CssicornProblem} from '../../rules/rule/to-eslint-problem.js';
import type {EslintReportFixer} from '../../rules/rule/to-eslint-rule-fixer.js';
import {forEachFixOrProblem} from '../../rules/rule/utilities.js';

declare const node: CssNodePlain;
const problem = {node, messageId: 'problem'} satisfies CssicornProblem;
forEachFixOrProblem([problem, undefined], value => {
	value satisfies CssicornProblem | undefined;
});
const fix = {range: [0, 1], text: 'replacement'} satisfies EslintReportFixer;
forEachFixOrProblem([fix, undefined], value => {
	value satisfies EslintReportFixer;
});
forEachFixOrProblem(undefined, value => {
	value satisfies undefined;
});
// @ts-expect-error Strings are iterable, but are not fixes or problems.
forEachFixOrProblem('problem', () => {});
// @ts-expect-error Numbers are not fixes or problems.
forEachFixOrProblem(1, () => {});
