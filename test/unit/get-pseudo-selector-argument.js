import test from 'node:test';
import assert from 'node:assert/strict';
import {parse, toPlainObject} from '@eslint/css-tree';
import {getPseudoSelectorArgument} from '../../rules/utils/index.js';

const sourceCode = {
	getRange: node => [node.loc.start.offset, node.loc.end.offset],
};

const parsePseudo = code => toPlainObject(parse(code, {context: 'selector', positions: true})).children.at(0);

test('returns parsed selector argument nodes unchanged', () => {
	for (const code of [':is(.card)', ':nth-child(2n of .card)', '::slotted(.card)']) {
		const node = parsePseudo(code);
		assert.equal(getPseudoSelectorArgument(node, {sourceCode}), node.children.at(0));
	}
});

test('parses escaped positive pseudo names with original argument ranges', () => {
	for (const [code, type] of [
		[String.raw`:\69s(.card, #panel)`, 'SelectorList'],
		[String.raw`:\77here(.card)`, 'SelectorList'],
		[String.raw`:\6e th-child(2n of .card)`, 'Nth'],
		[String.raw`:\6e th-last-child(odd of .card)`, 'Nth'],
		[String.raw`::\73 lotted(.card)`, 'Selector'],
	]) {
		const node = parsePseudo(code);
		assert.equal(node.children.at(0).type, 'Raw');
		const argument = getPseudoSelectorArgument(node, {sourceCode});
		assert.equal(argument.type, type);
		assert.equal(code.slice(...sourceCode.getRange(argument)), node.children.at(0).value);
	}
});

test('preserves nested escaped argument ranges after comments and CRLF', () => {
	const code = '/* 🌈 */\r\n:\\69s(\r\n  :\\77here(.card, #panel)\r\n)';
	const node = parsePseudo(code);
	const argument = getPseudoSelectorArgument(node, {sourceCode});
	const nestedNode = argument.children.at(0).children.at(0);
	const nestedArgument = getPseudoSelectorArgument(nestedNode, {sourceCode});
	const [firstSelector, secondSelector] = nestedArgument.children;
	assert.equal(code.slice(...sourceCode.getRange(nestedArgument)), '.card, #panel');
	assert.equal(code.slice(...sourceCode.getRange(firstSelector)), '.card');
	assert.equal(code.slice(...sourceCode.getRange(secondSelector)), '#panel');
});

test('ignores missing, opaque, and malformed arguments', () => {
	for (const code of [':host', ':unknown(.card)', ':lang(en)', String.raw`:\69s(.card ?)`]) {
		assert.equal(getPseudoSelectorArgument(parsePseudo(code), {sourceCode}), undefined);
	}
});
