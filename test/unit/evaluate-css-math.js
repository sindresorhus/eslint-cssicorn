import test from 'node:test';
import assert from 'node:assert/strict';
import {parse, toPlainObject} from '@eslint/css-tree';
import evaluateCssMath, {isCssMathFunction} from '../../rules/utils/evaluate-css-math.js';

// These tests share their assertions through assertQuantity().
/* eslint node-test/require-assertion: off */

const parseValue = text => toPlainObject(parse(text, {context: 'value'}));
const quantity = (value, unit) => ({value, unit});

test('recognizes pure CSS math functions', () => {
	for (const name of ['calc', 'min', 'max', 'clamp', 'round', 'mod', 'rem', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'pow', 'sqrt', 'hypot', 'log', 'exp', 'abs', 'sign']) {
		assert.equal(isCssMathFunction({type: 'Function', name}), true);
	}

	assert.equal(isCssMathFunction({type: 'Function', name: 'CALC'}), true);
	assert.equal(isCssMathFunction({type: 'Function', name: String.raw`c\61 lc`}), true);
});

test('excludes unknown and dynamic functions', () => {
	for (const name of ['var', 'env', 'attr', 'random', 'calc-size', 'progress', 'rgb']) {
		assert.equal(isCssMathFunction({type: 'Function', name}), false);
	}

	assert.equal(isCssMathFunction(undefined), false);
	assert.equal(isCssMathFunction({type: 'Identifier', name: 'calc'}), false);
	assert.equal(isCssMathFunction({type: 'Function'}), false);
});

function assertQuantity(actual, expected) {
	assert.notEqual(actual, undefined);
	assert.equal(actual.unit, expected.unit);
	if (Number.isNaN(expected.value)) {
		assert.equal(Number.isNaN(actual.value), true);
	} else if (!Number.isFinite(expected.value) || expected.value === 0) {
		assert.equal(Object.is(actual.value, expected.value), true, `${actual.value} does not match ${expected.value}`);
	} else {
		assert.ok(Math.abs(actual.value - expected.value) <= 1e-12 * Math.max(1, Math.abs(expected.value)), `${actual.value} does not match ${expected.value}`);
	}
}

