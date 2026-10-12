import assert from 'node:assert/strict';
import test from 'node:test';
import {trimCssWhitespace} from '../../rules/utils/index.js';

const noBreakSpace = String.fromCodePoint(0xA0);
const lineSeparator = String.fromCodePoint(0x20_28);

test('trims CSS whitespace only', () => {
	assert.equal(trimCssWhitespace(' \t\n\f\r a b \r\n'), 'a b');
	assert.equal(trimCssWhitespace('a'), 'a');
	assert.equal(trimCssWhitespace(''), '');
	assert.equal(trimCssWhitespace(' \t '), '');
	assert.equal(trimCssWhitespace(`${noBreakSpace}a${noBreakSpace}`), `${noBreakSpace}a${noBreakSpace}`);
	assert.equal(trimCssWhitespace(`${lineSeparator}a`), `${lineSeparator}a`);
});

test('is linear for long inner whitespace', () => {
	const text = `a${' '.repeat(200_000)}a`;
	const start = performance.now();
	assert.equal(trimCssWhitespace(text), text);
	assert.ok(performance.now() - start < 500);
});
