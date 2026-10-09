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