const cases = [
	['1', 1],
	['-0', 0],
	['+0', 0],
	['1e2', 100],
	['-1e-2', -0.01],
	['calc(1 + 2 * 3)', 7],
	['calc((1 + 2) * 3)', 9],
	['calc(12 / 3 / 2)', 2],
	['calc(12 - 3 - 2)', 7],
	['calc(1 + -2)', -1],
	['calc(1 - -2)', 3],
	['calc(+2 * -3)', -6],
	['calc((2) + (3))', 5],
	['calc(2/**/ + /**/3)', 5],
	['calc(2 + /*hi*/ 3)', 5],
	['calc(2/**/ +/**/ 3)', 5],
	['calc(-0)', 0],
	['calc(-1 * 0)', -0],
	['calc(0 / -1)', -0],
	['calc(0 * -1)', -0],
	['calc(1 / -infinity)', -0],
	['calc(-1 / infinity)', -0],
	['calc(pi)', Math.PI],
	['calc(e)', Math.E],
	['calc(infinity)', Infinity],
	['calc(-infinity)', -Infinity],
	['calc(NaN)', NaN],
	['calc(1 / 0)', Infinity],
	['calc(-1 / 0)', -Infinity],
	['calc(0 / 0)', NaN],
	['calc(infinity - infinity)', NaN],
	['calc(infinity * 0)', NaN],
	['calc(infinity / infinity)', NaN],
	['calc(1e999)', Infinity],
	['calc(0.1 + 0.2)', 0.3],
	['calc(1 + 1e-15)', 1.000000000000001],
	['calc(2px / 1px)', 2],
	['calc(2px * 3px / 1px)', 6, 'px'],
	['calc(1s / 250ms)', 4],
	['calc(1in / 1px)', 96],
	['calc(1in - 96px)', 0, 'px'],
	['calc(2cm - 10mm)', 96 / 2.54, 'px'],
	['calc(1Q * 4)', 96 / 25.4, 'px'],
	['calc(1pc + 12pt)', 32, 'px'],
	['calc(1000ms)', 1, 's'],
	['calc(1khz)', 1000, 'hz'],
	['calc(96dpi)', 1, 'dppx'],
	['calc(1x)', 1, 'dppx'],
	['calc(1dpcm)', 2.54 / 96, 'dppx'],
	['calc(.25turn)', 90, 'deg'],
	['calc(100grad)', 90, 'deg'],
	['calc(pi * 1rad)', 180, 'deg'],
	['calc(2px * 3s / 1s)', 6, 'px'],
	['calc((2px * 3px) / (1px * 1px))', 6],
	['calc(calc(2px * 3px) / 1px)', 6, 'px'],
	['calc(1 / (2px / 1px))', 0.5],
	['calc(1px / 0px)', Infinity],
	['calc(2em + 3em)', 5, 'em'],
	['calc(2rem * 3)', 6, 'rem'],
	['calc(4vw / 2)', 2, 'vw'],
	['calc(50% + 10%)', 60, '%'],
	['calc(50% * 2)', 100, '%'],
	['calc(50% / 2)', 25, '%'],
	['min(3)', 3],
	['max(3)', 3],
	['min(1, 2, 3)', 1],
	['max(-1, -2, -3)', -1],
	['min(infinity, 3)', 3],
	['max(-infinity, 3)', 3],
	['min(NaN, 3)', NaN],
	['max(NaN, 3)', NaN],
	['min(0, calc(-1 * 0))', -0],
	['max(0, calc(-1 * 0))', 0],
	['clamp(0, 2, 1)', 1],
	['clamp(2, 0, 1)', 2],
	['clamp(none, 2, 1)', 1],
	['clamp(0, -1, none)', 0],
	['clamp(none, 2, none)', 2],
	['clamp(0, NaN, 1)', NaN],
	['clamp(NaN, 1, 2)', NaN],
	['clamp(0, 1, NaN)', NaN],
	['clamp(0, calc(-1 * 0), 1)', 0],
	['round(1.5)', 2],
	['round(-1.5)', -1],
	['round(nearest, 1.5)', 2],
	['round(up, -1.5)', -1],
	['round(down, -1.5)', -2],
	['round(to-zero, -1.5)', -1],
	['round(-.5)', -0],
	['round(up, -.1)', -0],
	['round(down, .1)', 0],
	['round(to-zero, -.1)', -0],
	['round(3, 2)', 4],
	['round(-3, 2)', -2],
	['round(3, -2)', 4],
	['round(-3, -2)', -2],
	['round(up, 4, -2)', 4],
	['round(down, 4, -2)', 4],
	['round(2, 0)', NaN],
	['round(infinity, infinity)', NaN],
	['round(infinity, 2)', Infinity],
	['round(-infinity, 2)', -Infinity],
	['round(2, infinity)', 0],
	['round(-2, infinity)', -0],
	['round(up, 2, infinity)', Infinity],
	['round(up, -2, infinity)', -0],
	['round(down, 2, infinity)', 0],
	['round(down, -2, infinity)', -Infinity],
	['round(to-zero, 2, infinity)', 0],
	['round(to-zero, -2, infinity)', -0],
	['round(calc(-1 * 0), 1)', -0],
	['round(0, infinity)', 0],
	['round(calc(-1 * 0), infinity)', -0],
	['mod(18, 5)', 3],
	['mod(-18, 5)', 2],
	['mod(18, -5)', -2],
	['mod(-18, -5)', -3],
	['rem(18, 5)', 3],
	['rem(-18, 5)', -3],
	['rem(18, -5)', 3],
	['rem(-18, -5)', -3],
	['mod(10, -5)', -0],
	['mod(-10, 5)', 0],
	['rem(-10, 5)', -0],
	['rem(10, -5)', 0],
	['mod(.5, 10000000000000000)', 0.5],
	['rem(.5, 10000000000000000)', 0.5],
	['mod(1, 0)', NaN],
	['rem(1, 0)', NaN],
	['mod(infinity, 1)', NaN],
	['rem(infinity, 1)', NaN],
	['mod(1, infinity)', 1],
	['mod(-1, infinity)', NaN],
	['mod(1, -infinity)', NaN],
	['mod(-1, -infinity)', -1],
	['rem(-1, infinity)', -1],
	['rem(1, -infinity)', 1],
	['sin(0)', 0],
	['cos(0)', 1],
	['tan(0)', 0],
	['sin(90deg)', 1],
	['cos(180deg)', -1],
	['sin(.25turn)', 1],
	['tan(45deg)', 1],
	['sin(calc(-1 * 0))', -0],
	['tan(calc(-1 * 0))', -0],
	['sin(infinity)', NaN],
	['cos(infinity)', NaN],
	['tan(infinity)', NaN],
	['asin(1)', 90, 'deg'],
	['asin(-1)', -90, 'deg'],
	['acos(1)', 0, 'deg'],
	['acos(-1)', 180, 'deg'],
	['atan(1)', 45, 'deg'],
	['atan(infinity)', 90, 'deg'],
	['atan(-infinity)', -90, 'deg'],
	['asin(2)', NaN, 'deg'],
	['acos(-2)', NaN, 'deg'],
	['atan(calc(-1 * 0))', -0, 'deg'],
	['atan2(1, -1)', 135, 'deg'],
	['atan2(-1, 1)', -45, 'deg'],
	['atan2(1px, 1in)', Math.atan2(1, 96) * 180 / Math.PI, 'deg'],
	['atan2(infinity, infinity)', 45, 'deg'],
	['atan2(-infinity, -infinity)', -135, 'deg'],
	['pow(2, 3)', 8],
	['pow(-2, 3)', -8],
	['pow(-2, 2)', 4],
	['pow(-2, .5)', NaN],
	['pow(NaN, 0)', NaN],
	['pow(0, -1)', Infinity],
	['pow(calc(-1 * 0), -1)', -Infinity],
	['pow(calc(-1 * 0), 3)', -0],
	['pow(infinity, 0)', 1],
	['pow(1, infinity)', NaN],
	['sqrt(4)', 2],
	['sqrt(-1)', NaN],
	['sqrt(infinity)', Infinity],
	['sqrt(calc(-1 * 0))', -0],
	['hypot(3, 4)', 5],
	['hypot(-3, -4)', 5],
	['hypot(3)', 3],
	['hypot(infinity, NaN)', NaN],
	['hypot(1e200, 1e200)', Math.SQRT2 * 1e200],
	['hypot(0, 0)', 0],
	['log(e)', 1],
	['log(8, 2)', 3],
	['log(4, .5)', -2],
	['log(0)', -Infinity],
	['log(-1)', NaN],
	['log(1)', 0],
	['log(1, .5)', 0],
	['log(2, 1)', NaN],
	['log(2, -1)', NaN],
	['log(0, .5)', -Infinity],
	['log(infinity, .5)', Infinity],
	['log(1, 0)', NaN],
	['exp(0)', 1],
	['exp(1)', Math.E],
	['exp(infinity)', Infinity],
	['exp(-infinity)', 0],
	['abs(-2)', 2],
	['abs(calc(-1 * 0))', 0],
	['abs(-infinity)', Infinity],
	['abs(NaN)', NaN],
	['sign(-2)', -1],
	['sign(2)', 1],
	['sign(0)', 0],
	['sign(calc(-1 * 0))', -0],
	['sign(NaN)', NaN],
	['sign(infinity)', 1],
	['sign(-infinity)', -1],
	['CALC(1 /* keep */ + MIN(3, 2))', 3],
	[String.raw`c\61 lc(1 + 2)`, 3],
	[String.raw`calc(1p\78  + 2PX)`, 3, 'px'],
];

