import {
	canBeRepresentedByNestingSelector,
	compareSpecificity,
	getMaximumSpecificity,
	getParentStyleRule,
	getRuleSpecificities,
	getSelectorArgument,
	getSelectorSpecificity,
	hasAncestorStyleRule,
	hasLeadingCombinator,
	hasScopeAncestor,
	isStyleRule,
} from './shared/css-selector-specificity.js';
import {normalizeCssIdentifier} from './utils/index.js';

const MESSAGE_ID = 'no-nesting-with-mixed-specificity';
const MESSAGE_ID_ARGUMENTS = 'mixed-specificity-arguments';
const CHECKED_PSEUDO_CLASSES = new Set(['is', 'not', 'has', 'nth-child', 'nth-last-child']);
const messages = {
	[MESSAGE_ID]: 'Do not nest rules under selector lists with mixed specificity.',
	[MESSAGE_ID_ARGUMENTS]: 'The selectors in `:{{name}}()` have mixed specificity ({{specificities}}). The most specific selector determines the specificity of the list.',
};

const hasMixedSpecificity = specificities => specificities.some(specificity => compareSpecificity(specificity, specificities[0]) !== 0);

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const ruleSpecificities = new WeakMap();

	context.on('Rule', rule => {
		if (rule.prelude.type !== 'SelectorList') {
			return;
		}

		const parentRule = getParentStyleRule(rule, context);
		const parentSpecificities = parentRule && ruleSpecificities.get(parentRule);
		const nestingSpecificity = getMaximumSpecificity(parentSpecificities ?? []);
		const hasUnresolvedParent = !parentRule && hasAncestorStyleRule(rule, context);
		const hasTopLevelRelativeSelector = !parentRule && !hasScopeAncestor(rule, context) && rule.prelude.children.some(selector => hasLeadingCombinator(selector));
		const specificities = parentSpecificities?.length === 0 || hasUnresolvedParent || hasTopLevelRelativeSelector ? [] : getRuleSpecificities(rule, nestingSpecificity);
		ruleSpecificities.set(rule, specificities);

		if (parentSpecificities && hasMixedSpecificity(parentSpecificities)) {
			return {
				node: rule.prelude,
				messageId: MESSAGE_ID,
			};
		}
	});

	context.on('PseudoClassSelector', node => {
		const name = normalizeCssIdentifier(node.name);
		if (!CHECKED_PSEUDO_CLASSES.has(name)) {
			return;
		}

		const selectorList = getSelectorArgument(node);
		if (selectorList?.type !== 'SelectorList' || selectorList.children.length < 2) {
			return;
		}

		const selectors = selectorList.children.filter(selector => canBeRepresentedByNestingSelector(selector, name === 'has'));
		if (selectors.length < 2 || (name !== 'is' && selectors.length !== selectorList.children.length)) {
			return;
		}

		const ancestors = sourceCode.getAncestors(node);
		const owner = ancestors.findLast(ancestor => ancestor.type === 'Rule' || ancestor.type === 'Atrule');
		if (!owner?.prelude || !isStyleRule(owner, context) || !ancestors.includes(owner.prelude)) {
			return;
		}

		if (ancestors.some(ancestor => ancestor.type === 'PseudoClassSelector' && normalizeCssIdentifier(ancestor.name) === 'where')) {
			return;
		}

		const parentRule = getParentStyleRule(owner, context);
		const parentSpecificities = parentRule && ruleSpecificities.get(parentRule);
		const nestingSpecificity = getMaximumSpecificity(parentSpecificities ?? []);
		const specificities = selectors.map(selector => getSelectorSpecificity(selector, nestingSpecificity).specificity);
		if (!hasMixedSpecificity(specificities)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID_ARGUMENTS,
			data: {
				name,
				specificities: specificities.map(specificity => specificity.join('-')).join(', '),
			},
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
			description: 'Disallow mixed specificity in nesting parents and selector-list pseudo-classes.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
