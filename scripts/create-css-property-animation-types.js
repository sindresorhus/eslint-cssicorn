import fs from 'node:fs';
import webref from '@webref/css';
import {shorthandToAffectedProperties} from '../rules/shared/css-shorthand-properties.js';

const targetUrl = new URL('../rules/shared/css-property-animation-types.js', import.meta.url);
const {properties} = await webref.listAll();
const excludedProperties = new Set([
	// Special interpolation permits transitions under normal: https://www.w3.org/TR/web-animations-1/#animating-visibility
	'visibility',
	// Conflicting property tables and image interpolation prose: https://drafts.csswg.org/css-images-4/#interpolation
	'background-image',
	'border-image-source',
	'list-style-image',
	'mask-image',
	'mask-border-source',
	// Conflicting classifications across specifications: https://drafts.csswg.org/css-fonts-4/#propdef-font-style
	'font-style',
	// https://www.w3.org/TR/SVG2/painting.html#StrokeMiterlimitProperty
	'stroke-miterlimit',
	// https://drafts.csswg.org/css-overflow-4/#propdef-text-overflow
	'text-overflow',
	// https://drafts.csswg.org/css-writing-modes-4/
	'direction',
	'unicode-bidi',
	// Missing shorthand metadata: https://drafts.csswg.org/css-backgrounds-4/#propdef-background-repeat
	'background-repeat',
]);

const nonAnimatableProperties = new Set();
const discreteProperties = new Set([
	// These property tables refer to prose describing their discrete interpolation.
	// https://drafts.csswg.org/css-display-4/#display-animation
	'display',
	// https://drafts.csswg.org/css-contain-2/#content-visibility-animation
	'content-visibility',
	// https://drafts.csswg.org/css-position-4/#overlay
	'overlay',
]);

for (const {name, animationType, longhands} of properties) {
	if (name.startsWith('-') || excludedProperties.has(name) || shorthandToAffectedProperties.has(name) || longhands?.length > 0) {
		continue;
	}

	if (animationType === 'not animatable') {
		nonAnimatableProperties.add(name);
	} else if (animationType === 'discrete') {
		discreteProperties.add(name);
	}
}

// Classify a shorthand only when every affected longhand has the same known animation type.
for (const [shorthand, affectedProperties] of shorthandToAffectedProperties) {
	const longhands = [...affectedProperties].filter(property => !shorthandToAffectedProperties.has(property));
	for (const properties of [nonAnimatableProperties, discreteProperties]) {
		if (longhands.length > 0 && longhands.every(property => properties.has(property))) {
			properties.add(shorthand);
		}
	}
}

const compareProperties = (first, second) => {
	if (first === second) {
		return 0;
	}

	return first < second ? -1 : 1;
};

const content = [
	'// Generated file, DO NOT edit',
	'',
	...Object.entries({nonAnimatableProperties, discreteProperties}).flatMap(([name, properties]) => [
		`export const ${name} = [`,
		...[...properties].toSorted(compareProperties).map(property => `\t'${property}',`),
		'];',
		'',
	]),
].join('\n');

if (process.argv.includes('--check')) {
	if (fs.readFileSync(targetUrl, 'utf8') !== content) {
		console.error('The property animation types are out of date. Run `npm run fix:css-property-animation-types`.');
		process.exitCode = 1;
	}
} else {
	fs.writeFileSync(targetUrl, content);
}
