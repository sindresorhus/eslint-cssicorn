import test from 'node:test';
import assert from 'node:assert/strict';
import {parse, toPlainObject} from '@eslint/css-tree';
import {
	canMatchSelector,
	compareSpecificity,
	getMaximumSpecificity,
	getRuleSelectorSpecificity,
	getRuleSpecificities,
	getSelectorArgument,
	getSelectorSpecificity,
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

test('extracts functional selector lists and nth of lists', () => {
	for (const selector of [':is(.item, #featured)', ':not(.item, #featured)', ':has(> .item, #featured)', ':nth-child(2n of .item, #featured)', ':nth-last-child(odd of .item, #featured)']) {
		const argument = getSelectorArgument(parseSelector(selector).children.at(0));
		assert.equal(argument.type, 'SelectorList');
		assert.equal(argument.children.length, 2);
	}

	assert.equal(getSelectorArgument(parseSelector(':nth-child(2n)').children.at(0)), null);
	assert.equal(getSelectorArgument(parseSelector(':hover').children.at(0)), undefined);
});

test('calculates argument specificity without implicit nesting', () => {
	const parentSpecificity = [0, 1, 0];
	for (const selector of [':is(&, .item)', ':has(> &, + .item)', ':nth-child(2n of &, .item)']) {
		const argument = getSelectorArgument(parseSelector(selector).children.at(0));
		const [nesting, literal] = argument.children.map(selector => getSelectorSpecificity(selector, parentSpecificity));
		assert.deepEqual(nesting, {specificity: [0, 1, 0], hasNestingSelector: true});
		assert.deepEqual(literal, {specificity: [0, 1, 0], hasNestingSelector: false});
	}

	assert.deepEqual(getSelectorSpecificity(parseSelector('&&'), parentSpecificity), {specificity: [0, 2, 0], hasNestingSelector: true});
	assert.deepEqual(getSelectorSpecificity(parseSelector(':where(&)'), parentSpecificity), {specificity: [0, 0, 0], hasNestingSelector: true});
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
