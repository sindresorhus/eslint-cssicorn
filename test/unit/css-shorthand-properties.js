import assert from 'node:assert/strict';
import test from 'node:test';
import {shorthandProperties, shorthandToAffectedProperties} from '../../rules/shared/css-shorthand-properties.js';

test('additional affected properties do not enable unsupported shorthand serialization', () => {
	assert.equal(shorthandProperties.has('white-space'), false);
	assert.deepEqual([...shorthandToAffectedProperties.get('white-space')], ['white-space-collapse', 'text-wrap-mode', 'white-space-trim']);
	assert.equal(shorthandProperties.has('text-wrap'), false);
	assert.deepEqual([...shorthandToAffectedProperties.get('text-wrap')], ['text-wrap-mode', 'text-wrap-style']);
});

test('additional animation resets preserve existing components and nested resets', () => {
	const properties = shorthandToAffectedProperties.get('animation');
	for (const property of ['animation-name', 'animation-timeline', 'animation-range-start', 'animation-range-end', 'animation-composition', 'animation-trigger']) {
		assert.ok(properties.has(property), property);
	}

	assert.equal(shorthandProperties.get('animation').components.includes('animation-composition'), false);
});
