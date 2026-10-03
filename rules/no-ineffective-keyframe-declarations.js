import {hasCommentInRange, isKeyframesAtRule, normalizeCssIdentifier} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_ANIMATION_CONTROL = 'no-ineffective-keyframe-declarations/animation-control';
const MESSAGE_ID_TERMINAL_EASING = 'no-ineffective-keyframe-declarations/terminal-easing';
const MESSAGE_ID_IMPORTANT = 'no-ineffective-keyframe-declarations/important';
const messages = {
	[MESSAGE_ID_ANIMATION_CONTROL]: '`{{property}}` has no effect inside keyframes. Set it on the animated element instead.',
	[MESSAGE_ID_TERMINAL_EASING]: '`animation-timing-function` has no effect on a final `to` or `100%` keyframe.',
	[MESSAGE_ID_IMPORTANT]: 'Declarations with `!important` are ignored inside keyframes.',
};

const animationControlProperties = new Set([
	'animation-name',
	'animation-duration',
	'animation-delay',
	'animation-delay-start',
	'animation-delay-end',
	'animation-iteration-count',
	'animation-direction',
	'animation-fill-mode',
	'animation-play-state',
	'animation-timeline',
	'animation-range',
	'animation-range-start',
	'animation-range-end',
	'animation-trigger',
]);

const getKeyframeOffset = selector => {
	if (selector.children.length !== 1) {
		return;
	}

	const [node] = selector.children;
	if (node.type === 'Percentage') {
		const offset = Number(node.value);
		if (offset >= 0 && offset <= 100) {
			return offset;
		}
	} else if (node.type === 'TypeSelector') {
		const name = normalizeCssIdentifier(node.name);
		if (name === 'from') {
			return 0;
		}

		if (name === 'to') {
			return 100;
		}
	}
};

const getKeyframeOffsets = rule => rule.prelude?.type === 'SelectorList'
	? rule.prelude.children.map(selector => getKeyframeOffset(selector))
	: [undefined];

const isImportant = declaration => declaration.important === true
	|| (typeof declaration.important === 'string' && normalizeCssIdentifier(declaration.important) === 'important');

const getMessageId = (declaration, property, isTerminalKeyframe) => {
	if (isImportant(declaration)) {
		return MESSAGE_ID_IMPORTANT;
	}

	if (animationControlProperties.has(property)) {
		return MESSAGE_ID_ANIMATION_CONTROL;
	}

	if (property === 'animation-timing-function' && isTerminalKeyframe) {
		return MESSAGE_ID_TERMINAL_EASING;
	}
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Atrule', function * (atRule) {
		if (
			!isKeyframesAtRule(atRule)
			|| atRule.block?.type !== 'Block'
		) {
			return;
		}

		const keyframes = atRule.block.children.filter(node => node.type === 'Rule' && node.block?.type === 'Block');
		const keyframeOffsets = keyframes.map(rule => getKeyframeOffsets(rule));
		// Named timeline ranges and unfamiliar selectors need timeline context to determine the final frame.
		const hasOnlyOrdinaryOffsets = keyframeOffsets.every(offsets => offsets.length > 0 && offsets.every(offset => offset !== undefined));
		// Easing can affect how duplicate terminal blocks are grouped, changing interpolation even before the final frame.
		const hasSingleTerminalKeyframe = keyframeOffsets.filter(offsets => offsets.includes(100)).length === 1;

		for (const [index, keyframe] of keyframes.entries()) {
			const isTerminalKeyframe = hasOnlyOrdinaryOffsets && hasSingleTerminalKeyframe && keyframeOffsets[index].every(offset => offset === 100);
			for (const declaration of keyframe.block.children) {
				if (declaration.type !== 'Declaration') {
					continue;
				}

				const property = normalizeCssIdentifier(declaration.property);
				const messageId = getMessageId(declaration, property, isTerminalKeyframe);
				if (!messageId) {
					continue;
				}

				yield {
					node: declaration,
					messageId,
					data: {property},
					* fix(fixer, {abort}) {
						const [start, end] = sourceCode.getRange(declaration);
						if (hasCommentInRange(context, [start, end])) {
							abort();
						}

						yield fixer.removeRange([start, end + (sourceCode.text[end] === ';' ? 1 : 0)]);
					},
				};
			}
		}
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow ineffective declarations in keyframes.',
			recommended: 'unopinionated',
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
