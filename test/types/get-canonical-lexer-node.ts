import type {Identifier, ValuePlain} from '@eslint/css-tree';
import {getCanonicalLexerNode} from '../../rules/utils/index.js';

declare const value: ValuePlain;
declare const identifier: Identifier;

getCanonicalLexerNode(value) satisfies ValuePlain;
getCanonicalLexerNode(identifier) satisfies Identifier;
// @ts-expect-error Plain objects are not CSS nodes.
getCanonicalLexerNode({});
// @ts-expect-error Canonicalizing an identifier does not turn it into a value.
getCanonicalLexerNode(identifier) satisfies ValuePlain;
