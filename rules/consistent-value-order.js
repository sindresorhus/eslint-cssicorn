import {ident} from '@eslint/css-tree';
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
]);

const getComponentRank = (node, order, matchResult) => order.findIndex(component => component === 'inset'
	? node.type === 'Identifier' && normalizeCssIdentifier(node.name) === 'inset'
	: matchResult.isType(node, component) || matchResult.isProperty(node, component));

const isLiteralColumnComponent = node => {
	if (node.type === 'Number') {
		const number = Number(node.value);
		return Number.isSafeInteger(number) && number > 0;
	}

	return node.type === 'Identifier' || node.type === 'Dimension';
};

const getGroupProblem = (nodes, canonicalNodes, {order, matchResult, property, context}) => {
	if (nodes.length < 2) {
		return;
	}

	const components = nodes.map((node, index) => ({
		node,
		rank: getComponentRank(canonicalNodes[index], order, matchResult),
	}));
	if (components.some(({rank}) => rank === -1)) {
		return;
	}

	// Equal-ranked lengths keep their positional meaning, and shadow layers are never reordered.
	const sortedComponents = components.toSorted((first, second) => first.rank - second.rank);
	if (components.every((component, index) => component === sortedComponents[index])) {
		return;
	}

	const {sourceCode} = context;
	const range = [sourceCode.getRange(nodes[0])[0], sourceCode.getRange(nodes.at(-1))[1]];
	return {
		loc: toLocation(range, context),
		messageId: MESSAGE_ID,
		data: {property},
		/**
		@param {Parameters<CssicornRuleFixer>[0]} fixer
		*/
		fix(fixer, {abort}) {
			if (hasCommentInRange(context, range)) {
				return abort();
			}

			let replacement = '';
			for (const [index, {node}] of sortedComponents.entries()) {
				if (index > 0) {
					const separator = sourceCode.text.slice(sourceCode.getRange(nodes[index - 1])[1], sourceCode.getRange(nodes[index])[0]);
					// Adjacent functions can originally need no whitespace, but reordered tokens may merge.
					replacement += separator || ' ';
				}

				const text = sourceCode.getText(node);
				replacement += text;
				// A terminating hexadecimal escape consumes one whitespace character before the token separator.
				if (index < sortedComponents.length - 1 && text.includes('\\') && ident.decode(`${text} `) === ident.decode(text)) {
					replacement += ' ';
				}
			}

			return fixer.replaceTextRange(range, replacement);
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
			|| (property === 'columns' && value.children.some(node => !isLiteralColumnComponent(node)))
			|| hasSubstitutionOrRandomFunction(value)
		) {
			return;
		}

		const canonicalValue = getCanonicalLexerNode(value);
		const matchResult = sourceCode.lexer.matchProperty(property, canonicalValue);
		if (!matchResult.matched) {
			return;
		}

		const groups = getCommaSeparatedGroups(value);
		const canonicalGroups = getCommaSeparatedGroups(canonicalValue);
		for (const [index, {nodes}] of groups.entries()) {
			const problem = getGroupProblem(nodes, canonicalGroups[index].nodes, {
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
