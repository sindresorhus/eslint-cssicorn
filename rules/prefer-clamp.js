import {parse, walk} from '@eslint/css-tree';
import {
	getCommaSeparatedGroups,
	hasCommentInRange,
	hasSubstitutionOrRandomFunction,
	isCssModulesInteropDeclaration,
	normalizeCssIdentifier,
	toLocation,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-clamp';
const messages = {
	[MESSAGE_ID]: 'Prefer `clamp()` over nested `min()` and `max()`.',
};

const comparisonFunctionPattern = /(?:min|max)\(|\\/iv;
const getRange = (node, offset, context) => context.sourceCode.getRange(node).map(index => index + offset);

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
Check literal bounds without resolving units or percentages. Percentages can have a negative reference size, which reverses their order.
*/
function areOrderedBounds(minimum, maximum) {
	if (minimum.nodes.length !== 1 || maximum.nodes.length !== 1) {
		return false;
	}

	const [minimumNode] = minimum.nodes;
	const [maximumNode] = maximum.nodes;
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
function getArgumentText(argument, functionNode, offset, context) {
	const [functionStart, functionEnd] = getRange(functionNode, offset, context);
	const start = argument.previousComma
		? getRange(argument.previousComma, offset, context)[1]
		: functionStart + functionNode.name.length + 1;
	const end = argument.nextComma
		? getRange(argument.nextComma, offset, context)[0]
		: functionEnd - 1;
	return context.sourceCode.text.slice(start, end);
}

function getClampProblem(node, offset, context, reportNode = node) {
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
	if (!innerArguments || hasSubstitutionOrRandomFunction(node)) {
		return;
	}

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

	const range = getRange(node, offset, context);
	const innerRange = getRange(innerNode, offset, context);
	const preservesOrder = name === 'max' && nestedArgument === outerArguments[1];
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
				const text = getArgumentText(argument, argument === bound ? node : innerNode, offset, context);
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
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Function', node => {
		const problem = getClampProblem(node, 0, context);
		if (!problem) {
			return;
		}

		const declaration = sourceCode.getAncestors(node).findLast(ancestor => ancestor.type === 'Declaration');
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

		let parsed;
		try {
			parsed = parse(sourceCode.getText(declaration), {
				context: 'declaration',
				parseCustomProperty: true,
				positions: true,
			});
		} catch {
			return;
		}

		if (parsed.value.type !== 'Value') {
			return;
		}

		const problems = [];
		const [offset] = sourceCode.getRange(declaration);
		walk(parsed.value, node => {
			if (node.type !== 'Function') {
				return;
			}

			const problem = getClampProblem(node, offset, context, declaration);
			if (problem) {
				problems.push(problem);
			}
		});
		return problems;
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `clamp()` over nested `min()` and `max()`.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