for (const [css, value, unit] of cases) {
	test(`evaluates ${css}`, () => {
		assertQuantity(evaluateCssMath(parseValue(css)), quantity(value, unit));
	});
}

for (const unit of ['px', 'deg', 's', 'hz', 'dppx']) {
	for (const [name, arguments_, expected] of [
		['min', [3, 1], 1],
		['max', [3, 1], 3],
		['clamp', [0, 3, 2], 2],
		['round', [3, 2], 4],
		['mod', [-3, 2], 1],
		['rem', [-3, 2], -1],
		['hypot', [3, 4], 5],
		['abs', [-3], 3],
	]) {
		const css = `${name}(${arguments_.map(value => `${value}${unit}`).join(', ')})`;
		test(`evaluates compatible ${unit} quantities in ${name}`, () => {
			assertQuantity(evaluateCssMath(parseValue(css)), quantity(expected, unit));
		});
	}
}

const unsupported = [
	'pi',
	'none',
	'red',
	'1 2',
	'1foo',
	'calc(1foo)',
	'calc()',
	'calc(1 2)',
	'calc(1 +)',
	'calc(+ 1)',
	'calc(2+ 3)',
	'calc(2 +/**/3)',
	'calc(2/**/+ 3)',
	'calc(2+/**/ 3)',
	'calc(2- 3)',
	'calc(2 -/**/3)',
	'calc((2)+ (3))',
	String.raw`calc(1p\78 + 2PX)`,
	'min(2+ 3, 6)',
	'calc(1px + 1)',
	'calc(1px + 1s)',
	'calc(1em + 1px)',
	'calc(1rem + 1em)',
	'calc(1 + 1%)',
	'calc(1% / 1%)',
	'calc(1 / 1%)',
	'calc(1em / 1em)',
	'calc(1em * 1em)',
	'calc(1px * 1px)',
	'calc(1 / 1px)',
	'calc(abs(-1px * 1px) / -1px)',
	'calc(sign(-1px * 1px) * 1px)',
	'calc(min(-1px * 1px, -2px * 1px) / 1px)',
	'calc(max(-1px * 1px, -2px * 1px) / 1px)',
	'calc(clamp(none, -1px * 1px, none) / 1px)',
	'calc(round(-1px * 1px, 1px * 1px) / 1px)',
	'calc(mod(-1px * 1px, 2px * 1px) / 1px)',
	'calc(rem(-1px * 1px, 2px * 1px) / 1px)',
	'calc(hypot(3px * 1px, 4px * 1px) / 1px)',
	'atan2(1px * 1px, 1px * 1px)',
	'sin(1em * 1deg / 1px)',
	'min()',
	'max()',
	'min(1px, 1s)',
	'min(1px, 1)',
	'min(1%, 2%)',
	'clamp(1, 2)',
	'clamp(1, 2, 3, 4)',
	'clamp(1, none, 2)',
	'clamp(1px, 2px, 3s)',
	'round()',
	'round(up)',
	'round(1px)',
	'round(1%)',
	'round(sideways, 1, 2)',
	'round(1, 2, 3)',
	'round(1px, 2s)',
	'round(2%, 1%)',
	'mod(1)',
	'mod(1, 2, 3)',
	'mod(1px, 1)',
	'mod(2%, 1%)',
	'rem(1)',
	'rem(1, 2, 3)',
	'rem(1px, 1s)',
	'sin()',
	'sin(1, 2)',
	'sin(1px)',
	'sin(1%)',
	'cos(1s)',
	'tan(90deg)',
	'tan(270deg)',
	'tan(-90deg)',
	'asin(1deg)',
	'acos(1px)',
	'atan(1s)',
	'atan2(1)',
	'atan2(1, 2, 3)',
	'atan2(1px, 1s)',
	'atan2(1%, 2%)',
	'pow(1)',
	'pow(1, 2, 3)',
	'pow(1px, 2)',
	'pow(1, 2px)',
	'sqrt(1px)',
	'sqrt(1, 2)',
	'hypot()',
	'hypot(1px, 1s)',
	'hypot(1%, 2%)',
	'log()',
	'log(1, 2, 3)',
	'log(1px)',
	'exp(1px)',
	'abs()',
	'abs(1, 2)',
	'abs(1%)',
	'sign(1%)',
	'sign(1em)',
	'calc(var(--x))',
	'calc(env(x))',
	'calc(attr(data-size))',
	'random(1, 2)',
	'random(fixed .5, 1, 2)',
	'progress(1, 0, 2)',
	'calc-size(auto, size * 2)',
	'anchor-size(width)',
	'sibling-count()',
	'first-valid(1, 2)',
];

