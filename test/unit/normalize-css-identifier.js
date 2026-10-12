import test from 'node:test';
import assert from 'node:assert/strict';
import normalizeCssIdentifier, {decodeCssIdentifier, normalizePropertyName, toAsciiLowerCase} from '../../rules/utils/normalize-css-identifier.js';

test('decodes escapes and lowercases ASCII letters', () => {
	assert.equal(normalizeCssIdentifier('COLOR'), 'color');
	assert.equal(normalizeCssIdentifier(String.raw`\63 OLOR`), 'color');
	assert.equal(normalizeCssIdentifier('--Brand'), '--brand');
});

// The Kelvin sign lowercases to `k` with `toLowerCase()`, but CSS keywords are ASCII case-insensitive.
const kelvinSign = String.fromCodePoint(0x21_2A);

test('does not lowercase non-ASCII letters', () => {
	assert.equal(normalizeCssIdentifier(`${kelvinSign}EYFRAMES`), `${kelvinSign}eyframes`);
	assert.equal(normalizeCssIdentifier(String.raw`\212A eyframes`), `${kelvinSign}eyframes`);
	assert.equal(toAsciiLowerCase('İTEM'), 'İtem');
});

test('decodes hex escapes with at most six digits and one trailing whitespace', () => {
	assert.equal(normalizeCssIdentifier(String.raw`\000041`), 'a');
	assert.equal(normalizeCssIdentifier(String.raw`\0000041`), '\u00041');
	assert.equal(normalizeCssIdentifier('\\41\r\nB'), 'ab');
	assert.equal(normalizeCssIdentifier('\\41\tB'), 'ab');
	assert.equal(normalizeCssIdentifier(String.raw`\41\42`), 'ab');
});

test('decodes invalid code points to the replacement character', () => {
	for (const identifier of [String.raw`\0`, String.raw`\D800`, String.raw`\110000`]) {
		assert.equal(normalizeCssIdentifier(identifier), '\uFFFD');
	}
});

test('decodes escapes without changing case', () => {
	assert.equal(decodeCssIdentifier('Color'), 'Color');
	assert.equal(decodeCssIdentifier(String.raw`\63 OLOR`), 'cOLOR');
	assert.equal(decodeCssIdentifier(String.raw`\-\-Brand`), '--Brand');
});

test('normalizes property names, keeping custom property names case-sensitive', () => {
	assert.equal(normalizePropertyName('-WEBKIT-Box'), '-webkit-box');
	assert.equal(normalizePropertyName(String.raw`\63 OLOR`), 'color');
	assert.equal(normalizePropertyName('--FOO'), '--FOO');
	assert.equal(normalizePropertyName(String.raw`\-\-Brand`), '--Brand');
});
