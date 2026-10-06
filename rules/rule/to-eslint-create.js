// @ts-check

import assert from 'node:assert/strict';
import createCssicornContext from './cssicorn-context.js';
import CssicornListeners from './cssicorn-listeners.js';

/**
@import {CSSRuleDefinition} from '@eslint/css';
@import {CssicornContext} from './cssicorn-context.js';
*/

/**
@typedef {CSSRuleDefinition['create']} EslintCreate
@typedef {(context: CssicornContext) => void} CssicornCreate
*/

// The rule adapter wraps each `create` function once.

/**
Convert Cssicorn style of `create` to ESLint style

@param {CssicornCreate} cssicornCreate
@returns {EslintCreate}
*/
export default function toEslintCreate(cssicornCreate) {
	return eslintContext => {
		const cssicornListeners = new CssicornListeners(eslintContext);
		const cssicornContext = createCssicornContext(eslintContext, cssicornListeners);

		const result = cssicornCreate(cssicornContext);

		assert.equal(result, undefined, `[${eslintContext.id}] Rule \`create\` function should return \`undefined\`, please use \`context.on()\` instead of return listeners.`);

		const eslintListeners = cssicornListeners.toEslintListeners();

		return eslintListeners;
	};
}
