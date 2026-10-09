import {
	getNodesRange,
	hasCommentInRange,
	normalizeCssIdentifier,
	toLocation,
} from './utils/index.js';
import {LEGACY_PSEUDO_ELEMENTS} from './shared/css-selector-specificity.js';

/**
@import {SelectorPlain} from '@eslint/css-tree';
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
@import {CssicornProblem} from './rule/to-eslint-problem.js';
@import {CssicornFixer} from './rule/to-eslint-rule-fixer.js';
*/

const MESSAGE_ID = 'consistent-compound-selector-order';
const messages = {
	[MESSAGE_ID]: 'Use consistent ordering for compound selector components.',
};

const CSS_MODULES_PSEUDO_CLASSES = new Set(['local', 'global']);

const selectorOrder = new Map([
	['TypeSelector', 0],
	['NestingSelector', 1],
	['IdSelector', 2],
	['ClassSelector', 3],
	['AttributeSelector', 4],
	['PseudoClassSelector', 5],
]);

/**
@param {SelectorPlain['children']} children
@param {SelectorPlain} selector
@param {CssicornContext} context
@returns {CssicornProblem | undefined}
*/
const getCompoundProblem = (children, selector, context) => {
	if (children.some(child => child.type === 'PseudoClassSelector' && CSS_MODULES_PSEUDO_CLASSES.has(normalizeCssIdentifier(child.name)))) {
		return;
	}

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
	/**
	@type {[number, number]}
	*/
	const range = getNodesRange(compound, {sourceCode});

	return {
		node: selector,
		loc: toLocation(range, context),
		messageId: MESSAGE_ID,
		/**
		@param {CssicornFixer} fixer
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
@param {CssicornContext} context
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
@type {CssicornRule}
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
