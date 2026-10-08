import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
@import {CssNode, CssNodePlain} from '@eslint/css-tree';
@typedef {{value: number, unit: string | undefined}} CssMathValue
*/

const maximumDepth = 128;
const maximumNodes = 10_000;
const numberPattern = /^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+\-]?\d+)?$/iv;
const sumOperatorPattern = /^[\t\n\f\r ]+[+\-][\t\n\f\r ]+$/v;
const mathFunctions = new Set([
	'calc', 'min', 'max', 'clamp', 'round', 'mod', 'rem', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'pow', 'sqrt', 'hypot', 'log', 'exp', 'abs', 'sign',
]);
const absoluteUnits = new Map([
	['px', ['px', 1, 'length']],
	['in', ['px', 96, 'length']],
	['cm', ['px', 96 / 2.54, 'length']],
	['mm', ['px', 96 / 25.4, 'length']],
	['q', ['px', 96 / 101.6, 'length']],
	['pt', ['px', 96 / 72, 'length']],
	['pc', ['px', 16, 'length']],
	['deg', ['deg', 1, 'angle']],
	['grad', ['deg', 0.9, 'angle']],
	['rad', ['deg', 180 / Math.PI, 'angle']],
	['turn', ['deg', 360, 'angle']],
	['s', ['s', 1, 'time']],
	['ms', ['s', 0.001, 'time']],
	['hz', ['hz', 1, 'frequency']],
	['khz', ['hz', 1000, 'frequency']],
	['dppx', ['dppx', 1, 'resolution']],
	['x', ['dppx', 1, 'resolution']],
	['dpi', ['dppx', 1 / 96, 'resolution']],
	['dpcm', ['dppx', 2.54 / 96, 'resolution']],
]);
const relativeUnits = new Set([
	'em',
	'rem',
	'ex',
	'rex',
	'cap',
	'rcap',
	'ch',
	'rch',
	'ic',
	'ric',
	'lh',
	'rlh',
	'vw',
	'vh',
	'vi',
	'vb',
	'vmin',
	'vmax',
	'svw',
	'svh',
	'svi',
	'svb',
	'svmin',
	'svmax',
	'lvw',
	'lvh',
	'lvi',
	'lvb',
	'lvmin',
	'lvmax',
	'dvw',
	'dvh',
	'dvi',
	'dvb',
	'dvmin',
	'dvmax',
	'cqw',
	'cqh',
	'cqi',
	'cqb',
	'cqmin',
	'cqmax',
	'fr',
]);
const constants = new Map([
	['pi', Math.PI], ['e', Math.E], ['infinity', Infinity], ['-infinity', -Infinity], ['nan', NaN],
]);
const unaryNumberFunctions = new Map([
	['sqrt', Math.sqrt], ['exp', Math.exp],
]);
const roundingStrategies = new Map([
	['nearest', Math.round], ['up', Math.ceil], ['down', Math.floor], ['to-zero', Math.trunc],
]);
const quadrantValues = new Map([
	['sin', [0, 1, 0, -1]],
	['cos', [1, 0, -1, 0]],
	['tan', [0, undefined, 0, undefined]],
]);

/**
Create an internal quantity with separate CSS types and resolved numeric units.
*/
function getQuantity(value, unit, type = unit) {
	return {
		value,
		units: new Map(unit ? [[unit, 1]] : []),
		types: new Map(type ? [[type, 1]] : []),
	};
}

/**
Compare dimension exponent records without depending on insertion order.
*/
function areEqualExponents(first, second) {
	return first.size === second.size && [...first].every(([unit, exponent]) => second.get(unit) === exponent);
}

/**
Combine dimension exponents for multiplication or division.
*/
function getCombinedExponents(first, second, multiplier) {
	const combined = new Map(first);
	for (const [unit, exponent] of second) {
		const result = (combined.get(unit) ?? 0) + (exponent * multiplier);
		if (result === 0) {
			combined.delete(unit);
		} else {
			combined.set(unit, result);
		}
	}

	return combined;
}

