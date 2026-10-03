// Type-check with: node node_modules/typescript/bin/tsc --noEmit --allowJs --module nodenext --target esnext --strict --skipLibCheck test/types/cssicorn-context.ts

import type {CssNodePlain, PseudoClassSelectorPlain} from '@eslint/css-tree';
import type {CssicornContext} from '../../rules/rule/cssicorn-context.js';

function verifyContext(context: CssicornContext) {
	context.sourceCode.ast.type satisfies 'StyleSheet';
	context.sourceCode.ast.children satisfies CssNodePlain[];

	// @ts-expect-error CSS source code does not expose JavaScript token APIs.
	context.sourceCode.getTokens(context.sourceCode.ast);

	context.on('PseudoClassSelector', (node, parent) => {
		node satisfies PseudoClassSelectorPlain;
		node.name satisfies string;
		parent satisfies CssNodePlain;
		context.sourceCode.getRange(node) satisfies [number, number];

		// @ts-expect-error Pseudo-class selectors have no value property.
		node.value;

		context.report({node, messageId: 'message'});

		// @ts-expect-error Reports must refer to CSS nodes.
		context.report({node: {type: 'CallExpression'}, messageId: 'message'});
		return {
			node,
			messageId: 'message',
			* fix(fixer, {abort}) {
				if (node.name === 'keep') {
					return abort();
				}

				yield fixer.replaceText(node, '.replacement');

				// @ts-expect-error Custom fixers accept CSS nodes.
				yield fixer.replaceText({type: 'CallExpression'}, 'replacement');
			},
		};
	});

	context.on(['ClassSelector', 'IdSelector'], node => {
		node.name satisfies string;

		// @ts-expect-error Both selected node types have names, not values.
		node.value;
	});

	context.onExit('StyleSheet', (node, parent) => {
		node.type satisfies 'StyleSheet';
		node.children satisfies CssNodePlain[];
		parent satisfies undefined;
	});

	context.on('Declaration', function * (node) {
		node.property satisfies string;
		yield {node, messageId: 'message'};
	});

	context.on('Identifier', node => ({
		node,
		messageId: 'message',
		suggest: [{
			messageId: 'suggestion',
			* fix(fixer, {abort}) {
				if (node.name === 'keep') {
					return abort();
				}

				yield fixer.replaceText(node, 'replacement');
			},
		}],
	}));

	// @ts-expect-error JavaScript AST node types are not CSS listeners.
	context.on('CallExpression', () => {});

	// @ts-expect-error Listener results must be problems or iterables of problems.
	context.on('Identifier', () => 'message');
}
