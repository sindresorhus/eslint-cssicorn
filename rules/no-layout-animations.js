import {shorthandToAffectedProperties} from './shared/css-shorthand-properties.js';
import sizeProperties from './shared/css-size-properties.js';
import {
	getBasePropertyName,
	getDescriptorAtRule,
	hasKeyframesAncestor,
	isCssModulesInteropDeclaration,
	isImportantDeclaration,
	isKeyframesAtRule,
	normalizeCssIdentifier,
} from './utils/index.js';

/**
@import {CssicornContext} from './rule/cssicorn-context.js';
@import {CssicornRule} from './rule/to-eslint-rule.js';
*/

const MESSAGE_ID = 'no-layout-animations';
const messages = {
	[MESSAGE_ID]: 'Avoid animating \'{{property}}\', which can affect layout.',
};

const layoutProperties = new Set([
	...sizeProperties,
	'top',
	'right',
	'bottom',
	'left',
	'inset-block-start',
	'inset-block-end',
	'inset-inline-start',
	'inset-inline-end',
	'margin-top',
	'margin-right',
	'margin-bottom',
	'margin-left',
	'margin-block-start',
	'margin-block-end',
	'margin-inline-start',
	'margin-inline-end',
	'padding-top',
	'padding-right',
	'padding-bottom',
	'padding-left',
	'padding-block-start',
	'padding-block-end',
	'padding-inline-start',
	'padding-inline-end',
	'border-top-width',
	'border-right-width',
	'border-bottom-width',
	'border-left-width',
	'border-block-start-width',
	'border-block-end-width',
	'border-inline-start-width',
	'border-inline-end-width',
	'row-gap',
	'column-gap',
	'flex-basis',
	'flex-grow',
	'flex-shrink',
	'grid-template-columns',
	'grid-template-rows',
	'grid-auto-columns',
	'grid-auto-rows',
	'font-size',
	'line-height',
	'letter-spacing',
	'word-spacing',
]);

for (const [shorthand, affectedProperties] of shorthandToAffectedProperties) {
	if (!affectedProperties.isDisjointFrom(layoutProperties)) {
		layoutProperties.add(shorthand);
	}
}

/**
@param {CssicornContext} context
*/
const create = context => {
	context.on('Declaration', function * (declaration, parent) {
		const property = getBasePropertyName(declaration.property);
		if (
			(property !== 'transition' && property !== 'transition-property')
			|| declaration.value.type !== 'Value'
			|| parent?.type !== 'Block'
			|| isCssModulesInteropDeclaration(declaration, context)
		) {
			return;
		}

		if (
			getDescriptorAtRule(declaration, context)
			|| hasKeyframesAncestor(declaration, context)
		) {
			return;
		}

		for (const node of declaration.value.children) {
			if (node.type !== 'Identifier') {
				continue;
			}

			const property = normalizeCssIdentifier(node.name);
			if (layoutProperties.has(property)) {
				yield {node, messageId: MESSAGE_ID, data: {property}};
			}
		}
	});

	context.on('Atrule', function * (atRule) {
		if (!isKeyframesAtRule(atRule) || atRule.block?.type !== 'Block') {
			return;
		}

		for (const keyframe of atRule.block.children) {
			if (keyframe.type !== 'Rule' || keyframe.block?.type !== 'Block') {
				continue;
			}

			for (const declaration of keyframe.block.children) {
				if (declaration.type !== 'Declaration') {
					continue;
				}

				const property = normalizeCssIdentifier(declaration.property);
				if (
					!layoutProperties.has(property)
					|| isImportantDeclaration(declaration)
				) {
					continue;
				}

				yield {node: declaration, messageId: MESSAGE_ID, data: {property}};
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
		type: 'suggestion',
		docs: {
			description: 'Disallow animating properties that can affect layout.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: ['css/css'],
	},
};

export default config;
