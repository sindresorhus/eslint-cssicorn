import assert from 'node:assert/strict';
import createCssicornContext from './cssicorn-context.js';
import CssicornListeners from './cssicorn-listeners.js';

/**
@import * as ESLint from 'eslint';
@import {CssicornContext} from './cssicorn-context.js';
@import {EslintListers, ListenerType, EslintListener} from './to-eslint-listener.js'
*/

/**
@typedef {ESLint.Rule.RuleModule['create']} EslintCreate
@typedef {(context: CssicornContext) => void} CssicornCreate
*/

// `checkVueTemplate` function will wrap `create` function, there is no need to wrap twice
const wrappedFunctions = new Set();
const markFunctionWrapped = create => {
	wrappedFunctions.add(create);
	return create;
};

/**
Convert Cssicorn style of `create` to ESLint style

@param {CssicornCreate} cssicornCreate
@returns {EslintCreate}
*/
export default function toEslintCreate(cssicornCreate) {
	if (wrappedFunctions.has(cssicornCreate)) {
		return cssicornCreate;
	}

	return eslintContext => {
		const cssicornListeners = new CssicornListeners(eslintContext);
		const cssicornContext = createCssicornContext(eslintContext, cssicornListeners);

		const result = cssicornCreate(cssicornContext);

		assert.equal(result, undefined, `[${eslintContext.id}] Rule \`create\` function should return \`undefined\`, please use \`context.on()\` instead of return listeners.`);

		const eslintListeners = cssicornListeners.toEslintListeners();

		return eslintListeners;
	};
}

export {markFunctionWrapped};
