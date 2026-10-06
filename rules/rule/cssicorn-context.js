// @ts-check

/**
@import {CSSRuleDefinition, CSSRuleVisitor} from '@eslint/css';
@import {CssNodePlain} from '@eslint/css-tree';
@import CssicornListeners from './cssicorn-listeners.js';
@import {CssicornProblems} from './to-eslint-problem.js';
*/

/**
@typedef {Parameters<CSSRuleDefinition['create']>[0]} CssRuleContext
*/

/**
@template {CssNodePlain['type']} [NodeType=CssNodePlain['type']]
@typedef {(node: Parameters<NonNullable<CSSRuleVisitor[NodeType]>>[0], parent: Parameters<NonNullable<CSSRuleVisitor[NodeType]>>[1]) => CssicornProblems} CssicornRuleListener
*/

/**
@typedef {<NodeType extends CssNodePlain['type']>(type: NodeType | NodeType[], listener: CssicornRuleListener<NodeType>) => void} CssicornRuleListen
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
