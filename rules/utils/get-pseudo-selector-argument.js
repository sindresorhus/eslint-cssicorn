import {parse, toPlainObject} from '@eslint/css-tree';
import normalizeCssIdentifier from './normalize-css-identifier.js';

/**
Get a pseudo-selector's selector argument, parsing arguments of escaped names while preserving their source ranges.

@param {import('@eslint/css-tree').PseudoClassSelectorPlain | import('@eslint/css-tree').PseudoElementSelectorPlain} node
@param {import('../rule/cssicorn-context.js').CssicornContext} context
@returns {import('@eslint/css-tree').SelectorPlain | import('@eslint/css-tree').SelectorListPlain | import('@eslint/css-tree').NthPlain | undefined}
*/
export default function getPseudoSelectorArgument(node, context) {
	if (node.children?.length !== 1) {
		return;
	}

	let [argument] = node.children;
	// CSSTree leaves arguments of escaped pseudo-selector names unparsed.
	if (argument.type === 'Raw') {
		const prefix = `${node.type === 'PseudoElementSelector' ? '::' : ':'}${normalizeCssIdentifier(node.name)}(`;
		try {
			const selector = toPlainObject(parse(`${prefix}${argument.value})`, {
				context: 'selector',
				positions: true,
				offset: context.sourceCode.getRange(argument)[0] - prefix.length,
			}));
			argument = selector.children.at(0)?.children?.at(0);
		} catch {
			return;
		}
	}

	return argument?.type === 'Selector' || argument?.type === 'SelectorList' || argument?.type === 'Nth' ? argument : undefined;
}
