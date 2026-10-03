import {forEachFixOrProblem} from './utilities.js';
import toEslintProblem from './to-eslint-problem.js';

/**
@import * as ESLint from 'eslint';
@import {CssicornContext} from './cssicorn-context.js'
@import {CssicornProblems} from './to-eslint-problem.js'
*/

/**
@typedef {ESLint.Rule.RuleListener} EslintListers
@typedef {keyof EslintListers} ListenerType
@typedef {EslintListers[ListenerType]} EslintListener
@typedef {(...listenerArguments: Parameters<EslintListener>) => CssicornProblems} CssicornRuleListen
*/

/**
@param {CssicornContext} context
@param {CssicornRuleListen[]} listeners
@returns {EslintListener}
*/
export default function toEslintListener(context, listeners) {
	const reportProblem = cssicornProblem => {
		if (cssicornProblem) {
			context.report(toEslintProblem(cssicornProblem));
		}
	};

	/*
	Declared with fixed arity rather than rest arguments, since this runs for every node visit of every rule and a per-call rest array is measurable.
	Three parameters cover every ESLint listener signature, the widest being `onCodePathSegmentLoop(fromSegment, toSegment, node)`.
	*/
	return (first, second, third) => {
		for (const listener of listeners) {
			const cssicornProblems = listener(first, second, third);

			// Listeners report nothing on the vast majority of nodes, so keep that path free of iterator allocation.
			if (!cssicornProblems) {
				continue;
			}

			forEachFixOrProblem(cssicornProblems, reportProblem);
		}
	};
}
