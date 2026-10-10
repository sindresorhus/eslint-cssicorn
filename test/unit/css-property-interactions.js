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

test('unsupported names cannot be enabled by a custom ordering list', () => {
	for (const property of ['--color', '-webkit-appearance', 'page-break-before', 'page-break-after', 'page-break-inside', 'glyph-orientation-vertical', '__proto__']) {
		assert.equal(interactions.has(property), false);
	}
});

test('the vendored Concentric order has unique names and orders layout before color', () => {
	assert.equal(new Set(concentricOrder).size, concentricOrder.length);
	assert.ok(concentricOrder.indexOf('display') < concentricOrder.indexOf('color'));
});
