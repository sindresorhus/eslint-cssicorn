import {forEachFixOrProblem} from './utilities.js';

/**
@import * as ESLint from 'eslint';
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
@typedef {ESLint.Rule.ReportFixer | undefined} EslintReportFixer
@typedef {EslintReportFixer | IterableIterator<EslintReportFixer>} CssicornReportFixer
@typedef {(fixer: ESLint.Rule.RuleFixer, options: typeof fixOptions) => CssicornReportFixer} CssicornRuleFixer
*/

/**
Convert Cssicorn style fix function to ESLint style fix function

@param {CssicornRuleFixer} fix
@returns {ESLint.Rule.RuleFixer}
*/
export default function toEslintRuleFixer(fix) {
	/**
	@param {CssicornReportFixer} fixer
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
				return;
			}

			/* c8 ignore next */
			throw error;
		}
	};
}
