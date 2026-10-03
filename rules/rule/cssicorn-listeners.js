import toEslintListener from './to-eslint-listener.js';

/**
@import {CSSRuleVisitor} from '@eslint/css';
@import {CssNodePlain} from '@eslint/css-tree';
@import {CssRuleContext, CssicornRuleListener} from './cssicorn-context.js';
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
		const eslintListeners = {};

		for (const [selector, listeners] of this.#listeners) {
			eslintListeners[selector] = toEslintListener(this.#context, listeners);
		}

		return eslintListeners;
	}
}