/**
Check whether a quantity still depends on an unknown reference value.
*/
function isUnresolved(quantity) {
	for (const unit of quantity.units.keys()) {
		if (unit === '%' || relativeUnits.has(unit)) {
			return true;
		}
	}

	return false;
}

/**
Check for a unitless number, retaining its original CSS type.
*/
function isNumber(quantity) {
	return quantity.types.size === 0 && quantity.units.size === 0;
}

/**
Compare both numeric units and CSS types before addition or function arguments.
*/
function areCompatible(first, second) {
	return areEqualExponents(first.types, second.types) && areEqualExponents(first.units, second.units);
}

/**
Get a canonical absolute dimension, or retain a recognized relative unit.
*/
function getDimension(value, unit) {
	unit = normalizeCssIdentifier(unit);
	const conversion = absoluteUnits.get(unit);
	if (conversion) {
		const [canonicalUnit, factor, type] = conversion;
		return getQuantity(value * factor, canonicalUnit, type);
	}

	if (relativeUnits.has(unit)) {
		return getQuantity(value, unit, unit === 'fr' ? 'flex' : 'length');
	}
}

/**
Apply arithmetic while keeping source types separate from percentage resolution.
*/
function getArithmetic(first, second, operator) {
	if (operator === '+' || operator === '-') {
		if (!areCompatible(first, second)) {
			return;
		}

		return {...first, value: operator === '+' ? first.value + second.value : first.value - second.value};
	}

	if (operator === '/' && isUnresolved(second)) {
		// A relative denominator can resolve to zero, even when its coefficient is nonzero.
		return;
	}

	const multiplier = operator === '*' ? 1 : -1;
	return {
		value: operator === '*' ? first.value * second.value : first.value / second.value,
		units: getCombinedExponents(first.units, second.units, multiplier),
		types: getCombinedExponents(first.types, second.types, multiplier),
	};
}

/**
Round to a multiple, including CSS signed zero and infinite interval rules.
*/
function getRoundedValue(value, interval, strategy) {
	if (Number.isNaN(value) || Number.isNaN(interval) || interval === 0 || (!Number.isFinite(value) && !Number.isFinite(interval))) {
		return NaN;
	}

	if (!Number.isFinite(value)) {
		return value;
	}

	if (!Number.isFinite(interval)) {
		if (strategy === 'up' && value > 0) {
			return Infinity;
		}

		if (strategy === 'down' && value < 0) {
			return -Infinity;
		}

		return value < 0 || Object.is(value, -0) ? -0 : 0;
	}

	interval = Math.abs(interval);
	if (value % interval === 0) {
		return value;
	}

	const quotient = value / interval;
	// An interval smaller than the representable spacing cannot change a finite input.
	return Number.isFinite(quotient) ? roundingStrategies.get(strategy)(quotient) * interval : value;
}

/**
Calculate CSS modulus without losing small remainders against large divisors.
*/
function getModulus(value, interval) {
	if (Number.isNaN(value) || Number.isNaN(interval) || interval === 0 || !Number.isFinite(value)) {
		return NaN;
	}

	const isNegative = value => value < 0 || Object.is(value, -0);
	if (!Number.isFinite(interval)) {
		return isNegative(value) === isNegative(interval) ? value : NaN;
	}

	const remainder = value % interval;
	if (remainder === 0) {
		return interval < 0 ? -0 : 0;
	}

	return isNegative(remainder) === isNegative(interval) ? remainder : remainder + interval;
}

