import toEslintFixer from './to-eslint-rule-fixer.js';

/**
@import {SuggestedEditBase, SuggestionMessage, ViolationReportBase, ViolationMessage, ViolationLocation} from '@eslint/core';
@import {CssNodePlain} from '@eslint/css-tree';
@import {CssRuleContext} from './cssicorn-context.js';
@import {CssicornRuleFixer} from './to-eslint-rule-fixer.js';
*/

/**
@typedef {Parameters<CssRuleContext['report']>[0]} EslintProblem
@typedef {Omit<SuggestedEditBase, 'fix'> & SuggestionMessage & {fix: CssicornRuleFixer}} CssicornSuggestion
@typedef {Omit<ViolationReportBase, 'fix' | 'suggest'> & ViolationMessage & ViolationLocation<CssNodePlain> & {
	fix?: CssicornRuleFixer
	suggest?: CssicornSuggestion[]
}} CssicornProblem
@typedef {CssicornProblem | undefined | CssicornProblem[] | IterableIterator<CssicornProblem>} CssicornProblems
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
