import test from 'node:test';
import assert from 'node:assert/strict';
import {generate, lexer, toPlainObject} from '@eslint/css-tree';
import {shorthandProperties, pairShorthands, fourSideShorthands} from '../../rules/shared/css-shorthand-properties.js';
import {getChangedShorthandComponent, getShorthandComponents, supportedShorthands} from '../../rules/shared/css-shorthand-components.js';
import {parse} from '../../rules/utils/index.js';

const getComponents = (property, value) => getShorthandComponents(toPlainObject(parse(`${property}: ${value}`, {context: 'declaration'})), {sourceCode: {lexer}});
const getChange = (property, first, second) => getChangedShorthandComponent(getComponents(property, first), getComponents(property, second));
const getSlotText = slot => slot.text ?? slot.nodes.map(node => generate(node)).join(' ');

test('supports the practical shorthand catalog', () => {
	assert.equal(supportedShorthands.size, 59);
	const excluded = shorthandProperties.keys().filter(property => !supportedShorthands.has(property)).toArray();
	assert.deepEqual(excluded, ['animation-range', 'font-synthesis', 'font-variant', 'grid', 'grid-gap', 'grid-template', 'mask']);
});

test('expands every four-side shorthand', () => {
	for (const property of fourSideShorthands) {
		const first = property.endsWith('color') ? 'red green blue black' : (property.endsWith('style') ? 'solid dashed dotted double' : '1px 2px 3px 4px');
		const second = property.endsWith('color') ? 'red green blue white' : (property.endsWith('style') ? 'solid dashed dotted groove' : '1px 2px 3px 5px');
		assert.equal(getChange(property, first, second)?.property, shorthandProperties.get(property).components[3], property);
	}
});

test('expands every pair shorthand', () => {
	for (const property of pairShorthands) {
		let values = ['1px 2px', '1px 3px'];
		if (property.endsWith('color')) {
			values = ['red blue', 'red green'];
		} else if (property.endsWith('style')) {
			values = ['solid dashed', 'solid dotted'];
		} else if (property === 'overflow') {
			values = ['hidden auto', 'hidden scroll'];
		} else if (property === 'overscroll-behavior') {
			values = ['auto contain', 'auto none'];
		}

		const [first, second] = values;
		assert.equal(getChange(property, first, second)?.property, shorthandProperties.get(property).components[1], property);
	}
});

const changes = [
	['border', '1px solid red', '1px solid blue', 'border-color'],
	...[
		'top', 'right', 'bottom', 'left', 'block', 'inline', 'block-start', 'block-end', 'inline-start', 'inline-end',
	].map(side => [`border-${side}`, '1px solid red', '1px solid blue', `border-${side}-color`]),
	['outline', '1px solid red', '1px solid blue', 'outline-color'],
	['column-rule', '1px solid red', '1px solid blue', 'column-rule-color'],
	['flex', '1 1 10px', '2 1 10px', 'flex-grow'],
	['flex-flow', 'row wrap', 'column wrap', 'flex-direction'],
	['columns', '10em 3', '10em 4', 'column-count'],
	['list-style', 'square inside url(a)', 'circle inside url(a)', 'list-style-type'],
	['text-decoration', 'underline dotted red 2px', 'underline dotted blue 2px', 'text-decoration-color'],
	['text-emphasis', 'filled dot red', 'filled dot blue', 'text-emphasis-color'],
	['border-image', 'url(a) 30 / 1 / 0 stretch', 'url(a) 40 / 1 / 0 stretch', 'border-image-slice'],
	['mask-border', 'url(a) 30 / 1 / 0 stretch alpha', 'url(a) 40 / 1 / 0 stretch alpha', 'mask-border-slice'],
	['border-radius', '1px 2px 3px 4px / 5px 6px 7px 8px', '1px 2px 3px 9px / 5px 6px 7px 8px', 'border-bottom-left-radius'],
	['place-content', 'center start', 'end start', 'align-content'],
	['place-items', 'center start', 'end start', 'align-items'],
	['place-self', 'center start', 'end start', 'align-self'],
	['grid-row', '1 / 2', '1 / 3', 'grid-row-end'],
	['grid-column', '1 / 2', '1 / 3', 'grid-column-end'],
	['grid-area', '1 / 2 / 3 / 4', '1 / 2 / 3 / 5', 'grid-column-end'],
	['font', 'italic 16px/1.5 Arial, sans-serif', 'italic 20px/1.5 Arial, sans-serif', 'font-size'],
	['background', 'url(a) center / cover no-repeat red', 'url(a) center / cover no-repeat blue', 'background-color'],
	['animation', 'fade 1s ease 0s infinite', 'fade 2s ease 0s infinite', 'animation-duration'],
	['transition', 'opacity 1s ease 0s', 'opacity 2s ease 0s', 'transition-duration'],
];

for (const [property, first, second, expected] of changes) {
	test(`finds the changed component of ${property}`, () => {
		assert.equal(getChange(property, first, second)?.property, expected);
	});
}

test('preserves components across shorthand reordering and keyword case', () => {
	assert.equal(getChange('border', 'SOLID 1PX RED', 'blue 1px solid')?.property, 'border-color');
	assert.equal(getChange('animation', 'EASE 1s fade', 'ease 2s fade')?.property, 'animation-duration');
	assert.equal(getChange('animation', 'ease 1s fade', 'ease 1s FADE')?.property, 'animation-name');
	assert.equal(getChange('border', String.raw`1\70 x SOLID RED`, '1px solid blue')?.property, 'border-color');
});

