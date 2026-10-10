import assert from 'node:assert/strict';
import test from 'node:test';
import interactions from '../../rules/shared/css-property-interactions.js';
import concentricOrder from '../../rules/shared/concentric-property-order.js';

test('property data accounts for aliases, shorthand resets, and logical counterparts', () => {
	for (const [first, second] of [
		['background', 'background-blend-mode'],
		['background-position', 'background-position-x'],
		['border', 'border-image-source'],
		['font', 'font-feature-settings'],
		['font', 'font-width'],
		['font-synthesis', 'font-synthesis-position'],
		['white-space', 'text-wrap'],
		['white-space', 'white-space-trim'],
		['animation', 'animation-composition'],
		['animation', 'animation-range-start'],
		['columns', 'column-wrap'],
		['view-timeline', 'view-timeline-inset'],
		['event-trigger', 'event-trigger-source'],
		['line-clamp', 'max-lines'],
		['font-stretch', 'font-width'],
		['grid-gap', 'gap'],
		['word-wrap', 'overflow-wrap'],
		['margin-left', 'margin-inline-start'],
		['width', 'inline-size'],
		['overflow-x', 'overflow-inline'],
		['border-top-left-radius', 'border-start-start-radius'],
	]) {
		assert.equal(interactions.get(first).isDisjointFrom(interactions.get(second)), false, `${first} and ${second}`);
	}
});

test('independent properties have independent footprints', () => {
	for (const [first, second] of [['display', 'color'], ['margin', 'padding'], ['font', 'background'], ['font', 'font-palette']]) {
		assert.equal(interactions.get(first).isDisjointFrom(interactions.get(second)), true, `${first} and ${second}`);
	}
});

test('standardized prefixed text properties retain their distinct cascade footprints', () => {
	assert.deepEqual(
		interactions.keys().filter(property => property.startsWith('-')).toArray(),
		['-webkit-text-fill-color', '-webkit-text-stroke', '-webkit-text-stroke-color', '-webkit-text-stroke-width'],
	);
	assert.deepEqual(interactions.get('-webkit-text-stroke'), new Set([
		'property:-webkit-text-stroke',
		'property:-webkit-text-stroke-color',
		'property:-webkit-text-stroke-width',
	]));

	for (const property of ['-webkit-text-fill-color', '-webkit-text-stroke-color', '-webkit-text-stroke-width']) {
		assert.deepEqual(interactions.get(property), new Set([`property:${property}`]));
		assert.equal(interactions.get(property).isDisjointFrom(interactions.get('color')), true);
	}

	for (const property of ['-webkit-text-stroke-color', '-webkit-text-stroke-width']) {
		assert.equal(interactions.get('-webkit-text-stroke').isDisjointFrom(interactions.get(property)), false);
	}

	assert.equal(interactions.get('-webkit-text-stroke').isDisjointFrom(interactions.get('-webkit-text-fill-color')), true);
});

test('unsupported names cannot be enabled by a custom ordering list', () => {
	for (const property of [
		'--color',
		'-webkit-appearance',
		'-webkit-line-clamp',
		'-moz-text-stroke',
		'page-break-before',
		'page-break-after',
		'page-break-inside',
		'glyph-orientation-vertical',
		'rule-inset-cap',
		'rule-inset-junction',
		'rule-visibility-items',
		'__proto__',
	]) {
		assert.equal(interactions.has(property), false);
	}
});

test('the vendored Concentric order has unique names and orders layout before color', () => {
	assert.equal(new Set(concentricOrder).size, concentricOrder.length);
	assert.ok(concentricOrder.indexOf('display') < concentricOrder.indexOf('color'));
});
