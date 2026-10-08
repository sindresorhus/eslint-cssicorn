// @ts-check

import {normalizeCssIdentifier} from '../utils/index.js';
import colorFunctionsWithAlpha from './css-color-functions.js';
import {getNumericLiteralKey} from './css-numeric-literals.js';
import {areEqualValues} from './css-shorthand-values.js';
import namedColors from './named-colors.js';

/**
@import {CssNode, CssNodePlain, NumberNode, Percentage} from '@eslint/css-tree';
@import {CssicornContext} from '../rule/cssicorn-context.js';
*/

/**
Check for a literal named, hexadecimal, or absolute functional color.

@param {CssNode | CssNodePlain} node
@param {CssicornContext} context
@returns {boolean}
*/
export function isLiteralColor(node, context) {
	if (node.type === 'Function') {
		if (!colorFunctionsWithAlpha.has(normalizeCssIdentifier(node.name))
			|| [...node.children].some(value => !['Number', 'Dimension', 'Percentage', 'Operator', 'Identifier'].includes(value.type)
				|| (value.type === 'Identifier' && (normalizeCssIdentifier(value.name) === 'from' || normalizeCssIdentifier(value.name).startsWith('--'))))
		) {
			return false;
		}
	} else if (!['Hash', 'Identifier'].includes(node.type)) {
		return false;
	}

	if (node.type === 'Identifier' || node.type === 'Function') {
		node = {...node, name: normalizeCssIdentifier(node.name)};
	}

	return Boolean(context.sourceCode.lexer.matchType('color-base', node).matched);
}

/**
Compare literal colors conservatively within the same color space, preserving the existing simplification contract.

@param {CssNode | CssNodePlain} first
@param {CssNode | CssNodePlain} second
@returns {boolean}
*/
export function areEqualLiteralColors(first, second) {
	if (first.type === 'Function' && second.type === 'Function') {
		const names = [first, second].map(color => {
			const name = normalizeCssIdentifier(color.name);
			return name === 'rgba' || name === 'hsla' ? name.slice(0, -1) : name;
		});
		const values = [...first.children];
		const otherValues = [...second.children];
		if (names[0] !== names[1] || values.length !== otherValues.length
			|| values.some((value, index) => {
				if (names[0] === 'color' && index === 0
					&& [value, otherValues[index]].every(child => child.type === 'Identifier' && ['xyz', 'xyz-d65'].includes(normalizeCssIdentifier(child.name)))) {
					return false;
				}

				const literalKey = getNumericLiteralKey(value);
				return literalKey === undefined ? !areEqualValues(value, otherValues[index]) : literalKey !== getNumericLiteralKey(otherValues[index]);
			})
		) {
			return false;
		}
	} else if (!['Hash', 'Identifier'].includes(first.type) || !areEqualValues(first, second)) {
		return false;
	}

	return true;
}

/**
@param {number} value
*/
const clampUnit = value => Math.min(1, Math.max(0, value));

/**
@param {CssNode | CssNodePlain} node
@returns {number[] | undefined}
*/
function getRgbComponents(node) {
	if (node.type === 'Identifier') {
		const name = normalizeCssIdentifier(node.name);
		if (name === 'transparent') {
			return [0, 0, 0, 0];
		}

		const hex = namedColors.get(name);
		return hex ? getRgbComponents({type: 'Hash', value: hex}) : undefined;
	}

	if (node.type === 'Hash') {
		let hex = node.value;
		if (hex.length === 3 || hex.length === 4) {
			hex = [...hex].map(character => character + character).join('');
		}

		if (hex.length === 6) {
			hex += 'ff';
		}

		return [0, 2, 4, 6].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
	}

	if (node.type !== 'Function' || !['rgb', 'rgba'].includes(normalizeCssIdentifier(node.name))) {
		return;
	}

	const components = [...node.children].filter(child => child.type !== 'Operator');
	if (components.some(child => child.type !== 'Number' && child.type !== 'Percentage')) {
		return;
	}

	const numericComponents = /** @type {(NumberNode | Percentage)[]} */ (components);
	const channels = numericComponents.map((component, index) => clampUnit(Number(component.value) / (component.type === 'Percentage' ? 100 : (index === 3 ? 1 : 255))));
	if (channels.length === 3) {
		channels.push(1);
	}

	return channels;
}

/**
Compare common sRGB literals across named, hex, and RGB syntax without rounding. Other color spaces retain the conservative structural comparison.

@param {CssNode | CssNodePlain} first
@param {CssNode | CssNodePlain} second
@returns {boolean}
*/
export function areEquivalentColors(first, second) {
	if (areEqualLiteralColors(first, second)) {
		return true;
	}

	const channels = getRgbComponents(first);
	const otherChannels = getRgbComponents(second);
	return Boolean(channels && otherChannels && channels.every((channel, index) => channel === otherChannels[index]));
}
