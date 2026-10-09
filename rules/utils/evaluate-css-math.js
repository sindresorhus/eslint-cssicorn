// @ts-check

import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
@import {CssNode, CssNodePlain} from '@eslint/css-tree';
@typedef {{value: number, unit: string | undefined}} CssMathValue
@typedef {{value: number, units: Map<string, number>, types: Map<string, number>}} CssMathQuantity
@typedef {CssNode | CssNodePlain} MathNode
@typedef {'nearest' | 'up' | 'down' | 'to-zero'} RoundingStrategy
*/

const maximumDepth = 128;
const maximumNodes = 10_000;
const numberPattern = /^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+\-]?\d+)?$/iv;
const sumOperatorPattern = /^[\t\n\f\r ]+[+\-][\t\n\f\r ]+$/v;
const mathFunctions = new Set([
	'calc', 'min', 'max', 'clamp', 'round', 'mod', 'rem', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'pow', 'sqrt', 'hypot', 'log', 'exp', 'abs', 'sign',
]);
/**
@type {Map<string, [unit: string, factor: number, type: string]>}
*/
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
/**
@type {Map<string, (value: number) => number>}
*/
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

@param {number} value
@param {string | undefined} [unit]
@param {string | undefined} [type]
@returns {CssMathQuantity}
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

@param {Map<string, number>} first
@param {Map<string, number>} second
@returns {boolean}
*/
function areEqualExponents(first, second) {
	return first.size === second.size && [...first].every(([unit, exponent]) => second.get(unit) === exponent);
}

/**
Combine dimension exponents for multiplication or division.

@param {Map<string, number>} first
@param {Map<string, number>} second
@param {number} multiplier
@returns {Map<string, number>}
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

@param {CssMathQuantity} quantity
@returns {boolean}
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

@param {CssMathQuantity} quantity
@returns {boolean}
*/
function isNumber(quantity) {
	return quantity.types.size === 0 && quantity.units.size === 0;
}

/**
Check for a number or a single CSS dimension, excluding compound function arguments and final results.

@param {CssMathQuantity} quantity
@returns {boolean}
*/
function isNumericQuantity(quantity) {
	return [quantity.types, quantity.units].every(exponents => exponents.size === 0 || (exponents.size === 1 && exponents.values().next().value === 1));
}

/**
Compare both numeric units and CSS types before addition or function arguments.

@param {CssMathQuantity} first
@param {CssMathQuantity} second
@returns {boolean}
*/
function areCompatible(first, second) {
	return areEqualExponents(first.types, second.types) && areEqualExponents(first.units, second.units);
}

/**
Get a canonical absolute dimension, or retain a recognized relative unit.

@param {number} value
@param {string} unit
@returns {CssMathQuantity | undefined}
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

@param {CssMathQuantity} first
@param {CssMathQuantity} second
@param {string} operator
@returns {CssMathQuantity | undefined}
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
Check for negative or signed zero, which CSS treats as signed.

@param {number} value
*/
const isNegativeNumber = value => value < 0 || Object.is(value, -0);

/**
Round to a multiple, including CSS signed zero and infinite interval rules.

@param {number} value
@param {number} interval
@param {RoundingStrategy} strategy
@returns {number}
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

		return isNegativeNumber(value) ? -0 : 0;
	}

	interval = Math.abs(interval);
	if (value % interval === 0) {
		return value;
	}

	const quotient = value / interval;
	// An interval smaller than the representable spacing cannot change a finite input.
	const round = /** @type {(value: number) => number} */ (roundingStrategies.get(strategy));
	return Number.isFinite(quotient) ? round(quotient) * interval : value;
}

/**
Calculate CSS modulus without losing small remainders against large divisors.

@param {number} value
@param {number} interval
@returns {number}
*/
function getModulus(value, interval) {
	if (Number.isNaN(value) || Number.isNaN(interval) || interval === 0 || !Number.isFinite(value)) {
		return NaN;
	}

	if (!Number.isFinite(interval)) {
		return isNegativeNumber(value) === isNegativeNumber(interval) ? value : NaN;
	}

	const remainder = value % interval;
	if (remainder === 0) {
		return interval < 0 ? -0 : 0;
	}

	return isNegativeNumber(remainder) === isNegativeNumber(interval) ? remainder : remainder + interval;
}

/**
Evaluate trig arguments after canonical angle conversion.

@param {'sin' | 'cos' | 'tan'} name
@param {CssMathQuantity} argument
@returns {CssMathQuantity | undefined}
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
	if (isAngle && Number.isFinite(degrees) && degrees !== 0 && degrees % 90 === 0) {
		const quadrant = ((degrees % 360) + 360) % 360;
		const values = /** @type {number[]} */ (quadrantValues.get(name));
		value = values[quadrant / 90];
	}

	return getQuantity(value);
}

