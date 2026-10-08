import test from 'node:test';
import assert from 'node:assert/strict';
import {ident, lexer, parse, toPlainObject} from '@eslint/css-tree';
import {getCanonicalLexerNode} from '../../rules/utils/index.js';

test('canonicalizes escaped names and units without changing the source nodes', () => {
	const value = toPlainObject(parse(String.raw`2\73  s\74 eps(4, e\6e d) e\61 se`, {context: 'value'}));
	const original = structuredClone(value);
	const canonical = getCanonicalLexerNode(value);
	const [duration, timingFunction, name] = canonical.children;
	const position = timingFunction.children.at(-1);

	assert.deepEqual(value, original);
	assert.notEqual(canonical, value);
	assert.equal(duration.unit, 's');
	assert.equal(timingFunction.name, 'steps');
	assert.equal(position.name, 'end');
	assert.equal(name.name, 'ease');
});

test('preserves string values and significant escapes in identifiers', () => {
	const value = toPlainObject(parse(String.raw`"none" a\20 b`, {context: 'value'}));
	const canonical = getCanonicalLexerNode(value);
	const [string, identifier] = canonical.children;

	assert.equal(string.value, 'none');
	assert.equal(ident.decode(identifier.name), 'a b');
});

test('canonicalizes escaped names and nested units without changing the original AST or source locations', () => {
	const value = toPlainObject(parse(String.raw`\73 olid calc(1p\78 + 2px) r\67 b(1 2 3)`, {context: 'value', positions: true}));
	const originalValue = structuredClone(value);
	const canonicalValue = getCanonicalLexerNode(value);
	const [styleNode, lengthNode, colorNode] = canonicalValue.children;
	const [dimension] = lengthNode.children;
	assert.deepEqual(value, originalValue);
	assert.equal(styleNode.name, 'solid');
	assert.equal(dimension.unit, 'px');
	assert.equal(colorNode.name, 'rgb');
	assert.ok(lexer.matchProperty('border', canonicalValue).matched);
	assert.equal(canonicalValue.loc, value.loc);
	for (const [index, node] of canonicalValue.children.entries()) {
		assert.equal(node.loc, value.children[index].loc);
	}
});
