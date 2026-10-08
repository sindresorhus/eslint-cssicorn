import assert from 'node:assert/strict';
import test from 'node:test';
import {nonAnimatableProperties, discreteProperties} from '../../rules/shared/css-property-animation-types.js';
import {shorthandProperties} from '../../rules/shared/css-shorthand-properties.js';

test('property animation catalogs are sorted, unique, and disjoint', () => {
	for (const properties of [nonAnimatableProperties, discreteProperties]) {
		assert.equal(new Set(properties).size, properties.length);
		for (let index = 1; index < properties.length; index++) {
			assert.ok(properties[index - 1] < properties[index]);
		}

		assert.equal(properties.some(property => property.startsWith('-') || shorthandProperties.has(property)), false);
	}

	assert.equal(nonAnimatableProperties.some(property => discreteProperties.includes(property)), false);
});

test('catalogs include audited animation types and exclude ambiguous targets', () => {
	for (const property of ['transition-duration', 'animation-name', 'contain', 'will-change']) {
		assert.ok(nonAnimatableProperties.includes(property), property);
	}

	for (const property of ['display', 'content-visibility', 'overlay', 'position', 'cursor', 'font-family']) {
		assert.ok(discreteProperties.includes(property), property);
	}

	const excludedProperties = [
		'visibility',
		'background-image',
		'border-image-source',
		'list-style-image',
		'mask-image',
		'mask-border-source',
		'font-style',
		'stroke-miterlimit',
		'text-overflow',
		'direction',
		'unicode-bidi',
		'text-box',
		'background-repeat',
		'opacity',
		'transform',
	];
	for (const property of excludedProperties) {
		assert.equal(nonAnimatableProperties.includes(property) || discreteProperties.includes(property), false, property);
	}
});
