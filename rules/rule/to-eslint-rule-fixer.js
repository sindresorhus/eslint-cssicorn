import {forEachFixOrProblem} from './utilities.js';

/**
@import {RuleFixer, RuleTextEdit, RuleTextEditor} from '@eslint/core';
@import {CssNodePlain} from '@eslint/css-tree';
*/

class FixAbortError extends Error {
	name = 'FixAbortError';
}

const fixOptions = {
	abort() {
		throw new FixAbortError('Fix aborted.');
	},
};

/**
@typedef {RuleTextEdit | undefined} EslintReportFixer
@typedef {EslintReportFixer | IterableIterator<EslintReportFixer>} CssicornReportFixer
@typedef {(fixer: RuleTextEditor<CssNodePlain>, options: typeof fixOptions) => CssicornReportFixer} CssicornRuleFixer
*/

/**
Convert Cssicorn style fix function to ESLint style fix function

@param {CssicornRuleFixer} fix
@returns {RuleFixer}
*/
export default function toEslintRuleFixer(fix) {
	/**
	@param {RuleTextEditor<CssNodePlain>} fixer
	*/
	return fixer => {
		const cssicornReport = fix(fixer, fixOptions);

		const eslintReport = [];

		try {
			forEachFixOrProblem(cssicornReport, eslintFix => {
				eslintReport.push(eslintFix);
			});

			return eslintReport;
		} catch (error) {
			if (error instanceof FixAbortError) {
				return [];
			}

			/* c8 ignore next */
			throw error;
		}
	};
}
