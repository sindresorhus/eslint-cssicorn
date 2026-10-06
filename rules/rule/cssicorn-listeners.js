// @ts-check

import toEslintListener from './to-eslint-listener.js';

/**
@import {CSSRuleVisitor} from '@eslint/css';
@import {CssNodePlain} from '@eslint/css-tree';
@import {CssRuleContext, CssicornRuleListener} from './cssicorn-context.js';
*/

export default class CssicornListeners {
	#context;
	/**
	@type {Map<string, CssicornRuleListener[]>}
	*/
	#listeners = new Map();

	/**
	@param {CssRuleContext} context
	*/
	constructor(context) {
		this.#context = context;
	}

	/**
	@template {CssNodePlain['type']} NodeType
	@param {string[]} selectors
	@param {CssicornRuleListener<NodeType>} listener
	*/
	#addEventListener(selectors, listener) {
		const listeners = this.#listeners;
		// Each stored listener is invoked only for its registered node type.
		const registeredListener = /** @type {CssicornRuleListener} */ (listener);
		for (const selector of selectors) {
			const registeredListeners = listeners.get(selector);
			if (registeredListeners) {
				registeredListeners.push(registeredListener);
			} else {
				listeners.set(selector, [registeredListener]);
			}
		}
	}

	/**
	@template {CssNodePlain['type']} NodeType
	@param {NodeType | NodeType[]} selectorOrSelectors
	@param {CssicornRuleListener<NodeType>} listener
	*/
	on(selectorOrSelectors, listener) {
		const selectors = Array.isArray(selectorOrSelectors) ? selectorOrSelectors : [selectorOrSelectors];
		this.#addEventListener(selectors, listener);
	}

	/**
	@template {CssNodePlain['type']} NodeType
	@param {NodeType | NodeType[]} selectorOrSelectors
	@param {CssicornRuleListener<NodeType>} listener
	*/
	onExit(selectorOrSelectors, listener) {
		const selectors = Array.isArray(selectorOrSelectors) ? selectorOrSelectors : [selectorOrSelectors];
		this.#addEventListener(selectors.map(selector => `${selector}:exit`), listener);
	}

	/**
	@returns {CSSRuleVisitor}
	*/
	toEslintListeners() {
		/**
		@type {CSSRuleVisitor}
		*/
		const eslintListeners = {};

		for (const [selector, listeners] of this.#listeners) {
			eslintListeners[selector] = toEslintListener(this.#context, listeners);
		}

		return eslintListeners;
	}
}
