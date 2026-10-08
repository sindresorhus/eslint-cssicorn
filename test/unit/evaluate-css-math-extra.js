import test from 'node:test';
import assert from 'node:assert/strict';
import {parse, toPlainObject} from '@eslint/css-tree';
import evaluateCssMath from '../../rules/utils/evaluate-css-math.js';

const evaluate = (expression, options) => evaluateCssMath(toPlainObject(parse(expression, {context: 'value'})).children.at(0), options);

// Generate independent algebraic identities with integral answers, rather than calculating expected values by interpreting the CSS expressions a second time.
test('500 generated distributive arithmetic identities', () => {
	for (let index = 1; index <= 500; index++) {
		const left = index - 251;
		const right = (index % 17) - 8;
		const factor = (index % 13) + 1;
		const expression = `CALC(/* coefficient */ (${left} + ${right}) * ${factor} - ${left * factor})`;
		assert.deepEqual(evaluate(expression), {value: right * factor, unit: undefined}, expression);
	}
});

test('500 generated absolute length conversions cancel to pixel offsets', () => {
	for (let index = 1; index <= 500; index++) {
		const offset = index - 251;
		const expression = `calc(${index}in - ${index * 72}pt + ${offset}PX)`;
		assert.deepEqual(evaluate(expression), {value: offset, unit: 'px'}, expression);
	}
});

test('500 generated mixed time unit quotients are dimensionless', () => {
	for (let index = 1; index <= 500; index++) {
		const seconds = index + 1;
		const addedSeconds = (index % 19) + 1;
		const quotient = (index % 11) - 5;
		const expression = `calc((${seconds}s + ${addedSeconds * 1000}MS) / ${seconds + addedSeconds}s * ${quotient})`;
		assert.deepEqual(evaluate(expression), {value: quotient, unit: undefined}, expression);
	}
});

// Dimensional intermediates are allowed to contain compound units as long as the final result has a CSS numeric type.
// https://github.com/web-platform-tests/wpt/blob/master/css/css-values/typed_arithmetic.html
test('500 generated angle and time compound units cancel correctly', () => {
	for (let index = 1; index <= 500; index++) {
		const turns = (index % 23) + 1;
		const seconds = (index % 7) + 1;
		const offset = index - 251;
		const expression = `calc((${turns}turn / ${seconds}s) * ${seconds * 1000}ms - ${turns * 360}deg + ${offset}deg)`;
		const result = evaluate(expression);
		assert.equal(result?.unit, 'deg', expression);
		assert.ok(Math.abs(result.value - offset) < 1e-9, expression);
	}
});

test('500 generated reversed clamp limits retain the minimum', () => {
	for (let index = 1; index <= 500; index++) {
		const minimum = index - 251;
		const maximum = minimum - ((index % 29) + 1);
		const preferred = maximum - index;
		const expression = `clamp(${minimum}px, min(${preferred}px, ${maximum}px), max(${maximum}px, ${preferred}px))`;
		assert.deepEqual(evaluate(expression), {value: minimum, unit: 'px'}, expression);
	}
});

// The dividend is constructed from a known quotient and remainder; the expectations do not use JavaScript's remainder or rounding functions.
// https://github.com/web-platform-tests/wpt/blob/master/css/css-values/round-mod-rem-computed.html
test('500 generated signed modulus, remainder, and rounding identities', () => {
	for (let index = 1; index <= 500; index++) {
		const interval = (index % 19) + 2;
		const remainder = (index % (interval - 1)) + 1;
		const quotient = (index % 13) + 1;
		const dividend = -((quotient * interval) + remainder);
		const midpoint = (quotient + 0.5) * interval;
		const expression = `calc(mod(${dividend}px, ${interval}px) + rem(${dividend}px, ${interval}px) + round(nearest, ${midpoint}px, -${interval}px))`;
		assert.deepEqual(evaluate(expression), {value: interval - (2 * remainder) + ((quotient + 1) * interval), unit: 'px'}, expression);
	}
});

// NaN is infectious in CSS, including cases where JavaScript Math.pow and Math.hypot return a number or infinity.
// https://github.com/web-platform-tests/wpt/blob/master/css/css-values/hypot-pow-sqrt-computed.html
test('nested NaN cannot be hidden by dominant constants', () => {
	for (const expression of [
		'min(-infinity, pow(NaN, 0))',
		'max(infinity, hypot(infinity, NaN))',
		'clamp(0, sqrt(-1), 1)',
		'calc(0 * infinity + 4)',
		'calc(pow(1, NaN) + 2)',
		'calc(log(1, NaN) + 2)',
	]) {
		const result = evaluate(expression);
		assert.equal(result?.unit, undefined, expression);
		assert.ok(Number.isNaN(result?.value), expression);
	}
});

test('nested infinities can produce finite typed results', () => {
	for (const [expression, expected] of [
		['min(infinity, 2)', {value: 2, unit: undefined}],
		['max(-infinity, -2)', {value: -2, unit: undefined}],
		['clamp(2px, infinity * 1px, 3px)', {value: 3, unit: 'px'}],
		['calc(atan(infinity) / 1deg)', {value: 90, unit: undefined}],
		['calc(exp(-infinity) + 2)', {value: 2, unit: undefined}],
		['calc(rem(4px, infinity * 1px) + 2px)', {value: 6, unit: 'px'}],
	]) {
		assert.deepEqual(evaluate(expression), expected, expression);
	}
});

