import {ident} from '@eslint/css-tree';
import {getCommaSeparatedGroups, isKeyframesAtRule} from '../utils/index.js';

const animationShorthandComponents = [
	{property: 'animation-duration'},
	{property: 'animation-timing-function', type: 'easing-function'},
	{property: 'animation-delay'},
	{property: 'animation-iteration-count', type: 'single-animation-iteration-count'},
	{property: 'animation-direction', type: 'single-animation-direction'},
	{property: 'animation-fill-mode', type: 'single-animation-fill-mode'},
	{property: 'animation-play-state', type: 'single-animation-play-state'},
	{property: 'animation-timeline', type: 'single-animation-timeline'},
];

// The lexer does not consistently recognize escaped keyword, function, or unit spellings.
/**
Decode and re-encode identifier spellings in a value for lexer matching without changing the source AST.
*/
const getCanonicalLexerNode = node => {
	let canonicalNode = node;
	if (node.type === 'Identifier' || node.type === 'Function') {
		canonicalNode = {...node, name: ident.encode(ident.decode(node.name))};
	} else if (node.type === 'Dimension') {
		canonicalNode = {...node, unit: ident.encode(ident.decode(node.unit))};
	}

	if (node.children) {
		canonicalNode = {
			...canonicalNode,
			children: node.children.map(child => getCanonicalLexerNode(child)),
		};
	}

	return canonicalNode;
};

/**
Get the decoded, case-sensitive name of an animation identifier or string.
*/
const getAnimationName = node => {
	if (node.type === 'Identifier') {
		return ident.decode(node.name);
	}

	if (node.type === 'String') {
		return node.value;
	}
};

const isAnimationNameNode = (node, property, lexer) => {
	const name = getAnimationName(node);
	if (name === undefined || name === '') {
		return false;
	}

	const canonicalNode = getCanonicalLexerNode(node);
	const matchResult = lexer.matchProperty(property, canonicalNode);
	return Boolean(matchResult.matched && matchResult.isType(canonicalNode, 'keyframes-name'));
};

const isShorthandComponentNode = (node, component, matchResult) => component.type
	? matchResult.isType(node, component.type)
	: matchResult.isProperty(node, component.property);

const isAnimationNameByShorthandOrder = (index, nodes, matchResult, lexer) => {
	const node = nodes[index];
	const previousNodes = nodes.slice(0, index);
	return animationShorthandComponents.every(component =>
		!lexer.matchProperty(component.property, node).matched
		|| previousNodes.some(previousNode => isShorthandComponentNode(previousNode, component, matchResult)),
	);
};

/**
Get animation name nodes from one comma-separated animation layer.
*/
const getGroupAnimationNameNodes = (nodes, property, value, lexer) => {
	const canonicalNodes = nodes.map(node => getCanonicalLexerNode(node));
	const matchResult = lexer.matchProperty(property, {...value, children: canonicalNodes});
	if (matchResult.matched) {
		const animationNameIndex = canonicalNodes.findIndex((node, index) => getAnimationName(nodes[index]) !== '' && matchResult.isType(node, 'keyframes-name'));
		if (animationNameIndex === -1) {
			return [];
		}

		if (
			property === 'animation-name'
			|| isAnimationNameByShorthandOrder(
				animationNameIndex,
				canonicalNodes,
				matchResult,
				lexer,
			)
		) {
			return [nodes[animationNameIndex]];
		}
	}

	return nodes.filter(node => isAnimationNameNode(node, property, lexer));
};

/**
Get literal animation name nodes from a declaration, including best-effort shorthand matching.
*/
const getAnimationNameNodes = (declaration, property, lexer) => getCommaSeparatedGroups(declaration.value)
	.flatMap(({nodes}) => getGroupAnimationNameNodes(nodes, property, declaration.value, lexer));

/**
Get the decoded name of a valid keyframes definition.
*/
const getKeyframesName = (atRule, lexer) => {
	if (
		!isKeyframesAtRule(atRule)
		|| atRule.prelude?.type !== 'AtrulePrelude'
		|| atRule.block?.type !== 'Block'
		|| atRule.prelude.children.length !== 1
	) {
		return;
	}

	const [nameNode] = atRule.prelude.children;
	const name = getAnimationName(nameNode);
	if (!isAnimationNameNode(nameNode, 'animation-name', lexer)) {
		return;
	}

	return name;
};

export {
	getAnimationName, getAnimationNameNodes, getCanonicalLexerNode, getGroupAnimationNameNodes, getKeyframesName,
};
