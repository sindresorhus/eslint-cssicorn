const isIterable = object => typeof object?.[Symbol.iterator] === 'function';

/**
@import * as ESLint from 'eslint';
@import {CssicornReportFixer} from './to-eslint-rule-fixer.js';
@import {CssicornProblems, CssicornProblem} from './to-eslint-problem.js';
*/

/**
Call `callback` for each ESLint fix or ESLint problem in `value`, flattening nested iterables.

This runs for every listener call of every rule, so it deliberately avoids generators and intermediate arrays.

@template {CssicornReportFixer | CssicornProblems} ValueType

@param {ValueType} value
@param {(value: ValueType extends CssicornReportFixer ? ESLint.Rule.Fix : CssicornProblem) => void} callback
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
