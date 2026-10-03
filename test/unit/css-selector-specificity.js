import test from 'node:test';
import assert from 'node:assert/strict';
import {parse, toPlainObject} from '@eslint/css-tree';
import {
	canMatchSelector,
	compareSpecificity,
	getMaximumSpecificity,
	getRuleSelectorSpecificity,
	getRuleSpecificities,
} from '../../rules/shared/css-selector-specificity.js';

const parseRule = selector => toPlainObject(parse(`${selector} {}`)).children.at(0);
const parseSelector = selector => parseRule(selector).prelude.children.at(0);
const getSelectorSpecificities = selector => parseRule(selector).prelude.children.map(selector => getRuleSelectorSpecificity(selector, [0, 0, 0]));

test('compares specificity lexicographically', () => {
	assert.equal(compareSpecificity([1, 0, 0], [0, 100, 100]) > 0, true);
	assert.equal(compareSpecificity([0, 2, 0], [0, 1, 100]) > 0, true);
	assert.equal(compareSpecificity([0, 1, 1], [0, 1, 1]), 0);
	assert.deepEqual(getMaximumSpecificity([[0, 2, 0], [1, 0, 0], [0, 10, 0]]), [1, 0, 0]);
});

test('calculates selector specificity', () => {
	assert.deepEqual(getSelectorSpecificities('#dialog'), [[1, 0, 0]]);
	assert.deepEqual(getSelectorSpecificities('.dialog[open]:hover'), [[0, 3, 0]]);
	assert.deepEqual(getSelectorSpecificities('dialog::before'), [[0, 0, 2]]);
	assert.deepEqual(getSelectorSpecificities('*'), [[0, 0, 0]]);
	assert.deepEqual(getSelectorSpecificities(':where(#dialog)'), [[0, 0, 0]]);
	assert.deepEqual(getSelectorSpecificities(':is(.dialog, #dialog)'), [[1, 0, 0]]);
	assert.deepEqual(getSelectorSpecificities(':is(> #dialog, *)'), [[0, 0, 0]]);
	assert.deepEqual(getSelectorSpecificities(':is(#dialog >, *)'), [[0, 0, 0]]);
	assert.deepEqual(getSelectorSpecificities(':is(::before, *)'), [[0, 0, 0]]);
	assert.deepEqual(getSelectorSpecificities(':is(:unknown, *)'), [[0, 0, 0]]);
	assert.deepEqual(getSelectorSpecificities(':matches(.dialog, #dialog)'), [[1, 0, 0]]);
	assert.deepEqual(getSelectorSpecificities(':matches(:unknown, *)'), [[0, 0, 0]]);
	assert.deepEqual(getSelectorSpecificities(':not(.dialog, #dialog)'), [[1, 0, 0]]);
	assert.deepEqual(getSelectorSpecificities(':has(.dialog, #dialog)'), [[1, 0, 0]]);
	assert.deepEqual(getSelectorSpecificities(':has(> #dialog)'), [[1, 0, 0]]);
	assert.deepEqual(getSelectorSpecificities(':nth-child(2n of .dialog, #dialog)'), [[1, 1, 0]]);
	assert.deepEqual(getSelectorSpecificities(':host(#dialog)'), [[1, 1, 0]]);
	assert.deepEqual(getSelectorSpecificities('::slotted(#dialog)'), [[1, 0, 1]]);
});

test('calculates explicit and implicit nesting specificity', () => {
	const parentSpecificity = [1, 0, 0];
	const explicitSelector = parseRule('& a').prelude.children.at(0);
	const implicitSelector = parseRule('a').prelude.children.at(0);
	const invalidBranchSelector = parseRule(':is(:unknown(&), .dialog)').prelude.children.at(0);

	assert.deepEqual(getRuleSelectorSpecificity(explicitSelector, parentSpecificity), [1, 0, 1]);
	assert.deepEqual(getRuleSelectorSpecificity(implicitSelector, parentSpecificity), [1, 0, 1]);
	assert.deepEqual(getRuleSelectorSpecificity(invalidBranchSelector, parentSpecificity), [0, 1, 0]);
});

test('excludes pseudo-element branches from nesting parents', () => {
	assert.deepEqual(getRuleSpecificities(parseRule('dialog, ::before'), [0, 0, 0]), [[0, 0, 1]]);
	assert.deepEqual(getRuleSpecificities(parseRule(':is(::before)'), [0, 0, 0]), []);
});

test('recognizes supported pseudo-selector forms', () => {
	assert.equal(canMatchSelector(parseSelector(':hover(value)')), false);
	assert.equal(canMatchSelector(parseSelector(':before(value)')), false);
	assert.equal(canMatchSelector(parseSelector('::before(value)')), false);
	assert.equal(canMatchSelector(parseSelector(':host')), true);
	assert.equal(canMatchSelector(parseSelector(':host(.dialog)')), true);
	assert.equal(canMatchSelector(parseSelector(':not(> #dialog, *)')), false);
	assert.equal(canMatchSelector(parseSelector(':has(#dialog >)')), false);
	assert.equal(canMatchSelector(parseSelector(':host(#dialog a)')), false);
	assert.equal(canMatchSelector(parseSelector('::slotted(#dialog a)')), false);
	assert.equal(canMatchSelector(parseSelector(':has(:has(#dialog))')), false);
	assert.equal(canMatchSelector(parseSelector('a::before c')), false);
	assert.equal(canMatchSelector(parseSelector('a::before.foo')), false);
	assert.equal(canMatchSelector(parseSelector('a::before:not(.x)')), false);
	assert.equal(canMatchSelector(parseSelector('a*')), false);
	assert.equal(canMatchSelector(parseSelector('a::before::marker')), false);
});
