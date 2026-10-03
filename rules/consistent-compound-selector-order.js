import {hasCommentInRange, normalizeCssIdentifier, toLocation} from './utils/index.js';
import {LEGACY_PSEUDO_ELEMENTS} from './shared/css-selector-specificity.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'consistent-compound-selector-order';
const messages = {
	[MESSAGE_ID]: 'Use consistent ordering for compound selector components.',
};

const selectorOrder = new Map([
	['TypeSelector', 0],
	['NestingSelector', 1],
	['IdSelector', 2],
	['ClassSelector', 3],
	['AttributeSelector', 4],
	['PseudoClassSelector', 5],
]);

const getCompoundProblem = (children, selector, context) => {
	const {sourceCode} = context;
	let previousOrder = -1;
	let hasInversion = false;
	let endIndex = children.length;

	for (const [index, child] of children.entries()) {
		const name = child.type === 'PseudoClassSelector' ? normalizeCssIdentifier(child.name) : undefined;
		// Pseudo-classes after a pseudo-element target that pseudo-element, not its originating element.
		if (child.type === 'PseudoElementSelector' || LEGACY_PSEUDO_ELEMENTS.has(name)) {
			endIndex = index;
			break;
		}

		const order = selectorOrder.get(child.type);
		if (
			order === undefined
			|| !sourceCode.getLoc(child)
			|| (child.type === 'TypeSelector' && index !== 0)
			|| name === 'local'
			|| name === 'global'
		) {
			return;
		}

		hasInversion ||= order < previousOrder;
		previousOrder = order;
	}

	if (!hasInversion) {
		return;
	}

	const compound = children.slice(0, endIndex);
	const sorted = compound.toSorted((first, second) => selectorOrder.get(first.type) - selectorOrder.get(second.type));
	const range = [sourceCode.getRange(compound[0])[0], sourceCode.getRange(compound.at(-1))[1]];

	return {
		node: selector,
		loc: toLocation(range, context),
		messageId: MESSAGE_ID,
		/**
		@param {ESLint.Rule.RuleFixer} fixer
		*/
		* fix(fixer, {abort}) {
			if (hasCommentInRange(context, range)) {
				abort();
			}

			yield fixer.replaceTextRange(range, sorted.map(child => sourceCode.getText(child)).join(''));
		},
	};
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	context.on('Selector', function * (selector) {
		let compound = [];
		for (const child of selector.children) {
			if (child.type === 'Combinator') {
				yield getCompoundProblem(compound, selector, context);
				compound = [];
			} else {
				compound.push(child);
			}
		}

		yield getCompoundProblem(compound, selector, context);
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
			description: 'Enforce consistent ordering of compound selector components.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
