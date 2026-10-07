// @ts-check

/**
Value grammars for media features that support range notation and min-/max- prefixes.
*/
export const rangeMediaFeatureSyntaxes = new Map([
	['aspect-ratio', '<ratio>'],
	['color', '<integer>'],
	['color-index', '<integer>'],
	['device-aspect-ratio', '<ratio>'],
	['device-height', '<length>'],
	['device-width', '<length>'],
	['height', '<length>'],
	['horizontal-viewport-segments', '<integer>'],
	['monochrome', '<integer>'],
	['resolution', '<resolution> | infinite'],
	['vertical-viewport-segments', '<integer>'],
	['width', '<length>'],
]);

export const rangeMediaFeatureNames = new Set(rangeMediaFeatureSyntaxes.keys());
