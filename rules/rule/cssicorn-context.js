/**
@import {CSSRuleDefinition} from '@eslint/css';
@import CssicornListeners from './cssicorn-listeners.js';
@import {ListenerType, CssicornListener} from './to-eslint-listener.js';
*/

/**
@typedef {Parameters<CSSRuleDefinition['create']>[0]} CssRuleContext
@typedef {<Type extends ListenerType>(type: Type | Type[], listener: CssicornListener<Type>) => void} CssicornRuleListen
@typedef {CssRuleContext & {
	on: CssicornRuleListen
	onExit: CssicornRuleListen
}} CssicornContext
*/

/**
Create a better `Context` object with `on` and `onExit` method to add listeners

@param {CssRuleContext} eslintContext
@param {CssicornListeners} listeners
@returns {CssicornContext}
*/
export default function createCssicornContext(eslintContext, listeners) {
	/**
	@type {CssicornContext}
	*/
	const context = new Proxy(/** @type {CssicornContext} */ (eslintContext), {
		get(target, property, receiver) {
			if (property === 'on' || property === 'onExit') {
				return listeners[property].bind(listeners);
			}

			return Reflect.get(target, property, receiver);
		},
	});

	return context;
}
