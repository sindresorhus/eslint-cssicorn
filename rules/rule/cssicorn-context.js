/**
@import * as ESLint from 'eslint';
@import {CssicornListeners, ListenerType, Listener} from './to-eslint-create.js'
*/

/**
@typedef {(type: ListenerType | ListenerType[], listener: Listener) => ReturnType<Listener>} CssicornRuleListen
@typedef {ESLint.Rule.RuleContext & {
	on: CssicornRuleListen
	onExit: CssicornRuleListen
}} CssicornContext
*/

/**
Create a better `Context` object with `on` and `onExit` method to add listeners

@param {ESLint.Rule.RuleContext} eslintContext
@param {CssicornListeners} listeners
@returns {CssicornContext}
*/
export default function createCssicornContext(eslintContext, listeners) {
	/**
	@type {CssicornContext}
	*/
	const context = new Proxy(eslintContext, {
		get(target, property, receiver) {
			if (property === 'on' || property === 'onExit') {
				return listeners[property].bind(listeners);
			}

			return Reflect.get(target, property, receiver);
		},
	});

	return context;
}
