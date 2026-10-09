import test from 'node:test';
import assert from 'node:assert/strict';
import getBasePropertyName from '../../rules/utils/get-base-property-name.js';

test('removes the vendor prefix and lowercases ASCII letters', () => {
	assert.equal(getBasePropertyName('-WEBKIT-Transition'), 'transition');
	assert.equal(getBasePropertyName(String.raw`\6d argin`), 'margin');
	assert.equal(getBasePropertyName('--Brand'), '--brand');
});

test('does not lowercase non-ASCII letters', () => {
	const kelvinSign = String.fromCodePoint(0x21_2A);
	assert.equal(getBasePropertyName(`margin-bloc${kelvinSign}`), `margin-bloc${kelvinSign}`);
	assert.equal(getBasePropertyName('-é-margin'), '-é-margin');
});
