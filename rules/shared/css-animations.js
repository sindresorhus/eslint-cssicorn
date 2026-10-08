// @ts-check

import {ident} from '@eslint/css-tree';
import {getCanonicalLexerNode, getCommaSeparatedGroups, isKeyframesAtRule} from '../utils/index.js';

/**
@import {AtrulePlain, CssNodePlain, Lexer, LexerMatchResult, ValuePlain} from '@eslint/css-tree';
*/

/**
The lexer accepts plain nodes, but its trace methods are currently typed for linked-list nodes only.

@typedef {LexerMatchResult & {isType: (node: CssNodePlain, type: string) => boolean, isProperty: (node: CssNodePlain, property: string) => boolean}} PlainLexerMatchResult
*/

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

/**
Get the decoded, case-sensitive name of an animation identifier or string.

@param {CssNodePlain} node
*/
const getAnimationName = node => {
	if (node.type === 'Identifier') {
		return ident.decode(node.name);
	}

	if (node.type === 'String') {
		return node.value;
	}
};

/**
@param {CssNodePlain} node
@param {string} property
@param {Lexer} lexer
*/
const isAnimationNameNode = (node, property, lexer) => {
	const name = getAnimationName(node);
	if (name === undefined || name === '') {
		return false;
	}

	const canonicalNode = getCanonicalLexerNode(node);
	const matchResult = /** @type {PlainLexerMatchResult} */ (lexer.matchProperty(property, canonicalNode));
	return Boolean(matchResult.matched && matchResult.isType(canonicalNode, 'keyframes-name'));
};

/**
@param {CssNodePlain} node
@param {{property: string, type?: string}} component
@param {PlainLexerMatchResult} matchResult
*/
const isShorthandComponentNode = (node, component, matchResult) => component.type
	? matchResult.isType(node, component.type)
	: matchResult.isProperty(node, component.property);

/**
@param {number} index
@param {CssNodePlain[]} nodes
@param {PlainLexerMatchResult} matchResult
@param {Lexer} lexer
*/
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

@param {CssNodePlain[]} nodes
@param {string} property
@param {ValuePlain} value
@param {Lexer} lexer
*/
const getGroupAnimationNameNodes = (nodes, property, value, lexer) => {
	const canonicalNodes = nodes.map(node => getCanonicalLexerNode(node));
	const matchResult = /** @type {PlainLexerMatchResult} */ (lexer.matchProperty(property, {...value, children: canonicalNodes}));
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

@param {{value: ValuePlain}} declaration
@param {string} property
@param {Lexer} lexer
*/
const getAnimationNameNodes = (declaration, property, lexer) => getCommaSeparatedGroups(declaration.value)
	.flatMap(({nodes}) => getGroupAnimationNameNodes(nodes, property, declaration.value, lexer));

/**
Get the decoded name of a valid keyframes definition.

@param {AtrulePlain} atRule
@param {Lexer} lexer
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
	getAnimationName, getAnimationNameNodes, getGroupAnimationNameNodes, getKeyframesName,
};

export {getCanonicalLexerNode} from '../utils/index.js';