for (const css of unsupported) {
	test(`leaves unsupported ${css} unresolved`, () => {
		assert.equal(evaluateCssMath(parseValue(css)), undefined);
	});
}

for (const [css, basis, expected] of [
	['50%', quantity(1), quantity(0.5)],
	['calc(50% + 25%)', quantity(1), quantity(0.75)],
	['calc(10% / 20%)', quantity(1), quantity(0.5)],
	['calc(10% / 20%)', quantity(0), quantity(NaN)],
	['min(10%, 20%)', quantity(1), quantity(0.1)],
	['min(10%, 20%)', quantity(-1), quantity(-0.2)],
	['max(10%, 20%)', quantity(-1), quantity(-0.1)],
	['clamp(10%, 50%, 30%)', quantity(1), quantity(0.3)],
	['round(up, 25%, 10%)', quantity(1), quantity(0.3)],
	['round(up, 25%, 10%)', quantity(-1), quantity(-0.2)],
	['mod(25%, 10%)', quantity(1), quantity(0.05)],
	['rem(-25%, 10%)', quantity(1), quantity(-0.05)],
	['abs(25%)', quantity(-1), quantity(0.25)],
	['sign(25%)', quantity(0), quantity(0)],
	['sign(25%)', quantity(-1), quantity(-1)],
	['hypot(30%, 40%)', quantity(1), quantity(0.5)],
	['50%', quantity(10, 'px'), quantity(5, 'px')],
	['calc(10% / 20%)', quantity(10, 'px'), quantity(0.5)],
	['calc(25% * 4)', quantity(1), quantity(1)],
]) {
	test(`evaluates ${css} against ${basis.value}${basis.unit ?? ''}`, () => {
		assertQuantity(evaluateCssMath(parseValue(css), {percentageBasis: basis}), expected);
	});
}

