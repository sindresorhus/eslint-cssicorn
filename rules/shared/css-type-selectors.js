import {tokenize, tokenTypes} from '@eslint/css-tree';

export const deprecatedHtmlTypeSelectors = new Set([
	'acronym',
	'applet',
	'basefont',
	'big',
	'bgsound',
	'blink',
	'center',
	'content',
	'dir',
	'font',
	'frame',
	'frameset',
	'isindex',
	'keygen',
	'listing',
	'marquee',
	'menuitem',
	'multicol',
	'nextid',
	'nobr',
	'noembed',
	'noframes',
	'plaintext',
	'param',
	'popup',
	'rb',
	'rtc',
	'selectmenu',
	'shadow',
	'spacer',
	'strike',
	'tt',
	'xmp',
]);
export const deprecatedSvgTypeSelectors = new Set([
	'altGlyph',
	'altGlyphDef',
	'altGlyphItem',
	'cursor',
	'font',
	'font-face',
	'font-face-format',
	'font-face-name',
	'font-face-src',
	'font-face-uri',
	'glyph',
	'glyphRef',
	'hatchPath',
	'hkern',
	'missing-glyph',
	'tref',
	'vkern',
]);

/**
Get the local identifier and its offsets in a type selector, excluding a namespace prefix or universal selector.

@param {string} value - The raw type selector name.
@returns {{value: string, offsets: [number, number]} | undefined}
*/
export function getTypeSelectorIdentifier(value) {
	let identifier;
	let lastTokenType;
	tokenize(value, (type, start, end) => {
		lastTokenType = type;
		if (type === tokenTypes.Ident) {
			identifier = {value: value.slice(start, end), offsets: [start, end]};
		}
	});

	return lastTokenType === tokenTypes.Ident ? identifier : undefined;
}