/**
Evaluate trig arguments after canonical angle conversion.
*/
function getTrigonometricValue(name, argument) {
	const isAngle = argument.types.size === 1 && argument.types.get('angle') === 1;
	if (!isNumber(argument) && !isAngle) {
		return;
	}

	const degrees = isAngle ? argument.value : argument.value * 180 / Math.PI;
	if (name === 'tan' && Number.isFinite(degrees) && Math.abs(degrees % 180) === 90) {
		// CSS deliberately leaves the value at exact tangent asymptotes implementation-defined.
		return;
	}

	const radians = isAngle ? argument.value * Math.PI / 180 : argument.value;
	let value = Math[name](radians);
	if (isAngle && Number.isFinite(degrees) && degrees !== 0) {
		const quadrant = ((degrees % 360) + 360) % 360;
		if (quadrant % 90 === 0) {
			value = quadrantValues.get(name)[quadrant / 90];
		}
	}

	return getQuantity(value);
}

/**
Evaluate a pure function after validating its arity and argument types.
*/
function getCompatibleFunctionValue(name, arguments_, strategy) {
	if (arguments_.length === 0) {
		return;
	}

	const [first, second] = arguments_;
	const compatible = arguments_.every(argument => areCompatible(first, argument));
	const hasNaN = arguments_.some(argument => Number.isNaN(argument.value));
	const values = arguments_.map(argument => argument.value);
	const isResolved = arguments_.every(argument => !isUnresolved(argument));
	if (['min', 'max', 'hypot'].includes(name)) {
		if (!compatible || !isResolved) {
			return;
		}

		return {...first, value: hasNaN ? NaN : Math[name](...values)};
	}

	if (['round', 'mod', 'rem'].includes(name)) {
		return getSteppedFunctionValue(name, arguments_, strategy, compatible && isResolved);
	}

	if (name === 'abs' || name === 'sign') {
		if (arguments_.length !== 1 || !isResolved) {
			return;
		}

		return name === 'abs' ? {...first, value: Math.abs(first.value)} : getQuantity(Math.sign(first.value));
	}

	if (name === 'atan2') {
		return arguments_.length === 2 && compatible && isResolved ? getQuantity(Math.atan2(first.value, second.value) * 180 / Math.PI, 'deg', 'angle') : undefined;
	}
}

/**
Evaluate rounding and remainder functions with a compatible interval.
*/
function getSteppedFunctionValue(name, arguments_, strategy, compatible) {
	const [first, second] = arguments_;
	if (name === 'round') {
		if (arguments_.length > 2 || !compatible || (arguments_.length === 1 && !isNumber(first))) {
			return;
		}

		return {...first, value: getRoundedValue(first.value, second?.value ?? 1, strategy)};
	}

	if (name === 'mod' || name === 'rem') {
		if (arguments_.length !== 2 || !compatible) {
			return;
		}

		return {...first, value: name === 'mod' ? getModulus(first.value, second.value) : first.value % second.value};
	}
}

/**
Evaluate functions accepting only unitless numbers.
*/
function getNumberFunctionValue(name, arguments_) {
	if (arguments_.length === 0 || arguments_.some(argument => !isNumber(argument))) {
		return;
	}

	const [first, second] = arguments_;
	if (['asin', 'acos', 'atan'].includes(name)) {
		return arguments_.length === 1 ? getQuantity(Math[name](first.value) * 180 / Math.PI, 'deg', 'angle') : undefined;
	}

	if (unaryNumberFunctions.has(name)) {
		return arguments_.length === 1 && isNumber(first) ? getQuantity(unaryNumberFunctions.get(name)(first.value)) : undefined;
	}

	if (name === 'pow') {
		return arguments_.length === 2 ? getQuantity(arguments_.some(argument => Number.isNaN(argument.value)) ? NaN : first.value ** second.value) : undefined;
	}

	if (name === 'log') {
		if (arguments_.length > 2) {
			return;
		}

		return getLogarithmicValue(first.value, second?.value ?? Math.E);
	}
}

