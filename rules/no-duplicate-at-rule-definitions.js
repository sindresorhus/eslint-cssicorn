// @ts-check
import {decodeCssIdentifier, isKeyframesAtRule, normalizeCssIdentifier} from './utils/index.js';

/**
@import {Identifier, StringNode} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID = 'no-duplicate-at-rule-definitions';
const messages = {
	[MESSAGE_ID]: 'Duplicate `@{{atRule}}` definition `{{name}}`. The first definition is on line {{line}}.',
};

const definitionAtRules = new Set(['property', 'counter-style', 'position-try']);

/**
@param {CssicornContext} context
*/
const create = context => {
	context.on(['StyleSheet', 'Block'], function * (parent) {
		/**
		@type {Map<string, Identifier | StringNode>}
		*/
		const firstDefinitions = new Map();

		for (const atRule of parent.children) {
			if (
				atRule.type !== 'Atrule'
				|| atRule.block?.type !== 'Block'
				|| atRule.prelude?.type !== 'AtrulePrelude'
			) {
				continue;
			}

			const atRuleName = normalizeCssIdentifier(atRule.name);
			const isKeyframes = isKeyframesAtRule(atRule);
			if (!isKeyframes && !definitionAtRules.has(atRuleName)) {
				continue;
			}

			const {children} = atRule.prelude;
			if (atRuleName === 'property') {
				if (
					children.length % 2 !== 1
					|| children.some((node, index) => index % 2 === 0
						? node.type !== 'Identifier'
						: node.type !== 'Operator' || node.value !== ',')
				) {
					continue;
				}
			} else if (children.length !== 1) {
				continue;
			}

			for (const nameNode of children) {
				if (nameNode.type !== 'Identifier' && !(isKeyframes && nameNode.type === 'String')) {
					continue;
				}

				const name = nameNode.type === 'Identifier' ? decodeCssIdentifier(nameNode.name) : nameNode.value;
				const key = `${atRuleName}/${name}`;
				const firstDefinition = firstDefinitions.get(key);
				if (!firstDefinition) {
					firstDefinitions.set(key, nameNode);
					continue;
				}

				yield {
					node: nameNode,
					messageId: MESSAGE_ID,
					data: {
						atRule: atRuleName,
						name: JSON.stringify(name).slice(1, -1),
						line: String(context.sourceCode.getLoc(firstDefinition).start.line),
					},
				};
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
		type: 'problem',
		docs: {
			description: 'Disallow duplicate named at-rule definitions.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
