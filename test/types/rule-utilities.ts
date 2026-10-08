import type {CssNode, CssNodePlain, FunctionNodePlain, Identifier, Operator, ValuePlain} from '@eslint/css-tree';
import type {CssicornProblem} from '../../rules/rule/to-eslint-problem.js';
import type {EslintReportFixer} from '../../rules/rule/to-eslint-rule-fixer.js';
import {forEachFixOrProblem} from '../../rules/rule/utilities.js';
import {getCanonicalLexerNode, getCommaSeparatedGroups} from '../../rules/utils/index.js';

declare const node: CssNodePlain;
const problem = {node, messageId: 'problem'} satisfies CssicornProblem;
forEachFixOrProblem([problem, undefined], value => {
	value satisfies CssicornProblem | undefined;
	// @ts-expect-error Problem leaves do not have fix ranges.
	value?.range;
});
const fix = {range: [0, 1], text: 'replacement'} satisfies EslintReportFixer;
forEachFixOrProblem([fix, undefined], value => {
	value satisfies EslintReportFixer;
	// @ts-expect-error Fix leaves do not have problem nodes.
	value?.node;
});
forEachFixOrProblem(undefined, value => {
	value satisfies undefined;
});
// @ts-expect-error Strings are iterable, but are not fixes or problems.
forEachFixOrProblem('problem', () => {});
// @ts-expect-error Iterable elements must be fixes or problems.
forEachFixOrProblem(['problem'], () => {});
// @ts-expect-error Numbers are not fixes or problems.
forEachFixOrProblem(1, () => {});

declare const value: ValuePlain;
declare const functionNode: FunctionNodePlain;
getCommaSeparatedGroups(value);
getCommaSeparatedGroups(functionNode);
const groups = getCommaSeparatedGroups({children: [node]});
groups[0].nodes[0] satisfies CssNodePlain;
groups[0].previousComma satisfies Operator | undefined;
groups[0].nextComma satisfies Operator | undefined;
// @ts-expect-error A group's nodes need narrowing before accessing identifier names.
groups[0].nodes[0].name;
// @ts-expect-error Group children must be CSS nodes.
getCommaSeparatedGroups({children: ['opacity']});

const canonicalValue = getCanonicalLexerNode(value);
canonicalValue satisfies ValuePlain;
canonicalValue.type satisfies 'Value';
canonicalValue.children satisfies CssNodePlain[];
// @ts-expect-error Values do not have identifier names.
canonicalValue.name;

declare const identifier: Identifier;
const canonicalIdentifier = getCanonicalLexerNode(identifier);
canonicalIdentifier satisfies Identifier;
canonicalIdentifier.type satisfies 'Identifier';
canonicalIdentifier.name satisfies string;
// @ts-expect-error Identifiers do not have children.
canonicalIdentifier.children;

declare const listNode: CssNode;
// @ts-expect-error Lexer canonicalization requires plain nodes with array children.
getCanonicalLexerNode(listNode);
// @ts-expect-error Identifiers require a name.
getCanonicalLexerNode({type: 'Identifier'});
