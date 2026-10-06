import type {CSSRuleDefinition} from '@eslint/css';
import type {CssNodePlain, SelectorPlain} from '@eslint/css-tree';
import type {CssicornContext, CssicornRuleListener} from '../../rules/rule/cssicorn-context.js';
import type {CssicornRule} from '../../rules/rule/to-eslint-rule.js';
import type {CssicornFixer} from '../../rules/rule/to-eslint-rule-fixer.js';
import createCssicornContext from '../../rules/rule/cssicorn-context.js';
import CssicornListeners from '../../rules/rule/cssicorn-listeners.js';
import toEslintCreate from '../../rules/rule/to-eslint-create.js';
import toEslintRule from '../../rules/rule/to-eslint-rule.js';
import selectorOrderRule from '../../rules/consistent-compound-selector-order.js';
import layerOrderRule from '../../rules/consistent-layer-order.js';
import clampRule from '../../rules/prefer-clamp.js';

declare const context: CssicornContext;
declare const selector: SelectorPlain;
declare const fixer: CssicornFixer;

context.on('Selector', node => {
	const children: CssNodePlain[] = node.children;
	context.sourceCode.getText(node);
	context.sourceCode.getRange(node);
	// @ts-expect-error Selectors do not have a declaration's property.
	node.property;
	return {node, messageId: 'ordering', fix: fixer => fixer.replaceText(node, '#id.foo')};
});
context.onExit('Declaration', node => {
	const property: string = node.property;
	return [{node, messageId: property}];
});
context.on('Declaration', (node, parent: CssNodePlain) => {
	const parentType: CssNodePlain['type'] = parent.type;
});
context.on('StyleSheet', node => {
	const children: CssNodePlain[] = node.children;
});
context.on(['StyleSheet', 'Selector'], (node, parent?: CssNodePlain) => {
	const children: CssNodePlain[] = node.children;
});
// @ts-expect-error Root visitors cannot require a CSS parent.
context.on('StyleSheet', (node, parent: CssNodePlain) => undefined);
const collectSelectors = (node: SelectorPlain): void => {
	context.sourceCode.getText(node);
};
context.on('Selector', collectSelectors);
context.onExit('Selector', collectSelectors);
const noFix = (fixer: CssicornFixer): void => {
	fixer.replaceText(selector, '#id.foo');
};
context.on('Selector', node => ({node, messageId: 'ordering', fix: noFix}));
context.on('Selector', node => ({node, message: 'Use ordering', suggest: [{desc: 'Reorder', fix: fixer => fixer.replaceText(node, '#id.foo')}]}));
context.on('Selector', node => ({node, messageId: 'ordering', suggest: [{messageId: 'reorder', fix: fixer => fixer.replaceText(node, '#id.foo')}]}));
// @ts-expect-error Reports require a node or location.
context.on('Selector', () => ({messageId: 'ordering'}));
context.on(['IdSelector', 'ClassSelector'], node => {
	const name: string = node.name;
	// @ts-expect-error Simple selectors do not have children.
	node.children;
	return {node, messageId: name};
});
context.on('Selector', function * (node) {
	yield undefined;
	yield {
		node,
		messageId: 'ordering',
		* fix(fixer, {abort}) {
			if (node.children.length === 0) {
				abort();
			}

			yield undefined;
			yield fixer.replaceTextRange([0, 1], '#id');
		},
	};
});
// @ts-expect-error JavaScript nodes are not CSS listener targets.
context.on('CallExpression', () => undefined);
// @ts-expect-error A declaration listener cannot be used for selectors.
context.on('Selector', (node: Extract<CssNodePlain, {type: 'Declaration'}>) => undefined);

const listener: CssicornRuleListener<'Selector'> = node => ({node, messageId: 'ordering'});
context.on('Selector', listener);
fixer.replaceText(selector, '#id.foo');
const rule: CssicornRule = selectorOrderRule;
const layerRule: CssicornRule = layerOrderRule;
const comparisonRule: CssicornRule = clampRule;
const adapted: CSSRuleDefinition = toEslintRule('order', rule);
const create: CSSRuleDefinition['create'] = toEslintCreate(rule.create);
declare const eslintContext: Parameters<CSSRuleDefinition['create']>[0];
const listeners = new CssicornListeners(eslintContext);
listeners.on('Selector', listener);
const wrappedContext: CssicornContext = createCssicornContext(eslintContext, listeners);
