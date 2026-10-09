// @ts-check

/**
Properties that size a box, including their logical and min/max variants.
*/
const sizeProperties = new Set([
	'width',
	'height',
	'min-width',
	'min-height',
	'max-width',
	'max-height',
	'inline-size',
	'block-size',
	'min-inline-size',
	'min-block-size',
	'max-inline-size',
	'max-block-size',
]);

export default sizeProperties;