for (const css of ['calc(1 + 50%)', 'calc(1px + 50%)', 'min(1, 50%)', 'clamp(0, 50%, 1)']) {
	test(`a percentage basis does not make ${css} valid`, () => {
		assert.equal(evaluateCssMath(parseValue(css), {percentageBasis: quantity(1)}), undefined);
	});
}

test('rejects nonfinite and unresolved percentage bases', () => {
	const node = parseValue('calc(25% + 50%)');
	for (const basis of [quantity(NaN), quantity(Infinity), quantity(-Infinity), quantity(1, '%'), quantity(1, 'em'), quantity(1, 'unknown')]) {
		assert.equal(evaluateCssMath(node, {percentageBasis: basis}), undefined);
	}
});

test('canonicalizes absolute percentage bases', () => {
	assert.deepEqual(evaluateCssMath(parseValue('min(25%, 50%)'), {percentageBasis: quantity(1, 'in')}), quantity(24, 'px'));
});

test('supports List children and does not mutate the input', () => {
	const node = parse('calc(2px * 3px / 1px)', {context: 'value'});
	const original = toPlainObject(parse('calc(2px * 3px / 1px)', {context: 'value'}));
	assertQuantity(evaluateCssMath(node), quantity(6, 'px'));
	assert.deepEqual(toPlainObject(node), original);
});

test('preserves small arithmetic differences for callers to interpret', () => {
	assert.deepEqual(evaluateCssMath(parseValue('calc(1 + 1e-15)')), quantity(1.000000000000001));
	assert.deepEqual(evaluateCssMath(parseValue('calc(.1 * .1 * 100)')), quantity(1.0000000000000002));
});