/**
Evaluate logarithms, including the CSS special values.
*/
function getLogarithmicValue(argument, base) {
	let value;
	if (Number.isNaN(argument) || Number.isNaN(base) || base <= 0 || base === 1 || argument < 0) {
		value = NaN;
	} else {
		switch (argument) {
			case 0: {
				value = -Infinity;

				break;
			}

			case 1: {
				value = 0;

				break;
			}

			case Infinity: {
				value = Infinity;

				break;
			}

			default: {
				value = Math.log(argument) / Math.log(base);
			}
		}
	}

	return getQuantity(value);
}

/**
Dispatch pure math functions to their argument-type family.
*/
function getFunctionValue(name, arguments_, strategy = 'nearest') {
	if (['sin', 'cos', 'tan'].includes(name)) {
		return arguments_.length === 1 ? getTrigonometricValue(name, arguments_[0]) : undefined;
	}

	return ['asin', 'acos', 'atan', 'sqrt', 'exp', 'pow', 'log'].includes(name)
		? getNumberFunctionValue(name, arguments_)
		: getCompatibleFunctionValue(name, arguments_, strategy);
}

/**
Decode a literal and apply an optional concrete percentage basis.
*/
function getLiteralValue(target, basis) {
	if (!numberPattern.test(target.value)) {
		return;
	}

	const value = Number(target.value) || 0;
	if (target.type === 'Dimension') {
		return typeof target.unit === 'string' ? getDimension(value, target.unit) : undefined;
	}

	if (target.type === 'Percentage') {
		return basis
			? {
				value: value / 100 * basis.value,
				units: new Map(basis.units),
				types: new Map(basis.types.size > 0 ? basis.types : [['percentage', 1]]),
			}
			: getQuantity(value, '%', 'percentage');
	}

	return getQuantity(value);
}

/**
Check whether a node is a supported pure CSS math function.

@param {CssNode | CssNodePlain} node
@returns {boolean}
*/
export function isCssMathFunction(node) {
	return node?.type === 'Function' && typeof node.name === 'string' && mathFunctions.has(normalizeCssIdentifier(node.name));
}

