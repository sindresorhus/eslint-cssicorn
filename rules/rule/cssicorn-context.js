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
	// A plain object instead of a `Proxy`, because rules read `context.sourceCode` very often, and a `Proxy` makes every property read slow. Inheriting from the ESLint context with `Object.create()` is also slower, as it turns each ESLint context into a prototype.
	/**
	@type {CssicornContext}
	*/
	const context = {
		cwd: eslintContext.cwd,
		filename: eslintContext.filename,
		physicalFilename: eslintContext.physicalFilename,
		sourceCode: eslintContext.sourceCode,
		settings: eslintContext.settings,
		languageOptions: eslintContext.languageOptions,
		id: eslintContext.id,
		options: eslintContext.options,
		report: eslintContext.report,
		on: listeners.on.bind(listeners),
		onExit: listeners.onExit.bind(listeners),
	};

	return context;
}
