import {
	clone,
	definitionSyntax,
	ident,
	walk,
} from '@eslint/css-tree';
import {
	isCssModulesInteropDeclaration,
	normalizeCssIdentifier,
	toAsciiLowerCase,
	toLocation,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'lowercase';
const MESSAGE_ID_SPECIFICATION_CASE = 'specification-case';
const messages = {
	[MESSAGE_ID]: 'Use lowercase for CSS {{type}} `{{value}}`.',
	[MESSAGE_ID_SPECIFICATION_CASE]: 'Use `{{replacement}}` for CSS {{type}} `{{value}}`.',
};

const hexadecimalColorPattern = /^(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu;
const cssWhitespacePattern = /[\t\n\f\r ]/u;
const queryFeatureKinds = new Set(['container', 'media']);
const fontFeatureValueAtRules = new Set([
	'annotation',
	'character-variant',
	'ornaments',
	'styleset',
	'stylistic',
	'swash',
]);
const preservedFunctionPayloadNames = new Set([
	'-moz-element',
	'attr',
	'element',
	'env',
	'paint',
	'url',
]);
const substitutingFunctionNames = new Set(['attr', 'env', 'var']);
// Function names that the CSS Transforms specifications write in camelCase.
const camelCaseFunctionNames = new Map([
	'rotateX',
	'rotateY',
	'rotateZ',
	'scaleX',
	'scaleY',
	'scaleZ',
	'skewX',
	'skewY',
	'translateX',
	'translateY',
	'translateZ',
].map(name => [toAsciiLowerCase(name), name]));

const decodeIdentifier = value => ident.decode(value);
const isCustomIdentifier = value => decodeIdentifier(value).startsWith('--');

function getProblem(node, range, {type, value, replacement}, context) {
	return {
		node,
		loc: toLocation(range, context),
		// Only spec camelCase function names, like `translateY`, have a replacement that is not all lowercase.
		messageId: replacement === toAsciiLowerCase(replacement) ? MESSAGE_ID : MESSAGE_ID_SPECIFICATION_CASE,
		data: {type, value, replacement},
		fix: fixer => fixer.replaceTextRange(range, replacement),
	};
}

const knownFunctionNamesCache = new WeakMap();

// Function names that appear anywhere in the CSS grammar of the lexer, lowercased.
function getKnownFunctionNames(lexer) {
	let names = knownFunctionNamesCache.get(lexer);
	if (names) {
		return names;
	}

	names = new Set();
	const definitions = [
		...Object.values(lexer.types),
		...Object.values(lexer.properties),
		...Object.values(lexer.atrules).flatMap(atrule => [atrule.prelude, ...Object.values(atrule.descriptors ?? {})]),
	];
	for (const definition of definitions) {
		if (!definition?.syntax) {
			continue;
		}

		definitionSyntax.walk(definition.syntax, node => {
			if (node.type === 'Function') {
				names.add(toAsciiLowerCase(node.name));
			}
		});
	}

	knownFunctionNamesCache.set(lexer, names);
	return names;
}

function getCanonicalFunctionName(name) {
	const lowercaseName = toAsciiLowerCase(name);
	return camelCaseFunctionNames.get(lowercaseName) ?? lowercaseName;
}

function getIdentifierProblem(node, range, type, context) {
	const value = context.sourceCode.text.slice(...range);
	const decodedValue = decodeIdentifier(value);
	const canonicalValue = type === 'function name' ? getCanonicalFunctionName(decodedValue) : toAsciiLowerCase(decodedValue);
	if (decodedValue === canonicalValue) {
		return;
	}

	return getProblem(node, range, {type, value, replacement: ident.encode(canonicalValue)}, context);
}

function getFeatureNameRange(node, sourceCode) {
	const text = sourceCode.getText(node);
	let index = 0;

	while (index < text.length) {
		if (text[index] === '(' || cssWhitespacePattern.test(text[index])) {
			index++;
			continue;
		}

		if (text.startsWith('/*', index)) {
			index = text.indexOf('*/', index + 2) + 2;
			continue;
		}

		break;
	}

	const [start] = sourceCode.getRange(node);
	return [start + index, start + index + node.name.length];
}

function getDeclaration(node, sourceCode) {
	return sourceCode.getAncestors(node).findLast(ancestor => ancestor.type === 'Declaration');
}

function isInPreservedContext(node, context) {
	const {sourceCode} = context;
	return sourceCode.getAncestors(node).some(ancestor => {
		if (ancestor.type === 'Atrule') {
			return isCustomIdentifier(ancestor.name);
		}

		if (ancestor.type === 'Declaration') {
			if (
				isCustomIdentifier(ancestor.property)
				|| isCssModulesInteropDeclaration(ancestor, context)
			) {
				return true;
			}

			const owner = getBlockOwner(ancestor, sourceCode);
			return normalizeCssIdentifier(ancestor.property) === 'initial-value'
				&& owner?.type === 'Atrule'
				&& normalizeCssIdentifier(owner.name) === 'property';
		}

		if (ancestor.type === 'Url') {
			return true;
		}

		if (ancestor.type !== 'Function') {
			return false;
		}

		const functionName = normalizeCssIdentifier(ancestor.name);
		return functionName.startsWith('--') || preservedFunctionPayloadNames.has(functionName);
	});
}

function getBlockOwner(node, sourceCode) {
	const parent = sourceCode.getParent(node);
	return parent?.type === 'Block' ? sourceCode.getParent(parent) : undefined;
}

function isFontFeatureValueDefinition(declaration, sourceCode) {
	const owner = getBlockOwner(declaration, sourceCode);
	if (
		owner?.type !== 'Atrule'
		|| !fontFeatureValueAtRules.has(normalizeCssIdentifier(owner.name))
	) {
		return false;
	}

	const outerOwner = getBlockOwner(owner, sourceCode);
	return outerOwner?.type === 'Atrule' && normalizeCssIdentifier(outerOwner.name) === 'font-feature-values';
}

function getDescriptorOwnerName(declaration, sourceCode) {
	const owner = getBlockOwner(declaration, sourceCode);
	if (owner?.type !== 'Atrule') {
		return;
	}

	const ownerName = normalizeCssIdentifier(owner.name);
	if (sourceCode.lexer.getAtrule(ownerName)?.descriptors) {
		return ownerName;
	}
}

function getDeclarationMatcher(declaration, sourceCode) {
	const ownerName = getDescriptorOwnerName(declaration, sourceCode);
	const declarationName = normalizeCssIdentifier(declaration.property);

	if (ownerName) {
		return value => sourceCode.lexer.matchAtruleDescriptor(ownerName, declarationName, value);
	}

	return value => sourceCode.lexer.matchProperty(declarationName, value);
}

// Unknown names can be author-defined, like CSS Modules `:export` keys that JavaScript reads with their exact casing.
function isKnownDeclarationName(declaration, sourceCode) {
	const ownerName = getDescriptorOwnerName(declaration, sourceCode);
	const declarationName = normalizeCssIdentifier(declaration.property);
	return Boolean(
		sourceCode.lexer.getProperty(declarationName)
		|| (ownerName && sourceCode.lexer.getAtruleDescriptor(ownerName, declarationName)),
	);
}

function normalizeMatchNode(node) {
	switch (node.type) {
		case 'Dimension': {
			node.unit = normalizeCssIdentifier(node.unit);
			break;
		}

		case 'Function':
		case 'Identifier': {
			node.name = normalizeCssIdentifier(node.name);
			break;
		}

		case 'Hash': {
			node.value = decodeIdentifier(node.value);
			break;
		}

		default:
	}
}

function getValueMatch(matchValue, candidate, target, sourceCode) {
	if (!sourceCode.getText(candidate).includes('\\')) {
		return {match: matchValue(candidate), target};
	}

	const normalizedCandidate = clone(candidate);
	const [targetStart, targetEnd] = sourceCode.getRange(target);
	let normalizedTarget;
	walk(normalizedCandidate, node => {
		normalizeMatchNode(node);
		if (node.type !== target.type) {
			return;
		}

		const [nodeStart, nodeEnd] = sourceCode.getRange(node);
		if (nodeStart === targetStart && nodeEnd === targetEnd) {
			normalizedTarget = node;
		}
	});

	return {match: matchValue(normalizedCandidate), target: normalizedTarget};
}

const isSubstitutingFunction = name => name.startsWith('--') || substitutingFunctionNames.has(name);

function hasFunction(node, predicate) {
	let found = false;
	walk(node, candidate => {
		if (candidate.type === 'Function' && predicate(normalizeCssIdentifier(candidate.name))) {
			found = true;
		}
	});

	return found;
}

const hasMatcherBarrier = node => hasFunction(node, name => preservedFunctionPayloadNames.has(name));

// Non-standard generic font families like `BlinkMacSystemFont` are font names, so their casing is kept.
const isKeywordMatch = (match, target) => match.isKeyword(target) && !match.isType(target, '-non-standard-generic-family');

function * getValueCandidates(node, declaration, sourceCode) {
	const ancestors = sourceCode.getAncestors(node);
	const declarationIndex = ancestors.lastIndexOf(declaration);
	const enclosingCandidates = ancestors.slice(declarationIndex + 2).toReversed();
	yield * enclosingCandidates;

	yield node;

	const {children} = declaration.value;
	if (!Array.isArray(children) || children.length < 2) {
		return;
	}

	const valueChild = ancestors[declarationIndex + 2] ?? node;
	const targetIndex = children.indexOf(valueChild);
	if (targetIndex === -1) {
		return;
	}

	let startIndex = targetIndex;
	while (startIndex > 0 && !hasMatcherBarrier(children[startIndex - 1])) {
		startIndex--;
	}

	if (children[startIndex]?.type === 'Operator' && children[startIndex].value === ',') {
		startIndex++;
	}

	let endIndex = targetIndex + 1;
	while (endIndex < children.length && !hasMatcherBarrier(children[endIndex])) {
		endIndex++;
	}

	if (children[endIndex - 1]?.type === 'Operator' && children[endIndex - 1].value === ',') {
		endIndex--;
	}

	if (
		endIndex - startIndex > 1
		&& (startIndex > 0 || endIndex < children.length)
	) {
		yield {
			...declaration.value,
			children: children.slice(startIndex, endIndex),
		};
	}
}

function isValueKeyword(node, declaration, sourceCode) {
	const matchValue = getDeclarationMatcher(declaration, sourceCode);
	const completeMatch = getValueMatch(matchValue, declaration.value, node, sourceCode);

	if (!completeMatch.match.error) {
		return isKeywordMatch(completeMatch.match, completeMatch.target);
	}

	// A substitution can fill a keyword slot, making another identifier a case-sensitive custom name.
	if (hasFunction(declaration.value, isSubstitutingFunction)) {
		return false;
	}

	for (const candidate of getValueCandidates(node, declaration, sourceCode)) {
		const {match, target} = getValueMatch(matchValue, candidate, node, sourceCode);
		if (match.error) {
			continue;
		}

		if (!isKeywordMatch(match, target)) {
			return false;
		}

		// A system font keyword is only unambiguously a keyword when it is the complete font shorthand value.
		if (!match.isType(target, 'system-family-name')) {
			return true;
		}
	}

	return false;
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Declaration', node => {
		if (
			isInPreservedContext(node, context)
			|| isCustomIdentifier(node.property)
			|| isCssModulesInteropDeclaration(node, context)
			|| isFontFeatureValueDefinition(node, sourceCode)
			|| !isKnownDeclarationName(node, sourceCode)
		) {
			return;
		}

		const [start] = sourceCode.getRange(node);
		return getIdentifierProblem(node, [start, start + node.property.length], 'property', context);
	});

	for (const nodeType of ['Atrule', 'AtKeyword']) {
		context.on(nodeType, node => {
			if (
				isInPreservedContext(node, context)
				|| isCustomIdentifier(node.name)
				|| normalizeCssIdentifier(node.name) === 'charset'
			) {
				return;
			}

			const [start] = sourceCode.getRange(node);
			return getIdentifierProblem(node, [start + 1, start + 1 + node.name.length], 'at-rule name', context);
		});
	}

	context.on('Dimension', node => {
		if (isInPreservedContext(node, context)) {
			return;
		}

		const [, end] = sourceCode.getRange(node);
		return getIdentifierProblem(node, [end - node.unit.length, end], 'unit', context);
	});

	for (const [nodeType, nameProperty] of [
		['Function', 'name'],
		['FeatureFunction', 'feature'],
	]) {
		context.on(nodeType, node => {
			const name = node[nameProperty];
			if (
				isInPreservedContext(node, context)
				|| isCustomIdentifier(name)
				// Unknown function names can be case-sensitive, like PostCSS plugin functions.
				|| !getKnownFunctionNames(sourceCode.lexer).has(normalizeCssIdentifier(name))
			) {
				return;
			}

			const [start] = sourceCode.getRange(node);
			return getIdentifierProblem(node, [start, start + name.length], 'function name', context);
		});
	}

	context.on('Url', node => {
		if (isInPreservedContext(node, context)) {
			return;
		}

		const text = sourceCode.getText(node);
		const nameLength = text.indexOf('(');
		const [start] = sourceCode.getRange(node);
		return getIdentifierProblem(node, [start, start + nameLength], 'function name', context);
	});

	for (const [nodeType, type, colonCount] of [
		['PseudoClassSelector', 'pseudo-class name', 1],
		['PseudoElementSelector', 'pseudo-element name', 2],
	]) {
		context.on(nodeType, node => {
			if (
				isInPreservedContext(node, context)
				|| isCustomIdentifier(node.name)
			) {
				return;
			}

			const [start] = sourceCode.getRange(node);
			return getIdentifierProblem(node, [start + colonCount, start + colonCount + node.name.length], type, context);
		});
	}

	context.on('Feature', node => {
		if (
			isInPreservedContext(node, context)
			|| !queryFeatureKinds.has(node.kind)
			|| isCustomIdentifier(node.name)
		) {
			return;
		}

		return getIdentifierProblem(node, getFeatureNameRange(node, sourceCode), `${node.kind} feature name`, context);
	});

	context.on('FeatureRange', function * (node) {
		if (
			isInPreservedContext(node, context)
			|| !queryFeatureKinds.has(node.kind)
		) {
			return;
		}

		const atRule = sourceCode.getAncestors(node).findLast(ancestor => ancestor.type === 'Atrule');
		if (!atRule) {
			return;
		}

		const match = sourceCode.lexer.matchAtrulePrelude(normalizeCssIdentifier(atRule.name), atRule.prelude);
		if (match.error) {
			return;
		}

		for (const candidate of [node.left, node.middle, node.right]) {
			if (
				candidate?.type !== 'Identifier'
				|| !match.isType(candidate, 'mf-name')
				|| isCustomIdentifier(candidate.name)
			) {
				continue;
			}

			const problem = getIdentifierProblem(candidate, sourceCode.getRange(candidate), `${node.kind} feature name`, context);
			if (problem) {
				yield problem;
			}
		}
	});

	context.on('Identifier', node => {
		const range = sourceCode.getRange(node);
		const problem = getIdentifierProblem(node, range, 'value keyword', context);
		if (
			!problem
			|| isInPreservedContext(node, context)
			|| isCustomIdentifier(node.name)
		) {
			return;
		}

		const declaration = getDeclaration(node, sourceCode);
		if (
			!declaration
			|| isCustomIdentifier(declaration.property)
			|| !isValueKeyword(node, declaration, sourceCode)
		) {
			return;
		}

		return problem;
	});

	context.on('Hash', node => {
		if (isInPreservedContext(node, context)) {
			return;
		}

		const [start, end] = sourceCode.getRange(node);
		const range = [start + 1, end];
		const value = sourceCode.text.slice(...range);
		const decodedValue = decodeIdentifier(value);
		const replacement = toAsciiLowerCase(decodedValue);
		if (
			!hexadecimalColorPattern.test(decodedValue)
			|| decodedValue === replacement
		) {
			return;
		}

		return getProblem(node, range, {type: 'hexadecimal color', value: `#${value}`, replacement}, context);
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
			description: 'Enforce lowercase CSS syntax.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