test('classifies repeated normal font keywords without guessing omitted defaults', () => {
	assert.equal(getChange('font', 'normal normal normal 16px Arial', 'normal normal normal 20px Arial')?.property, 'font-size');
	assert.equal(getChange('font', 'normal 16px Arial', 'normal 20px Arial')?.property, 'font-size');
	assert.equal(getChange('font', 'normal 16px Arial', '16px Arial'), undefined);
});

test('returns every comma-separated layer of a changed component', () => {
	const change = getChange('animation', 'fade 1s ease, slide 2s linear', 'fade 3s ease, slide 4s linear');
	assert.equal(change.property, 'animation-duration');
	assert.deepEqual(change.slots.map(slot => slot.nodes.map(node => generate(node)).join(' ')), ['3s', '4s']);
});

test('expands copied values before comparing', () => {
	assert.equal(getChange('margin', '1px', '1px 1px 1px 2px')?.property, 'margin-left');
	assert.equal(getChange('place-items', 'center', 'center end')?.property, 'justify-items');
	assert.equal(getChange('grid-row', 'hero', 'hero / other')?.property, 'grid-row-end');
	assert.equal(getChange('list-style', 'none inside', 'none outside')?.property, 'list-style-position');
});

test('preserves the changed component value', () => {
	for (const [property, first, second, expectedProperty, expectedValue] of [
		['border', '1px solid red', '1px solid blue', 'border-color', 'blue'],
		['font', 'italic 16px Arial, serif', 'italic 16px Georgia, serif', 'font-family', 'Georgia , serif'],
		['border-radius', '1px 2px 3px 4px', '1px 2px 3px 5px', 'border-bottom-left-radius', '5px'],
		['border-radius', '1px 2px 3px 4px / 1px 2px 3px 8px', '1px 2px 3px 9px / 1px 2px 3px 8px', 'border-bottom-left-radius', '9px 8px'],
		['text-decoration', 'underline solid red', 'underline overline solid red', 'text-decoration-line', 'underline overline'],
		['columns', '10em 3 / 20em', '10em 3 / 30em', 'column-height', '30em'],
	]) {
		const changed = getChange(property, first, second);
		assert.equal(changed?.property, expectedProperty);
		assert.equal(changed.slots.map(slot => getSlotText(slot)).join(', '), expectedValue);
	}
});

test('applies dependent alignment and grid defaults', () => {
	assert.deepEqual(getComponents('place-content', 'first baseline').get('justify-content').map(slot => getSlotText(slot)), ['start']);
	assert.deepEqual(getComponents('grid-area', 'hero').get('grid-column-end').map(slot => getSlotText(slot)), ['hero']);
	assert.deepEqual(getComponents('grid-area', '1').get('grid-column-end').map(slot => getSlotText(slot)), ['auto']);
	assert.equal(getChange('grid-area', '1 / 2 / 3 / 4', '1 / 2 / 3')?.property, 'grid-column-end');
});

test('maps background boxes and retains only the final color slot', () => {
	assert.equal(getChange('background', 'url(a) padding-box border-box', 'url(a) padding-box content-box')?.property, 'background-clip');
	assert.equal(getChange('background', 'url(a) padding-box', 'url(a) padding-box border-box')?.property, 'background-clip');
	assert.equal(getChange('background', 'url(a), url(b) red', 'url(a), url(b) blue')?.property, 'background-color');
	assert.equal(getComponents('background', 'url(a), url(b) red').get('background-color').length, 1);
});

test('keeps keyword-like animation names and custom identifiers case-sensitive', () => {
	assert.equal(getChange('animation', 'ease 1s ease', 'ease 1s EASE')?.property, 'animation-name');
	assert.equal(getChange('animation', 'ease 1s fade', 'EASE 2s FADE'), undefined);
	assert.equal(getChange('list-style', 'Custom inside', 'CUSTOM inside')?.property, 'list-style-type');
	assert.equal(getChange('font', '16px Arial', '16px ARIAL')?.property, 'font-family');
});

test('requires every differing list slot to have an explicit value', () => {
	assert.equal(getChange('animation', 'fade 1s ease, slide 2s linear', 'fade 3s, slide 4s'), undefined);
	assert.equal(getChange('animation', 'fade 1s ease, slide 2s', 'fade 1s linear, slide 2s'), undefined);
	assert.equal(getChange('transition', 'opacity 1s, color 2s', 'opacity 3s'), undefined);
	assert.equal(getChange('animation', 'fade 1s, slide 2s', 'fade 3s, slide 2s')?.property, 'animation-duration');
});

test('ignores unchanged, ambiguous, unresolved, and unsupported values', () => {
	assert.equal(getChange('border', '1px solid red', '1px solid red'), undefined);
	assert.equal(getChange('border', '1px solid red', '2px solid blue'), undefined);
	assert.equal(getChange('border', '1px solid red', '1px solid'), undefined);
	for (const [property, value] of [
		['border', 'var(--border)'],
		['margin', 'inherit'],
		['flex', 'none'],
		['font', 'caption'],
		['grid', 'none'],
		['border', 'red red'],
		['outline', 'auto'],
		['animation', '1s ease'],
		['animation', 'fade 1s auto'],
		['transition', 'none 1s, opacity 2s'],
		['border', 'random() solid red'],
	]) {
		assert.equal(getComponents(property, value), undefined, `${property}: ${value}`);
	}

	assert.equal(getShorthandComponents({property: 'border', value: {type: 'Raw', value: '??'}}, {sourceCode: {lexer}}), undefined);
});