test('generated signed zero survives nested calculations', () => {
	for (const expression of [
		'calc(1 / -infinity)',
		'calc(-1 * 0)',
		'round(nearest, -1, infinity)',
		'round(up, -1, infinity)',
		'mod(2, -2)',
		'rem(-2, 2)',
		'sin(-1 * 0)',
		'sqrt(-1 * 0)',
		'atan2(-1 * 0, 1)',
	]) {
		assert.ok(Object.is(evaluate(expression)?.value, -0), expression);
	}

	assert.deepEqual(evaluate('clamp(-1, 1 / calc(-1 * 0), 1)'), {value: -1, unit: undefined});
	assert.deepEqual(evaluate('min(0, -1 * 0)'), {value: -0, unit: undefined});
	assert.deepEqual(evaluate('max(0, -1 * 0)'), {value: 0, unit: undefined});
});

// Base zero is explicitly covered by WPT even though the specification's prose has an editorial error around the invalid base range.
// https://github.com/web-platform-tests/wpt/blob/master/css/css-values/exp-log-compute.html
test('logarithm invalid bases stay NaN when nested', () => {
	for (const base of [0, -1, 1]) {
		assert.ok(Number.isNaN(evaluate(`calc(log(2, ${base}) + 3)`)?.value));
	}

	assert.deepEqual(evaluate('log(2, 0.5)'), {value: -1, unit: undefined});
	assert.deepEqual(evaluate('log(1, 0.5)'), {value: 0, unit: undefined});
});

test('type errors remain invalid after algebraic cancellation', () => {
	for (const expression of [
		'calc(5px - 5px + 1s)',
		'calc(0 * 5px + 1s)',
		'calc(0 + 5px)',
		'min(0, 5px)',
		'sqrt(4px * 4px)',
		'pow(2px, 2)',
		'calc(1px * 1s)',
		'calc(1px / 1s)',
		'calc(1px * 1px)',
		'calc(1px + 1%)',
		'calc(1px + 1em)',
	]) {
		assert.equal(evaluate(expression), undefined, expression);
	}
});

test('compatible compound terms can add before their dimensions cancel', () => {
	for (const [expression, expected] of [
		['calc((1px * 1s + 1s * 1px) / 2s)', {value: 1, unit: 'px'}],
		['calc((1in * 1s - 72pt * 1s) / 1s)', {value: 0, unit: 'px'}],
		['calc(1khz * 1s / 1000hz)', {value: 1, unit: 's'}],
		['calc(96dpi / 1dppx)', {value: 1, unit: undefined}],
		['calc(1fr * 1px / 1px)', {value: 1, unit: 'fr'}],
		['calc((2s * 3px) / (4px * 5s))', {value: 0.3, unit: undefined}],
	]) {
		assert.deepEqual(evaluate(expression), expected, expression);
	}
});

test('compound dimension mismatches cannot be removed after invalid addition', () => {
	for (const expression of [
		'calc((1px * 1s + 1px * 1deg) / 1px)',
		'calc((1px * 1px - 1s * 1s) * 0)',
		'calc((1px / 1s + 1px / 1deg) * 0)',
		'min(1px * 1px, 1s * 1s)',
	]) {
		assert.equal(evaluate(expression), undefined, expression);
	}
});

test('receiving scalar percentage bases resolve comparisons without mixing numbers and percentages', () => {
	const options = {percentageBasis: {value: 1, unit: undefined}};
	assert.deepEqual(evaluate('min(200%, 50%)', options), {value: 0.5, unit: undefined});
	assert.deepEqual(evaluate('calc(50% / 25%)', options), {value: 2, unit: undefined});
	assert.equal(evaluate('calc(0.25 + 25%)', options), undefined);
	assert.equal(evaluate('min(0.25, 25%)', options), undefined);
});

test('a supplied negative percentage reference reverses comparisons', () => {
	const options = {percentageBasis: {value: -200, unit: 'px'}};
	assert.deepEqual(evaluate('min(10%, 20%)', options), {value: -40, unit: 'px'});
	assert.deepEqual(evaluate('max(10%, 20%)', options), {value: -20, unit: 'px'});
	assert.deepEqual(evaluate('sign(10%)', options), {value: -1, unit: undefined});
	assert.deepEqual(evaluate('abs(10%)', options), {value: 20, unit: 'px'});
});

test('concrete dimensional percentage references allow matching dimension arithmetic', () => {
	const options = {percentageBasis: {value: 100, unit: 'px'}};
	assert.deepEqual(evaluate('calc(10% + 1px)', options), {value: 11, unit: 'px'});
	assert.deepEqual(evaluate('calc(1px - 10%)', options), {value: -9, unit: 'px'});
	assert.deepEqual(evaluate('min(10%, 1px)', options), {value: 1, unit: 'px'});
	assert.deepEqual(evaluate('calc(10% * 1deg / 1px)', options), {value: 10, unit: 'deg'});
	assert.equal(evaluate('calc(10% + 1s)', options), undefined);
});

test('evaluation leaves caller AST and options intact', () => {
	const node = toPlainObject(parse('min(10%, 20%)', {context: 'value'})).children.at(0);
	const options = {percentageBasis: {value: -200, unit: 'px'}};
	const originalNode = structuredClone(node);
	const originalOptions = structuredClone(options);
	evaluateCssMath(node, options);
	assert.deepEqual(node, originalNode);
	assert.deepEqual(options, originalOptions);
});
