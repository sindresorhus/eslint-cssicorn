import type {CssNodePlain, DeclarationPlain} from '@eslint/css-tree';
import {lexer} from '@eslint/css-tree';
import {getChangedShorthandComponent, getShorthandComponents} from '../../rules/shared/css-shorthand-components.js';

declare const declaration: DeclarationPlain;
const components = getShorthandComponents(declaration, {sourceCode: {lexer}});
const slot = components?.get('border-color')?.[0];
if (slot) {
	slot.nodes satisfies CssNodePlain[];
	slot.keys satisfies string[];
	slot.text satisfies string | undefined;
	// @ts-expect-error Slots contain CSS nodes, not source strings.
	slot.nodes.push('blue');
}

const changed = getChangedShorthandComponent(components, components);
if (changed) {
	changed.property satisfies string;
	// A reported component has concrete slots, unlike the decomposed map.
	changed.slots[0].nodes satisfies CssNodePlain[];
}

getChangedShorthandComponent(undefined, components);
// @ts-expect-error Decomposition requires a declaration node.
getShorthandComponents({type: 'Identifier', name: 'border'}, {sourceCode: {lexer}});
// @ts-expect-error Comparison requires decomposed component slots.
getChangedShorthandComponent(new Map([['border-color', ['blue']]]), components);