test('preserves small nonzero trigonometric angles', () => {
	for (const name of ['sin', 'tan']) {
		for (const angle of [1e-15, -1e-15]) {
			const result = evaluateCssMath(parseValue(`${name}(${angle}deg)`));
			// At these angles, the cubic error from the linear approximation is negligible.
			const expected = angle * Math.PI / 180;
			assert.equal(result.unit, undefined);
			assert.ok(Math.abs((result.value / expected) - 1) < 1e-12);
		}

		const negativeZero = evaluateCssMath(parseValue(`${name}(-1 * 0deg)`));
		assert.ok(Object.is(negativeZero.value, -0));
	}
});

test('does not snap angles beside an exact quadrant', () => {
	assert.ok(evaluateCssMath(parseValue('cos(89.99999999999999deg)')).value > 0);
	assert.ok(evaluateCssMath(parseValue('sin(179.99999999999997deg)')).value > 0);
	assert.ok(evaluateCssMath(parseValue('sin(-179.99999999999997deg)')).value < 0);
});

test('supports direct function and parentheses nodes', () => {
	const node = parseValue('calc((1 + 2) * 3)').children.at(0);
	assertQuantity(evaluateCssMath(node), quantity(9));
	assertQuantity(evaluateCssMath(node.children.at(0)), quantity(3));
});

test('does not mutate frozen nodes', () => {
	const node = parseValue('calc(1 + 2)');
	for (const child of node.children.at(0).children) {
		Object.freeze(child);
	}

	Object.freeze(node.children.at(0).children);
	Object.freeze(node.children.at(0));
	Object.freeze(node.children);
	Object.freeze(node);
	assertQuantity(evaluateCssMath(node), quantity(3));
});

for (const node of [
	undefined,
	{},
	{type: 'Raw', value: '1'},
	{type: 'Function', name: 'calc'},
	{type: 'Function', name: 'calc', children: []},
	{type: 'Value', children: []},
	{type: 'Number', value: 'invalid'},
]) {
	test(`does not throw for malformed ${JSON.stringify(node)}`, () => {
		assert.equal(evaluateCssMath(node), undefined);
	});
}

test('limits excessive nesting', () => {
	let node = {type: 'Number', value: '1'};
	for (let depth = 0; depth < 129; depth++) {
		node = {type: 'Function', name: 'calc', children: [node]};
	}

	assert.equal(evaluateCssMath(node), undefined);
});

test('supports the nesting limit and resets the budget between calls', () => {
	let node = {type: 'Number', value: '1'};
	for (let depth = 0; depth < 128; depth++) {
		node = {type: 'Function', name: 'calc', children: [node]};
	}

	assert.deepEqual(evaluateCssMath(node), quantity(1));
	assert.equal(evaluateCssMath({type: 'Function', name: 'calc', children: [node]}), undefined);
	assert.deepEqual(evaluateCssMath(node), quantity(1));
});

test('enforces the node budget boundary for long expressions', () => {
	const children = [{type: 'Number', value: '1'}];
	for (let index = 0; index < 4999; index++) {
		children.push({type: 'Operator', value: ' + '}, {type: 'Number', value: '1'});
	}

	Object.freeze(children);
	const node = {type: 'Function', name: 'calc', children};
	assert.deepEqual(evaluateCssMath(node), quantity(5000));
	assert.equal(evaluateCssMath({type: 'Value', children: [node]}), undefined);
});

test('limits excessive node counts', () => {
	const children = [{type: 'Number', value: '1'}];
	for (let index = 0; index < 5001; index++) {
		children.push({type: 'Operator', value: ' + '}, {type: 'Number', value: '1'});
	}

	assert.equal(evaluateCssMath({type: 'Function', name: 'calc', children}), undefined);
});

test('limits excessive function argument lists', () => {
	const children = [{type: 'Number', value: '1'}];
	for (let index = 0; index < 5000; index++) {
		children.push({type: 'Operator', value: ','}, {type: 'Number', value: '1'});
	}

	assert.equal(evaluateCssMath({type: 'Function', name: 'min', children}), undefined);
});
