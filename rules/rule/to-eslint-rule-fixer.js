import {forEachFixOrProblem} from './utilities.js';

/**
@import {RuleTextEditor} from '@eslint/core';
@import {CssNodePlain} from '@eslint/css-tree';
@import {EslintProblem} from './to-eslint-problem.js';
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
@typedef {NonNullable<EslintProblem['fix']>} EslintRuleFixer
@typedef {RuleTextEditor<CssNodePlain>} CssicornFixer
@typedef {ReturnType<CssicornFixer['replaceText']> | void} EslintReportFixer
@typedef {EslintReportFixer | Iterable<EslintReportFixer>} CssicornReportFixer
@typedef {(fixer: CssicornFixer, options: typeof fixOptions) => CssicornReportFixer} CssicornRuleFixer
*/

/**
Convert Cssicorn style fix function to ESLint style fix function

@param {CssicornRuleFixer} fix
@returns {EslintRuleFixer}
*/
export default function toEslintRuleFixer(fix) {
	/**
	@param {CssicornFixer} fixer
	*/
	return fixer => {
		const eslintReport = [];

		try {
			const cssicornReport = fix(fixer, fixOptions);
			forEachFixOrProblem(cssicornReport, eslintFix => {
				if (eslintFix) {
					eslintReport.push(eslintFix);
				}
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
