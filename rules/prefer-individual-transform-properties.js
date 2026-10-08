import {
	clone,
	generate,
	keyword,
	walk,
} from '@eslint/css-tree';
import {
	getCommaSeparatedGroups,
	hasCommentInRange,
	hasSubstitutionOrRandomFunction,
	isCssModulesInteropDeclaration,
	isKeyframesAtRule,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID_ERROR = 'prefer-individual-transform-properties/error';
const MESSAGE_ID_SUGGESTION = 'prefer-individual-transform-properties/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer individual transform properties over this `transform` declaration.',
	[MESSAGE_ID_SUGGESTION]: 'Convert to individual transform properties.',
};

const functionPattern = /^(?<property>translate|rotate|scale)(?<variant>[xyz]|3d)?$/v;
const propertyOrder = ['translate', 'rotate', 'scale'];
const conflictingProperties = new Set([...propertyOrder, 'offset', 'offset-path']);
// Check the spelling instead of numeric conversion, which can underflow a nonzero number to zero.
const zeroPattern = /^[+\-]?[.0]+(?:e[+\-]?\d+)?$/iv;

function getPropertyValue(arguments_, property, variant) {
	const neutral = property === 'scale' ? '1' : '0';
	if (property === 'rotate') {
		if (variant === 'x' || variant === 'y') {
			arguments_.unshift(variant);
		}
	} else if (variant === 'y') {
		arguments_.unshift(neutral);
	} else if (variant === 'z') {
		arguments_.unshift(neutral, neutral);
	} else if (property === 'scale' && variant === 'x') {
		arguments_.push(neutral);
	}

	return arguments_.join(' ');
}

function getTransformProperties(value, sourceCode) {
	if (
		value.type !== 'Value'
		|| !value.children?.length
		|| value.children.length > 3
		|| value.children.some(node => node.type !== 'Function' || !functionPattern.test(normalizeCssIdentifier(node.name)))
		|| hasSubstitutionOrRandomFunction(value)
	) {
		return;
	}

	// The lexer does not decode escaped names or units. Normalize a copy while keeping source spelling for suggestions.
	const normalizedValue = clone(value);
	walk(normalizedValue, node => {
		if (node.type === 'Function' || node.type === 'Identifier') {
			node.name = normalizeCssIdentifier(node.name);
		} else if (node.type === 'Dimension') {
			node.unit = normalizeCssIdentifier(node.unit);
		}
	});
	if (!sourceCode.lexer.matchProperty('transform', normalizedValue).matched) {
		return;
	}

	const properties = [];
	let previousOrder = -1;
	for (const node of normalizedValue.children) {
		const {property, variant} = functionPattern.exec(node.name).groups;
		const order = propertyOrder.indexOf(property);
		if (order <= previousOrder) {
			return;
		}

		previousOrder = order;
		const arguments_ = getCommaSeparatedGroups(node);
		// Each comma-separated argument must be one scalar, not a whitespace-separated list.
		if (arguments_.some(argument => argument.nodes.length !== 1)) {
			return;
		}

		const argumentNodes = arguments_.map(argument => argument.nodes[0]);
		const argumentTexts = argumentNodes.map(argument => sourceCode.getText(argument));
		const normalizedArguments = argumentNodes.map(argument => generate(argument));
		const angle = argumentNodes.at(-1);
		if (property === 'rotate' && angle.type === 'Number') {
			if (!zeroPattern.test(angle.value)) {
				return;
			}

			// Transform functions accept unitless zero angles, but the rotate property requires an angle.
			argumentTexts[argumentTexts.length - 1] += 'deg';
			normalizedArguments[normalizedArguments.length - 1] += 'deg';
		}

		const propertyValue = getPropertyValue(argumentTexts, property, variant);
		const normalizedPropertyValue = getPropertyValue(normalizedArguments, property, variant);
		if (!sourceCode.lexer.matchProperty(property, normalizedPropertyValue).matched) {
			return;
		}

		properties.push({property, value: propertyValue});
	}

	return properties;
}

function getReplacement(declaration, properties, sourceCode, lineEnding) {
	const [start] = sourceCode.getRange(declaration);
	const end = start + sourceCode.getText(declaration).replace(/[\t\n\f\r ]+$/u, '').length;
	const [valueStart] = sourceCode.getRange(declaration.value);
	const [, valueEnd] = sourceCode.getRange(declaration.value.children.at(-1));
	const colon = sourceCode.text.slice(start + declaration.property.length, valueStart);
	const suffix = sourceCode.text.slice(valueEnd, end);
	const lineStart = start - (sourceCode.getLoc(declaration).start.column - 1);
	const indentation = sourceCode.text.slice(lineStart, start);
	const separator = /^[\t ]*$/u.test(indentation) && lineEnding ? `;${lineEnding}${indentation}` : '; ';
	return {
		fixRange: [start, end],
		text: properties.map(({property, value}) => `${property}${colon}${value}${suffix}`).join(separator),
	};
}

/**
@param {CssicornContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const lineEnding = sourceCode.text.match(/\r\n|[\n\f\r]/u)?.[0];
	context.on('Block', block => {
		let declaration;
		for (const child of block.children) {
			if (child.type !== 'Declaration') {
				continue;
			}

			const property = normalizeCssIdentifier(child.property);
			if (conflictingProperties.has(property)) {
				return;
			}

			if (!property.endsWith('transform') || keyword(property).basename !== 'transform') {
				continue;
			}

			if (property !== 'transform' || declaration) {
				return;
			}

			declaration = child;
		}

		if (!declaration || isCssModulesInteropDeclaration(declaration, context)) {
			return;
		}

		const ancestors = sourceCode.getAncestors(declaration);
		if (ancestors.every(node => node.type !== 'Rule') || ancestors.some(node => isKeyframesAtRule(node))) {
			return;
		}

		const properties = getTransformProperties(declaration.value, sourceCode);
		if (!properties) {
			return;
		}

		const problem = {node: declaration, messageId: MESSAGE_ID_ERROR};
		if (hasCommentInRange(context, sourceCode.getRange(declaration))) {
			return problem;
		}

		const {fixRange, text} = getReplacement(declaration, properties, sourceCode, lineEnding);
		return {
			...problem,
			suggest: [{
				messageId: MESSAGE_ID_SUGGESTION,
				fix: fixer => fixer.replaceTextRange(fixRange, text),
			}],
		};
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
			description: 'Prefer individual transform properties over transform functions.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