/**
Evaluate a pure function after validating its arity and argument types.

@param {string} name
@param {CssMathQuantity[]} arguments_
@param {RoundingStrategy} strategy
@returns {CssMathQuantity | undefined}
*/
function getCompatibleFunctionValue(name, arguments_, strategy) {
	if (arguments_.length === 0) {
		return;
	}

	const [first, second] = arguments_;
	const compatible = arguments_.every(argument => areCompatible(first, argument));
	const isResolved = arguments_.every(argument => !isUnresolved(argument));
	if (['min', 'max', 'hypot'].includes(name)) {
		if (!compatible || !isResolved) {
			return;
		}

		const hasNaN = arguments_.some(argument => Number.isNaN(argument.value));
		const operation = Math[/** @type {'min' | 'max' | 'hypot'} */ (name)];
		return {...first, value: hasNaN ? NaN : operation(...arguments_.map(argument => argument.value))};
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

@param {string} name
@param {CssMathQuantity[]} arguments_
@param {RoundingStrategy} strategy
@param {boolean} compatible
@returns {CssMathQuantity | undefined}
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

@param {string} name
@param {CssMathQuantity[]} arguments_
@returns {CssMathQuantity | undefined}
*/
function getNumberFunctionValue(name, arguments_) {
	if (arguments_.length === 0 || arguments_.some(argument => !isNumber(argument))) {
		return;
	}

	const [first, second] = arguments_;
	if (['asin', 'acos', 'atan'].includes(name)) {
		const operation = Math[/** @type {'asin' | 'acos' | 'atan'} */ (name)];
		return arguments_.length === 1 ? getQuantity(operation(first.value) * 180 / Math.PI, 'deg', 'angle') : undefined;
	}

	const unaryFunction = unaryNumberFunctions.get(name);
	if (unaryFunction) {
		return arguments_.length === 1 ? getQuantity(unaryFunction(first.value)) : undefined;
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

@param {number} argument
@param {number} base
@returns {CssMathQuantity}
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

@param {string} name
@param {CssMathQuantity[]} arguments_
@param {RoundingStrategy} [strategy]
@returns {CssMathQuantity | undefined}
*/
function getFunctionValue(name, arguments_, strategy = 'nearest') {
	if (arguments_.some(argument => !isNumericQuantity(argument))) {
		return;
	}

	if (['sin', 'cos', 'tan'].includes(name)) {
		return arguments_.length === 1 ? getTrigonometricValue(/** @type {'sin' | 'cos' | 'tan'} */ (name), arguments_[0]) : undefined;
	}

	return ['asin', 'acos', 'atan', 'sqrt', 'exp', 'pow', 'log'].includes(name)
		? getNumberFunctionValue(name, arguments_)
		: getCompatibleFunctionValue(name, arguments_, strategy);
}

/**
Decode a literal and apply an optional concrete percentage basis.

@param {Extract<MathNode, {type: 'Number' | 'Dimension' | 'Percentage'}>} target
@param {CssMathQuantity | undefined} basis
@returns {CssMathQuantity | undefined}
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
	/**
	@type {CssMathQuantity | undefined}
	*/
	let basis;
	if (percentageBasis !== undefined) {
		if (!Number.isFinite(percentageBasis.value) || percentageBasis.unit === '%') {
			return;
		}

		basis = percentageBasis.unit === undefined ? getQuantity(percentageBasis.value) : getDimension(percentageBasis.value, percentageBasis.unit);
		if (!basis || isUnresolved(basis)) {
			return;
		}
	}

	/**
	Evaluate a calculation's operators with CSS precedence.

	@param {MathNode[]} children
	@param {number} depth
	@returns {CssMathQuantity | undefined}
	*/
	function evaluateExpression(children, depth) {
		let index = 0;
		const getOperator = () => {
			const node = children[index];
			if (node?.type !== 'Operator') {
				return;
			}

			const {value} = node;
			const operator = value.trim();
			return (operator === '+' || operator === '-') && !sumOperatorPattern.test(value) ? undefined : operator;
		};

		/**
		Read a multiplication/division chain before addition/subtraction.
		*/
		function evaluateProduct() {
			let value = evaluate(children[index++], depth, true);
			let operator = getOperator();
			while (value && (operator === '*' || operator === '/')) {
				if (--remainingNodes < 0) {
					return;
				}

				index++;
				const next = evaluate(children[index++], depth, true);
				value = next && getArithmetic(value, next, operator);
				operator = getOperator();
			}

			return value;
		}

		let value = evaluateProduct();
		let operator = getOperator();
		while (value && (operator === '+' || operator === '-')) {
			if (--remainingNodes < 0) {
				return;
			}

			index++;
			const next = evaluateProduct();
			value = next && getArithmetic(value, next, operator);
			operator = getOperator();
		}

		return index === children.length ? value : undefined;
	}

	/**
	Evaluate one AST node with a shared traversal budget.

	@param {MathNode | undefined} target
	@param {number} depth
	@param {boolean} [inCalculation]
	@returns {CssMathQuantity | undefined}
	*/
	function evaluate(target, depth, inCalculation = false) {
		if (!target || depth > maximumDepth || --remainingNodes < 0) {
			return;
		}

		if (['Number', 'Percentage', 'Dimension'].includes(target.type)) {
			return getLiteralValue(/** @type {Extract<MathNode, {type: 'Number' | 'Percentage' | 'Dimension'}>} */ (target), basis);
		}

		if (target.type === 'Identifier') {
			const name = normalizeCssIdentifier(target.name);
			const value = constants.get(name);
			return inCalculation && value !== undefined ? getQuantity(value) : undefined;
		}

		if (!['Value', 'Parentheses', 'Function'].includes(target.type)) {
			return;
		}

		const container = /** @type {Extract<MathNode, {type: 'Value' | 'Parentheses' | 'Function'}>} */ (target);
		if (!container.children || (container.type === 'Function' && !isCssMathFunction(container))) {
			return;
		}

		const children = Array.isArray(container.children) ? container.children : [...container.children];
		if (children.length > remainingNodes) {
			return;
		}

		if (container.type === 'Value') {
			return children.length === 1 ? evaluate(children[0], depth + 1) : undefined;
		}

		if (container.type === 'Parentheses') {
			return evaluateExpression(children, depth + 1);
		}

		const name = normalizeCssIdentifier(container.name);
		if (name === 'calc') {
			return evaluateExpression(children, depth + 1);
		}

		return evaluateFunction(name, children, depth);
	}

	/**
	Evaluate comma-separated function arguments.

	@param {string} name
	@param {MathNode[]} children
	@param {number} depth
	@returns {CssMathQuantity | undefined}
	*/
	function evaluateFunction(name, children, depth) {
		/**
		@type {MathNode[][]}
		*/
		const groups = [[]];
		for (const child of children) {
			if (child.type === 'Operator' && child.value === ',') {
				if (--remainingNodes < 0) {
					return;
				}

				groups.push([]);
			} else {
				/** @type {MathNode[]} */ (groups.at(-1)).push(child);
			}
		}

		/**
		@type {RoundingStrategy}
		*/
		let strategy = 'nearest';
		if (name === 'round' && groups[0].length === 1 && groups[0][0].type === 'Identifier' && roundingStrategies.has(normalizeCssIdentifier(groups[0][0].name))) {
			strategy = /** @type {RoundingStrategy} */ (normalizeCssIdentifier(groups[0][0].name));
			groups.shift();
		}

		if (name === 'clamp') {
			return evaluateClamp(groups, depth);
		}

		const arguments_ = groups.map(group => evaluateExpression(group, depth + 1));
		return arguments_.every(argument => argument !== undefined) ? getFunctionValue(name, arguments_, strategy) : undefined;
	}

	/**
	Evaluate clamp bounds, including unbounded endpoints.

	@param {MathNode[][]} groups
	@param {number} depth
	@returns {CssMathQuantity | undefined}
	*/
	function evaluateClamp(groups, depth) {
		if (groups.length !== 3) {
			return;
		}

		/**
		@param {MathNode[]} group
		*/
		const isNone = group => group.length === 1 && group[0].type === 'Identifier' && normalizeCssIdentifier(group[0].name) === 'none';
		const values = groups.map((group, index) => index !== 1 && isNone(group) ? undefined : evaluateExpression(group, depth + 1));
		const [minimum, preferred, maximum] = values;
		if (!preferred || (!minimum && !isNone(groups[0])) || (!maximum && !isNone(groups[2]))) {
			return;
		}

		if (values.some(value => value && (!isNumericQuantity(value) || !areCompatible(preferred, value) || isUnresolved(value)))) {
			return;
		}

		return {...preferred, value: Math.max(minimum?.value ?? -Infinity, Math.min(preferred.value, maximum?.value ?? Infinity))};
	}

	const result = evaluate(node, 0);
	if (!result || !isNumericQuantity(result)) {
		return;
	}

	return {value: result.value, unit: result.units.keys().next().value};
}
