import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
@import {DeclarationPlain} from '@eslint/css-tree';
@import {CSSRuleDefinition} from '@eslint/css';
*/

/**
Check whether a declaration is inside a CSS Modules (ICSS) `:export` or `:import(…)` block. JavaScript reads these declarations as exact strings, so they must not be changed like CSS.

@param {DeclarationPlain} declaration - The `Declaration` node.
@param {Parameters<CSSRuleDefinition['create']>[0]} context
@returns {boolean}
*/
export default function isCssModulesInteropDeclaration(declaration, context) {
	const {sourceCode} = context;
	const block = sourceCode.getParent(declaration);
	const rule = block?.type === 'Block' ? sourceCode.getParent(block) : undefined;
	if (
		rule?.type !== 'Rule'
		|| rule.prelude.type !== 'SelectorList'
		|| rule.prelude.children.length !== 1
	) {
		return false;
	}

	const [selector] = rule.prelude.children;
	if (selector.type !== 'Selector' || selector.children.length !== 1) {
		return false;
	}

	const [pseudoClass] = selector.children;
	if (pseudoClass.type !== 'PseudoClassSelector') {
		return false;
	}

	const name = normalizeCssIdentifier(pseudoClass.name);
	return (name === 'export' && pseudoClass.children === null)
		|| (name === 'import' && pseudoClass.children !== null);
}
