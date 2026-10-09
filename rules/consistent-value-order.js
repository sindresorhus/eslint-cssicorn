import {ident} from '@eslint/css-tree';
import {colorFunctions} from './shared/css-color-functions.js';
import mathFunctions from './shared/css-math-functions.js';
import {getVendorPrefix} from './shared/css-shorthand-properties.js';
import {
	getCanonicalLexerNode,
	getCommaSeparatedGroups,
	hasCommentInRange,
	hasSubstitutionOrRandomFunction,
	isCssModulesInteropDeclaration,
	normalizeCssIdentifier,
	toLocation,
} from './utils/index.js';

/**
@import {CssNodePlain} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornRuleFixer} from './rule/to-eslint-rule-fixer.js';
*/

const MESSAGE_ID = 'consistent-value-order';
const messages = {
	[MESSAGE_ID]: 'Use consistent ordering for `{{property}}` value components.',
};

const borderOrder = ['line-width', 'line-style', 'color'];
const propertyOrders = new Map([
	...[
		'border',
		'border-top',
		'border-right',
		'border-bottom',
		'border-left',
		'border-block',
		'border-inline',
		'border-block-start',
		'border-block-end',
		'border-inline-start',
		'border-inline-end',
	].map(property => [property, borderOrder]),
	['outline', ['outline-width', 'outline-style', 'outline-color']],
	['column-rule', ['column-rule-width', 'column-rule-style', 'column-rule-color']],
	['flex-flow', ['flex-direction', 'flex-wrap']],
	['box-shadow', ['inset', 'length', 'color']],
	['text-shadow', ['length', 'color']],
	['columns', ['column-width', 'column-count']],
	['text-decoration', ['text-decoration-line', 'text-decoration-thickness', 'text-decoration-style', 'text-decoration-color']],
	['text-emphasis', ['text-emphasis-style', 'text-emphasis-color']],
	['text-wrap', ['text-wrap-mode', 'text-wrap-style']],
	['white-space', ['white-space-collapse', 'text-wrap-mode', 'white-space-trim']],
]);

const getComponentRank = (node, order, matchResult) => order.findIndex(component => component === 'inset'
	? node.type === 'Identifier' && normalizeCssIdentifier(node.name) === 'inset'
	: matchResult.isType(node, component) || matchResult.isProperty(node, component));

const isColumnComponent = node => {
	if (node.type === 'Number') {
		const number = Number(node.value);
		return Number.isSafeInteger(number) && number > 0;
	}

	return ['Identifier', 'Dimension', 'Function'].includes(node.type);
};

/**
Use a matching placeholder for known color or math functions containing substitutions or randomness. Match random() as calc() because the lexer does not recognize it. The original component is retained for fixes.

@param {CssNodePlain} node
@returns {CssNodePlain}
*/
const getMatchingComponent = node => {
	if (node.type !== 'Function') {
		return node;
	}

	const name = normalizeCssIdentifier(node.name);
	if (
		(!colorFunctions.has(name) && !mathFunctions.has(name))
		|| !hasSubstitutionOrRandomFunction(node)
	) {
		return node;
	}

	return colorFunctions.has(name)
		? {type: 'Identifier', name: 'transparent'}
		: {...node, name: name === 'random' ? 'calc' : node.name, children: [{type: 'Number', value: '1'}]};
};

