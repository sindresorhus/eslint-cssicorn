import {walk} from '@eslint/css-tree';
import {
	getCommaSeparatedGroups,
	getContainingDeclaration,
	hasCommentInRange,
	hasSubstitutionOrRandomFunction,
	isCssModulesInteropDeclaration,
	isSubstitutionFunction,
	normalizeCssIdentifier,
	parseCustomPropertyDeclaration,
	toLocation,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID = 'prefer-clamp';
const messages = {
	[MESSAGE_ID]: 'Prefer `clamp()` over nested `min()` and `max()`.',
};

const comparisonFunctionPattern = /(?:min|max)\(|\\/iv;

function getTwoArguments(node) {
	if (!node.children) {
		return;
	}

	const groups = getCommaSeparatedGroups(node);
	if (groups.length === 2 && groups.every(group => group.nodes.length > 0)) {
		return groups;
	}
}

const isNone = argument => argument.nodes.length === 1
	&& argument.nodes[0].type === 'Identifier'
	&& normalizeCssIdentifier(argument.nodes[0].name) === 'none';

/**
Get a single node, looking through calc() and parentheses without evaluating arithmetic.
*/
function getUnwrappedNode(nodes) {
	while (nodes.length === 1) {
		const [node] = nodes;
		if (node.type !== 'Parentheses' && !(node.type === 'Function' && normalizeCssIdentifier(node.name) === 'calc')) {
			return node;
		}

		nodes = [...node.children];
	}
}

/**
Check literal bounds without resolving units or percentages. Percentages can have a negative reference size, which reverses their order.
*/
function areOrderedBounds(minimum, maximum) {
	const minimumNode = getUnwrappedNode(minimum.nodes);
	const maximumNode = getUnwrappedNode(maximum.nodes);
	if (!minimumNode || !maximumNode) {
		return false;
	}

	if (
		minimumNode.type !== maximumNode.type
		|| (minimumNode.type !== 'Number' && minimumNode.type !== 'Dimension')
		|| (minimumNode.type === 'Dimension' && normalizeCssIdentifier(minimumNode.unit) !== normalizeCssIdentifier(maximumNode.unit))
	) {
		return false;
	}

	const minimumValue = Number(minimumNode.value);
	const maximumValue = Number(maximumNode.value);
	// CSS zero literals are unsigned regardless of their written sign, so the ordinary numeric comparison is sufficient.
	return Number.isFinite(minimumValue)
		&& Number.isFinite(maximumValue)
		&& minimumValue <= maximumValue;
}

/**
Get an argument's original text, including surrounding whitespace, for a fix that reorders arguments.
*/
function getArgumentText(argument, functionNode, context) {
	const {sourceCode} = context;
	const [functionStart, functionEnd] = sourceCode.getRange(functionNode);
	const start = argument.previousComma
		? sourceCode.getRange(argument.previousComma)[1]
		: functionStart + functionNode.name.length + 1;
	const end = argument.nextComma
		? sourceCode.getRange(argument.nextComma)[0]
		: functionEnd - 1;
	return sourceCode.text.slice(start, end);
}

function getClampProblem(node, context, reportNode = node) {
	const {sourceCode} = context;
	const name = normalizeCssIdentifier(node.name);
	if (name !== 'max' && name !== 'min') {
		return;
	}

	const outerArguments = getTwoArguments(node);
	if (!outerArguments) {
		return;
	}

	const oppositeName = name === 'max' ? 'min' : 'max';
	const nestedArguments = outerArguments.filter(argument => argument.nodes.length === 1
		&& argument.nodes[0].type === 'Function'
		&& normalizeCssIdentifier(argument.nodes[0].name) === oppositeName);
	if (nestedArguments.length !== 1) {
		return;
	}

	const [nestedArgument] = nestedArguments;
	const [innerNode] = nestedArgument.nodes;
	const innerArguments = getTwoArguments(innerNode);
	if (!innerArguments) {
		return;
	}

	// Keeping argument order preserves random() indices, including random calls introduced by substitutions.
	const preservesOrder = name === 'max' && nestedArgument === outerArguments[1];

	const bound = outerArguments.find(argument => argument !== nestedArgument);
	let clampArguments;
	if (name === 'max') {
		if (isNone(bound) || isNone(innerArguments[1])) {
			return;
		}

		clampArguments = [bound, ...innerArguments];
	} else {
		const minimum = innerArguments.find(argument => areOrderedBounds(argument, bound));
		if (!minimum) {
			return;
		}

		clampArguments = [minimum, innerArguments.find(argument => argument !== minimum), bound];
	}

	// Substitutions inside retained functions and parentheses cannot change argument counts or introduce none bounds.
	if (preservesOrder ? clampArguments.some(argument => argument.nodes.some(target => isSubstitutionFunction(target))) : hasSubstitutionOrRandomFunction(node)) {
		return;
	}

	const range = sourceCode.getRange(node);
	const innerRange = sourceCode.getRange(innerNode);
	const problem = {
		node: reportNode,
		loc: toLocation(range, context),
		messageId: MESSAGE_ID,
	};
	if (!preservesOrder && hasCommentInRange(context, range)) {
		return problem;
	}

	return {
		...problem,
		* fix(fixer) {
			if (preservesOrder) {
				yield fixer.replaceTextRange([range[0], range[0] + node.name.length], 'clamp');
				yield fixer.removeRange([innerRange[0], innerRange[0] + innerNode.name.length + 1]);
				yield fixer.removeRange([innerRange[1] - 1, innerRange[1]]);
				return;
			}

			const argumentsText = clampArguments.map((argument, index) => {
				const text = getArgumentText(argument, argument === bound ? node : innerNode, context);
				if (index === 0) {
					return text.replace(/^[\t ]+/v, '');
				}

				return /^\s/v.test(text) ? text : ` ${text}`;
			});
			yield fixer.replaceTextRange(range, `clamp(${argumentsText.join(',')})`);
		},
	};
}

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Function', node => {
		const problem = getClampProblem(node, context);
		if (!problem) {
			return;
		}

		const declaration = getContainingDeclaration(node, context);
		if (
			!declaration
			|| sourceCode.getParent(declaration).type !== 'Block'
			|| isCssModulesInteropDeclaration(declaration, context)
		) {
			return;
		}

		return problem;
	});

	context.on('Declaration', declaration => {
		if (
			!declaration.property.startsWith('--')
			|| declaration.value.type !== 'Raw'
			|| !comparisonFunctionPattern.test(declaration.value.value)
			|| sourceCode.getParent(declaration).type !== 'Block'
			|| isCssModulesInteropDeclaration(declaration, context)
		) {
			return;
		}

		const parsed = parseCustomPropertyDeclaration(declaration, context);
		if (parsed?.value.type !== 'Value') {
			return;
		}

		const problems = [];
		walk(parsed.value, node => {
			if (node.type !== 'Function') {
				return;
			}

			const problem = getClampProblem(node, context, declaration);
			if (problem) {
				problems.push(problem);
			}
		});
		return problems;
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
			description: 'Prefer `clamp()` over nested `min()` and `max()`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
