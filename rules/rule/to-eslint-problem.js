import toEslintFixer from './to-eslint-rule-fixer.js';

/**
@import * as ESLint from 'eslint';
*/

/**
@typedef {Parameters<ESLint.Rule.RuleContext['report']>[0]} EslintProblem
@typedef {EslintProblem} CssicornProblem
@typedef {EslintProblem | undefined | EslintProblem[] | IterableIterator<EslintProblem>} CssicornProblems
*/

/**
@param {CssicornProblem} cssicornProblem
@returns {EslintProblem}
*/
export default function toEslintProblem(cssicornProblem) {
	const eslintProblem = {...cssicornProblem};

	if (cssicornProblem.fix) {
		eslintProblem.fix = toEslintFixer(cssicornProblem.fix);
	}

	if (Array.isArray(cssicornProblem.suggest)) {
		eslintProblem.suggest = cssicornProblem.suggest.map(cssicornSuggest => ({
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
