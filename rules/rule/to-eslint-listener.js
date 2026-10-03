import {forEachFixOrProblem} from './utilities.js';
import toEslintProblem from './to-eslint-problem.js';

/**
@import {CSSRuleVisitor} from '@eslint/css';
@import {CssNodePlain} from '@eslint/css-tree';
@import {CssRuleContext, CssicornRuleListener} from './cssicorn-context.js';
*/

/**
@typedef {NonNullable<CSSRuleVisitor[CssNodePlain['type']]>} EslintListener
*/

/**
@param {CssRuleContext} context
@param {CssicornRuleListener[]} listeners
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
	CSS listeners receive the node and its parent.
	*/
	return (node, parent) => {
		for (const listener of listeners) {
			const cssicornProblems = listener(node, parent);

			// Listeners report nothing on the vast majority of nodes, so keep that path free of iterator allocation.
			if (!cssicornProblems) {
				continue;
			}

			forEachFixOrProblem(cssicornProblems, reportProblem);
		}
	};
}
