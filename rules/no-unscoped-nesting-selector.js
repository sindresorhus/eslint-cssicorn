import {normalizeCssIdentifier} from './utils/index.js';

const MESSAGE_ID = 'no-unscoped-nesting-selector';
const messages = {
	[MESSAGE_ID]: 'Do not use a CSS nesting selector unless an ancestor scoping context applies.',
};

const isScopeAtRule = node => node.type === 'Atrule' && normalizeCssIdentifier(node.name) === 'scope';
const isKeyframesAtRule = node => node?.type === 'Atrule' && /^(?:-(?:moz|o|webkit)-)?keyframes$/.test(normalizeCssIdentifier(node.name));

const isStyleRule = (node, sourceCode) => {
	if (node.type !== 'Rule') {
		return false;
	}

	const block = sourceCode.getParent(node);
	const atRule = sourceCode.getParent(block);
	return !isKeyframesAtRule(atRule);
};

const isInScopeLimit = (node, sourceCode) => {
	let selectorList;

	for (const ancestor of sourceCode.getAncestors(node).toReversed()) {
		if (ancestor.type === 'SelectorList') {
			selectorList = ancestor;
			continue;
		}

		if (ancestor.type === 'Scope') {
			return ancestor.limit === selectorList;
		}
	}

	return false;
};

const getSelectorOwner = (node, sourceCode) => sourceCode.getAncestors(node).findLast(ancestor => ancestor.type === 'Rule' || ancestor.type === 'Atrule');

const hasScopingRoot = (selectorOwner, sourceCode, scopingRootAtRules) => {
	for (const ancestor of sourceCode.getAncestors(selectorOwner).toReversed()) {
		if (isKeyframesAtRule(ancestor)) {
			return false;
		}

		if (
			isStyleRule(ancestor, sourceCode)
			|| isScopeAtRule(ancestor)
			|| (ancestor.type === 'Atrule' && scopingRootAtRules.has(normalizeCssIdentifier(ancestor.name)))
		) {
			return true;
		}
	}

	return false;
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			scopingRootAtRules: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
					pattern: '^[^@]+$',
				},
				description: 'At-rules that provide a scoping root.',
			},
		},
	},
];

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const scopingRootAtRules = new Set(
		context.options[0].scopingRootAtRules.map(name => normalizeCssIdentifier(name)),
	);
	const {sourceCode} = context;

	context.on('NestingSelector', node => {
		const selectorOwner = getSelectorOwner(node, sourceCode);
		if (
			!selectorOwner
			|| (!isStyleRule(selectorOwner, sourceCode) && !isScopeAtRule(selectorOwner))
			|| (isScopeAtRule(selectorOwner) && isInScopeLimit(node, sourceCode))
			|| hasScopingRoot(selectorOwner, sourceCode, scopingRootAtRules)
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow unscoped CSS nesting selectors.',
			recommended: 'unopinionated',
		},
		schema,
		defaultOptions: [
			{
				scopingRootAtRules: [
					'utility',
					'custom-variant',
				],
			},
		],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
