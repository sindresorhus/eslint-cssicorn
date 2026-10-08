import {walk} from '@eslint/css-tree';
import {
	getCanonicalLexerNode,
	isCssModulesInteropDeclaration,
	isStyleBlock,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID = 'prefer-aspect-ratio';
const messages = {
	[MESSAGE_ID]: 'Consider using `aspect-ratio` instead of this zero-height percentage-padding workaround.',
};

const targetProperties = new Set(['height', 'padding', 'padding-top', 'padding-bottom']);
const operatorPrecedence = new Map([['+', 1], ['-', 1], ['*', 2], ['/', 2]]);

/**
Apply constant arithmetic while tracking powers of the percentage unit.
*/
function getArithmeticValue(left, operator, right) {
	let value;
	let percentagePower;
	if (operator === '+' || operator === '-') {
		if (left.percentagePower !== right.percentagePower) {
			return;
		}

		value = operator === '+' ? left.value + right.value : left.value - right.value;
		percentagePower = left.percentagePower;
	} else if (operator === '*') {
		value = left.value * right.value;
		percentagePower = left.percentagePower + right.percentagePower;
	} else {
		if (right.value === 0) {
			return;
		}

		value = left.value / right.value;
		percentagePower = left.percentagePower - right.percentagePower;
	}

	if (Number.isFinite(value)) {
		return {value, percentagePower};
	}
}

/**
Evaluate only constant number/percentage calculations, without resolving lengths or substitutions.
*/
function getCalculationValue(node) {
	if (!node) {
		return;
	}

	if (node.type === 'Number' || node.type === 'Percentage') {
		const value = Number(node.value);
		if (Number.isFinite(value)) {
			return {value, percentagePower: node.type === 'Percentage' ? 1 : 0};
		}

		return;
	}

	if (node.type !== 'Parentheses' && !(node.type === 'Function' && normalizeCssIdentifier(node.name) === 'calc')) {
		return;
	}

	const {children} = node;
	let index = 0;
	function getExpressionValue(minimumPrecedence) {
		let left = getCalculationValue(children[index++]);
		if (!left) {
			return;
		}

		while (index < children.length) {
			const operatorNode = children[index];
			const operator = operatorNode.type === 'Operator' ? operatorNode.value.trim() : '';
			const precedence = operatorPrecedence.get(operator);
			if (precedence === undefined || precedence < minimumPrecedence) {
				break;
			}

			index++;
			const right = getExpressionValue(precedence + 1);
			if (!right) {
				return;
			}

			left = getArithmeticValue(left, operator, right);
			if (!left) {
				return;
			}
		}

		return left;
	}

	const result = getExpressionValue(1);
	return index === children.length ? result : undefined;
}

/**
Check whether a value is a positive, purely proportional percentage.
*/
function isPositivePercentage(node) {
	if (!node || (node.type !== 'Percentage' && !(node.type === 'Function' && normalizeCssIdentifier(node.name) === 'calc'))) {
		return false;
	}

	const result = getCalculationValue(node);
	return result !== undefined && result.percentagePower === 1 && result.value > 0;
}

/**
Check a literal zero, validating dimension units as CSS lengths.
*/
function isZeroLiteral(node, sourceCode) {
	if (!node || !['Number', 'Percentage', 'Dimension'].includes(node.type) || Number(node.value) !== 0) {
		return false;
	}

	return node.type !== 'Dimension' || Boolean(sourceCode.lexer.matchType('length', getCanonicalLexerNode(node)).matched);
}

/**
Check physical padding, limiting shorthands to zero horizontal padding and ratio-only vertical padding.
*/
function isRatioPadding(declaration, sourceCode) {
	if (declaration.value.type !== 'Value') {
		return false;
	}

	const {children} = declaration.value;
	if (normalizeCssIdentifier(declaration.property) !== 'padding') {
		return children.length === 1 && isPositivePercentage(children[0]);
	}

	if (children.length === 0 || children.length > 4) {
		return false;
	}

	const [top, right = top, bottom = top, left = right] = children;
	return isZeroLiteral(right, sourceCode)
		&& isZeroLiteral(left, sourceCode)
		&& (isZeroLiteral(top, sourceCode) || isPositivePercentage(top))
		&& (isZeroLiteral(bottom, sourceCode) || isPositivePercentage(bottom))
		&& (isPositivePercentage(top) || isPositivePercentage(bottom));
}

/**
Check whether a feature query explicitly tests native aspect-ratio, without interpreting Boolean conditions.
*/
function hasAspectRatioQuery(node) {
	if (node.type !== 'Atrule' || normalizeCssIdentifier(node.name) !== 'supports' || !node.prelude) {
		return false;
	}

	let hasAspectRatio = false;
	walk(node.prelude, {
		visit: 'SupportsDeclaration',
		enter(node) {
			if (normalizeCssIdentifier(node.declaration.property) === 'aspect-ratio') {
				hasAspectRatio = true;
			}
		},
	});
	return hasAspectRatio;
}

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	context.on('Block', block => {
		const declarations = new Map();
		for (const node of block.children) {
			if (node.type !== 'Declaration') {
				continue;
			}

			const property = normalizeCssIdentifier(node.property);
			if (['all', 'aspect-ratio'].includes(property) || property.startsWith('padding-block') || property.startsWith('padding-inline')) {
				return;
			}

			if (!targetProperties.has(property)) {
				continue;
			}

			if (declarations.has(property)) {
				return;
			}

			declarations.set(property, node);
		}

		const height = declarations.get('height');
		if (!height || height.value.type !== 'Value' || height.value.children.length !== 1) {
			return;
		}

		const [heightValue] = height.value.children;
		if (heightValue.type === 'Percentage' || !isZeroLiteral(heightValue, sourceCode)) {
			return;
		}

		if (declarations.has('padding') && (declarations.has('padding-top') || declarations.has('padding-bottom'))) {
			return;
		}

		const padding = declarations.values().find(node => node !== height && isRatioPadding(node, sourceCode));
		if (
			!padding
			|| isCssModulesInteropDeclaration(height, context)
			|| !isStyleBlock(block, context)
			|| sourceCode.getAncestors(block).some(node => hasAspectRatioQuery(node))
		) {
			return;
		}

		return {node: padding, messageId: MESSAGE_ID};
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
			description: 'Prefer `aspect-ratio` over zero-height percentage-padding workarounds.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
