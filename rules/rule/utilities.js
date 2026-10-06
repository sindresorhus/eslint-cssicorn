// @ts-check

/**
@import {CssicornProblem} from './to-eslint-problem.js';
@import {EslintReportFixer} from './to-eslint-rule-fixer.js';
*/

/**
@template Value
@param {Value | Iterable<Value>} object
@returns {object is Iterable<Value>}
*/
const isIterable = object => typeof /** @type {{[Symbol.iterator]?: unknown} | undefined} */ (object)?.[Symbol.iterator] === 'function';

/**
Call `callback` for each ESLint fix or ESLint problem in `value`, flattening nested iterables.

This runs for every listener call of every rule, so it deliberately avoids generators and intermediate arrays.

@template {EslintReportFixer | CssicornProblem} Value

@param {Value | Iterable<Value>} value
@param {(value: Value) => void} callback
@returns {void}
*/
export function forEachFixOrProblem(value, callback) {
	if (!isIterable(value)) {
		callback(value);
		return;
	}

	for (const element of value) {
		forEachFixOrProblem(element, callback);
	}
}
