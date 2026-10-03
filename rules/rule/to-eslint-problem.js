import toEslintFixer from './to-eslint-rule-fixer.js';

/**
@import {CssRuleContext} from './cssicorn-context.js';
@import {CssicornRuleFixer} from './to-eslint-rule-fixer.js';
*/

/**
@typedef {Parameters<CssRuleContext['report']>[0]} EslintProblem
*/

/**
@template {NonNullable<EslintProblem['suggest']>[number]} [Suggestion=NonNullable<EslintProblem['suggest']>[number]]
@typedef {Suggestion extends unknown ? Omit<Suggestion, 'fix'> & {fix: CssicornRuleFixer} : never} CssicornSuggestion
*/

/**
@template {EslintProblem} [Problem=EslintProblem]
@typedef {Problem extends unknown ? Omit<Problem, 'fix' | 'suggest'> & {fix?: CssicornRuleFixer, suggest?: CssicornSuggestion[]} : never} CssicornProblem
*/

/**
@typedef {CssicornProblem | void | Iterable<CssicornProblem | void>} CssicornProblems
*/

/**
@param {CssicornProblem} cssicornProblem
@returns {EslintProblem}
*/
export default function toEslintProblem(cssicornProblem) {
	const {fix, suggest, ...problem} = cssicornProblem;
	/**
	@type {EslintProblem}
	*/
	const eslintProblem = problem;

	if (fix) {
		eslintProblem.fix = toEslintFixer(fix);
	}

	if (Array.isArray(suggest)) {
		eslintProblem.suggest = suggest.map(cssicornSuggest => ({
			...cssicornSuggest,
			fix: toEslintFixer(cssicornSuggest.fix),
			data: {
				...cssicornProblem.data,
				...cssicornSuggest.data,
			},
		}));
	}

	return eslintProblem;
}
