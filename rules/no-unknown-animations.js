import {getAnimationName, getAnimationNameNodes, getKeyframesName} from './shared/css-animations.js';
import {normalizeCssIdentifier} from './utils/index.js';

const MESSAGE_ID = 'no-unknown-animations';
const messages = {
	[MESSAGE_ID]: 'Unknown animation `{{name}}`.',
};

const animationProperties = new Set([
	'animation',
	'animation-name',
]);

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {lexer} = sourceCode;
	const definedAnimationNames = new Set();
	const animationNameReferences = [];

	context.on('Atrule', atRule => {
		const name = getKeyframesName(atRule, lexer);
		if (name !== undefined) {
			definedAnimationNames.add(name);
		}
	});

	context.on('Declaration', declaration => {
		const property = normalizeCssIdentifier(declaration.property);
		if (
			!animationProperties.has(property)
			|| declaration.value.type !== 'Value'
			|| sourceCode.getParent(declaration)?.type !== 'Block'
		) {
			return;
		}

		for (const node of getAnimationNameNodes(declaration, property, lexer)) {
			animationNameReferences.push({
				node,
				name: getAnimationName(node),
			});
		}
	});

	context.onExit('StyleSheet', function * () {
		for (const {node, name} of animationNameReferences) {
			if (!definedAnimationNames.has(name)) {
				yield {
					node,
					messageId: MESSAGE_ID,
					data: {name},
				};
			}
		}
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
			description: 'Disallow unknown animations.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
