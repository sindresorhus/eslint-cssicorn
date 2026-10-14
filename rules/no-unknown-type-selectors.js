import htmlTags from 'html-tags';
import svgTags from 'svg-tags';
import {mathmlTagNames} from 'mathml-tag-names';
import {deprecatedHtmlTypeSelectors, deprecatedSvgTypeSelectors, getTypeSelectorIdentifier} from './shared/css-type-selectors.js';
import {
	decodeCssIdentifier,
	getPseudoSelectorArgument,
	hasKeyframesAncestor,
	normalizeCssIdentifier,
	toAsciiLowerCase,
	toLocation,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID = 'no-unknown-type-selectors';
const messages = {
	[MESSAGE_ID]: 'Unknown type selector \'{{selector}}\'.',
};

const caseInsensitiveNames = new Set([...htmlTags, ...mathmlTagNames, ...deprecatedHtmlTypeSelectors]);
const svgNames = new Set([...svgTags, ...deprecatedSvgTypeSelectors, 'discard', 'feDropShadow']);
const reservedCustomElementNames = new Set([
	'annotation-xml',
	'color-profile',
	'font-face',
	'font-face-src',
	'font-face-uri',
	'font-face-format',
	'font-face-name',
	'missing-glyph',
]);

/**
Check whether a decoded identifier is a valid custom element name.

@param {string} name
@returns {boolean}
*/
const isCustomElementName = name => /^[a-z]/v.test(name)
	&& !/[\0\t\n\f\r \/>A-Z]/v.test(name)
	&& name.includes('-')
	&& !reservedCustomElementNames.has(name);

const isAllowed = (name, allow) => allow.some(entry => {
	if (typeof entry === 'string') {
		return entry === name;
	}

	entry.lastIndex = 0;
	return entry.test(name);
});

const getTypeSelectorProblem = (node, context, {checkCustomElements, allow}) => {
	const identifier = getTypeSelectorIdentifier(node.name);
	if (!identifier) {
		return;
	}

	const name = decodeCssIdentifier(identifier.value);
	if (
		caseInsensitiveNames.has(toAsciiLowerCase(name))
		|| svgNames.has(name)
		|| (!checkCustomElements && isCustomElementName(name))
		|| isAllowed(name, allow)
	) {
		return;
	}

	const [start] = context.sourceCode.getRange(node);
	return {
		node,
		loc: toLocation(identifier.offsets.map(offset => start + offset), context),
		messageId: MESSAGE_ID,
		data: {selector: name},
	};
};

const isNonElementSelector = (node, context) => hasKeyframesAncestor(node, context)
	|| context.sourceCode.getAncestors(node).some(ancestor => ancestor.type === 'Atrule' && normalizeCssIdentifier(ancestor.name) === 'page');

function * getParsedSelectorProblems(node, context, options) {
	if (node.type === 'TypeSelector') {
		yield getTypeSelectorProblem(node, context, options);
		return;
	}

	if (node.type === 'PseudoClassSelector' || node.type === 'PseudoElementSelector') {
		const argument = getPseudoSelectorArgument(node, context);
		if (argument) {
			yield * getParsedSelectorProblems(argument, context, options);
		}

		return;
	}

	if (node.type === 'Nth' && node.selector) {
		yield * getParsedSelectorProblems(node.selector, context, options);
	}

	for (const child of node.children ?? []) {
		yield * getParsedSelectorProblems(child, context, options);
	}
}

/**
@param {CssicornContext} context
*/
const create = context => {
	const [configuredOptions] = context.options;
	if (configuredOptions.allow.some(entry => typeof entry !== 'string' && !(entry instanceof RegExp))) {
		throw new TypeError('The `allow` option must contain only strings or regular expressions.');
	}

	// RuleTester freezes options, and global/sticky regexes mutate their lastIndex when tested.
	const options = {
		...configuredOptions,
		allow: configuredOptions.allow.map(entry => typeof entry === 'string' ? entry : new RegExp(entry.source, entry.flags)),
	};

	context.on('TypeSelector', node => {
		const problem = getTypeSelectorProblem(node, context, options);
		if (problem && !isNonElementSelector(node, context)) {
			return problem;
		}
	});

	context.on(['PseudoClassSelector', 'PseudoElementSelector'], node => {
		if (node.children?.[0]?.type !== 'Raw' || isNonElementSelector(node, context)) {
			return;
		}

		return getParsedSelectorProblems(node, context, options);
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
			description: 'Disallow unknown type selectors.',
			recommended: 'unopinionated',
		},
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					checkCustomElements: {
						type: 'boolean',
						description: 'Report custom element names unless explicitly allowed.',
					},
					allow: {
						type: 'array',
						items: {anyOf: [{type: 'string'}, {type: 'object', additionalProperties: true}]},
						description: 'Additional element names to allow, as exact strings or regular expressions.',
					},
				},
			},
		],
		defaultOptions: [{checkCustomElements: false, allow: []}],
		messages,
		languages: ['css/css'],
	},
};

export default config;
