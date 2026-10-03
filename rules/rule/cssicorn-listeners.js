import toEslintListener from './to-eslint-listener.js';

/**
@import {CssRuleContext} from './cssicorn-context.js';
@import {EslintListeners, ListenerType, CssicornListener} from './to-eslint-listener.js';
*/

export default class CssicornListeners {
	#context;
	#listeners = new Map();

	/**
	@param {CssRuleContext} context
	*/
	constructor(context) {
		this.#context = context;
	}

	#addEventListener(selectors, listener) {
		const listeners = this.#listeners;
		for (const selector of selectors) {
			if (listeners.has(selector)) {
				listeners.get(selector).push(listener);
			} else {
				listeners.set(selector, [listener]);
			}
		}
	}

	/**
	@template {ListenerType} Type
	@param {Type | Type[]} selectorOrSelectors
	@param {CssicornListener<Type>} listener
	*/
	on(selectorOrSelectors, listener) {
		const selectors = Array.isArray(selectorOrSelectors) ? selectorOrSelectors : [selectorOrSelectors];
		this.#addEventListener(selectors, listener);
	}

	/**
	@template {ListenerType} Type
	@param {Type | Type[]} selectorOrSelectors
	@param {CssicornListener<Type>} listener
	*/
	onExit(selectorOrSelectors, listener) {
		const selectors = Array.isArray(selectorOrSelectors) ? selectorOrSelectors : [selectorOrSelectors];
		this.#addEventListener(selectors.map(selector => `${selector}:exit`), listener);
	}

	/**
	@returns {EslintListeners}
	*/
	toEslintListeners() {
		const eslintListeners = {};

		for (const [selector, listeners] of this.#listeners) {
			eslintListeners[selector] = toEslintListener(this.#context, listeners);
		}

		return eslintListeners;
	}
}