const getGroupProblem = (nodes, canonicalNodes, {order, matchResult, property, context}) => {
	const components = nodes.map((node, index) => ({
		node,
		rank: getComponentRank(canonicalNodes[index], order, matchResult),
	}));
	if (components.some(({rank}) => rank === -1)) {
		return;
	}

	// Equal-ranked lengths keep their positional meaning, and shadow layers are never reordered.
	const sortedComponents = components.toSorted((first, second) => first.rank - second.rank);
	const firstChangedIndex = components.findIndex((component, index) => component !== sortedComponents[index]);
	if (firstChangedIndex === -1) {
		return;
	}

	// Preserve random-function occurrence order, including in Raw variable fallbacks and unresolved substitutions.
	const dynamicComponents = components.filter(({node}) => hasSubstitutionOrRandomFunction(node));
	if (dynamicComponents.some(({rank}, index) => index > 0 && rank < dynamicComponents[index - 1].rank)) {
		return;
	}

	const lastChangedIndex = components.findLastIndex((component, index) => component !== sortedComponents[index]);
	const {sourceCode} = context;
	const range = [sourceCode.getRange(nodes[0])[0], sourceCode.getRange(nodes.at(-1))[1]];
	const fixRange = [sourceCode.getRange(nodes[firstChangedIndex])[0], sourceCode.getRange(nodes[lastChangedIndex])[1]];
	const getSeparator = index => sourceCode.text.slice(sourceCode.getRange(nodes[index - 1])[1], sourceCode.getRange(nodes[index])[0]);
	return {
		loc: toLocation(range, context),
		messageId: MESSAGE_ID,
		data: {property},
		/**
		@param {Parameters<CssicornRuleFixer>[0]} fixer
		*/
		fix(fixer, {abort}) {
			if (components.some((component, index) => component !== sortedComponents[index] && hasCommentInRange(context, sourceCode.getRange(component.node)))) {
				return abort();
			}

			// Leave unchanged prefix and suffix components and their comments outside the replacement.
			let replacement = firstChangedIndex > 0 && !getSeparator(firstChangedIndex) ? ' ' : '';
			for (let index = firstChangedIndex; index <= lastChangedIndex; index++) {
				if (index > firstChangedIndex) {
					const separator = getSeparator(index);
					// Adjacent functions can originally need no whitespace, but reordered tokens may merge.
					replacement += separator || ' ';
				}

				const {node} = sortedComponents[index];
				const text = sourceCode.getText(node);
				replacement += text;
				// A terminating hexadecimal escape consumes one whitespace character before the token separator.
				if (index < sortedComponents.length - 1 && text.includes('\\') && ident.decode(`${text} `) === ident.decode(text)) {
					replacement += ' ';
				}
			}

			if (lastChangedIndex < nodes.length - 1 && !getSeparator(lastChangedIndex + 1)) {
				replacement += ' ';
			}

			return fixer.replaceTextRange(fixRange, replacement);
		},
	};
};

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Declaration', function * (declaration) {
		const normalizedProperty = normalizeCssIdentifier(declaration.property);
		const property = normalizedProperty.slice(getVendorPrefix(normalizedProperty).length);
		const order = propertyOrders.get(property);
		const {value} = declaration;
		if (
			!order
			|| value.type !== 'Value'
			|| value.children.length < 2
			|| isCssModulesInteropDeclaration(declaration, context)
		) {
			return;
		}

		const isShadow = property === 'box-shadow' || property === 'text-shadow';

		// Literal commas isolate shadow layers even when substitutions expand into additional layers; a slash similarly isolates column width/count from height.
		const groups = isShadow ? getCommaSeparatedGroups(value) : [{nodes: value.children}];
		for (const {nodes} of groups) {
			const slashIndex = property === 'columns' ? nodes.findIndex(node => node.type === 'Operator' && node.value === '/') : -1;
			const componentNodes = slashIndex === -1 ? nodes : nodes.slice(0, slashIndex);
			if (componentNodes.length < 2 || (property === 'columns' && componentNodes.some(node => !isColumnComponent(node)))) {
				continue;
			}

			const groupValue = {...value, children: componentNodes.map(node => getMatchingComponent(node))};
			if (hasSubstitutionOrRandomFunction(groupValue)) {
				continue;
			}

			const canonicalValue = getCanonicalLexerNode(groupValue);
			const matchResult = sourceCode.lexer.matchProperty(property, canonicalValue);
			if (!matchResult.matched) {
				continue;
			}

			const problem = getGroupProblem(componentNodes, canonicalValue.children, {
				order, matchResult, property, context,
			});
			if (problem) {
				yield problem;
			}
		}
	});
};

/**
@type {CssicornRule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent ordering of CSS value components.',
			recommended: true,
		},
		fixable: 'code',
		messages,
		languages: ['css/css'],
	},
};

export default config;