/**
Evaluate a constant CSS numeric expression without changing its AST or applying a property's final range or integer conversion. Numeric results have no unit; absolute dimensions use canonical units. Relative units remain symbolic only for linear operations. Unknown references, invalid types, unsupported functions, final compound dimensions, and expressions exceeding 128 nested nodes or 10,000 visited items return `undefined`.

Percentages remain symbolic for linear arithmetic unless a finite concrete `percentageBasis` is supplied. A basis permits percentage comparisons and quotients. A dimensional basis supplies the corresponding CSS percentage hint; a unitless basis does not make mixed number/percentage addition valid. Calculation-generated signed zero, infinities, and NaN are retained for callers to handle at the receiving boundary.

@param {CssNode | CssNodePlain} node - A numeric literal, math function, parentheses, or a value containing one of them.
@param {{percentageBasis?: CssMathValue}} [options] - The concrete quantity against which percentages resolve.
@returns {CssMathValue | undefined}
*/
export default function evaluateCssMath(node, {percentageBasis} = {}) {
	let remainingNodes = maximumNodes;
	let basis;
	if (percentageBasis !== undefined) {
		if (!Number.isFinite(percentageBasis?.value) || percentageBasis.unit === '%') {
			return;
		}

		basis = percentageBasis.unit === undefined ? getQuantity(percentageBasis.value) : getDimension(percentageBasis.value, percentageBasis.unit);
		if (!basis || isUnresolved(basis)) {
			return;
		}
	}

	/**
	Evaluate a calculation's operators with CSS precedence.
	*/
	function evaluateExpression(children, depth) {
		let index = 0;
		const getOperator = () => {
			if (children[index]?.type !== 'Operator') {
				return;
			}

			const {value} = children[index];
			const operator = value.trim();
			return (operator === '+' || operator === '-') && !sumOperatorPattern.test(value) ? undefined : operator;
		};

		/**
		Read a multiplication/division chain before addition/subtraction.
		*/
		function evaluateProduct() {
			let value = evaluate(children[index++], depth, true);
			while (value && (getOperator() === '*' || getOperator() === '/')) {
				if (--remainingNodes < 0) {
					return;
				}

				const operator = getOperator();
				index++;
				const next = evaluate(children[index++], depth, true);
				value = next && getArithmetic(value, next, operator);
			}

			return value;
		}

		let value = evaluateProduct();
		while (value && (getOperator() === '+' || getOperator() === '-')) {
			if (--remainingNodes < 0) {
				return;
			}

			const operator = getOperator();
			index++;
			const next = evaluateProduct();
			value = next && getArithmetic(value, next, operator);
		}

		return index === children.length ? value : undefined;
	}

	/**
	Evaluate one AST node with a shared traversal budget.
	*/
	function evaluate(target, depth, inCalculation = false) {
		if (!target || depth > maximumDepth || --remainingNodes < 0) {
			return;
		}

		if (['Number', 'Percentage', 'Dimension'].includes(target.type)) {
			return getLiteralValue(target, basis);
		}

		if (target.type === 'Identifier') {
			const name = normalizeCssIdentifier(target.name);
			return inCalculation && constants.has(name) ? getQuantity(constants.get(name)) : undefined;
		}

		if (!target.children || !['Value', 'Parentheses', 'Function'].includes(target.type)) {
			return;
		}

		if (target.type === 'Function' && !isCssMathFunction(target)) {
			return;
		}

		const children = [...target.children];
		if (target.type === 'Value') {
			return children.length === 1 ? evaluate(children[0], depth + 1) : undefined;
		}

		if (target.type === 'Parentheses') {
			return evaluateExpression(children, depth + 1);
		}

		const name = normalizeCssIdentifier(target.name);
		if (name === 'calc') {
			return evaluateExpression(children, depth + 1);
		}

		return evaluateFunction(name, children, depth);
	}

	/**
	Evaluate comma-separated function arguments.
	*/
	function evaluateFunction(name, children, depth) {
		const groups = [[]];
		for (const child of children) {
			if (child.type === 'Operator' && child.value === ',') {
				if (--remainingNodes < 0) {
					return;
				}

				groups.push([]);
			} else {
				groups.at(-1).push(child);
			}
		}

		let strategy = 'nearest';
		if (name === 'round' && groups[0].length === 1 && groups[0][0].type === 'Identifier' && roundingStrategies.has(normalizeCssIdentifier(groups[0][0].name))) {
			strategy = normalizeCssIdentifier(groups[0][0].name);
			groups.shift();
		}

		if (name === 'clamp') {
			return evaluateClamp(groups, depth);
		}

		const arguments_ = groups.map(group => evaluateExpression(group, depth + 1));
		return arguments_.every(Boolean) ? getFunctionValue(name, arguments_, strategy) : undefined;
	}

	/**
	Evaluate clamp bounds, including unbounded endpoints.
	*/
	function evaluateClamp(groups, depth) {
		if (groups.length !== 3) {
			return;
		}

		const isNone = group => group.length === 1 && group[0].type === 'Identifier' && normalizeCssIdentifier(group[0].name) === 'none';
		const values = groups.map((group, index) => index !== 1 && isNone(group) ? undefined : evaluateExpression(group, depth + 1));
		const [minimum, preferred, maximum] = values;
		if (!preferred || (!minimum && !isNone(groups[0])) || (!maximum && !isNone(groups[2])) || values.some(value => value && (!areCompatible(preferred, value) || isUnresolved(value)))) {
			return;
		}

		return {...preferred, value: Math.max(minimum?.value ?? -Infinity, Math.min(preferred.value, maximum?.value ?? Infinity))};
	}

	const result = evaluate(node, 0);
	if (!result || result.types.size > 1 || result.units.size > 1) {
		return;
	}

	for (const exponents of [result.types, result.units]) {
		for (const exponent of exponents.values()) {
			if (exponent !== 1) {
				return;
			}
		}
	}

	return {value: result.value, unit: result.units.keys().next().value};
}
