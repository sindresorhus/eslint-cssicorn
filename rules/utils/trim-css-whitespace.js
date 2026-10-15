// @ts-check

/**
@param {string} character
*/
const isCssWhitespace = character => '\t\n\f\r '.includes(character);

/**
Remove trailing CSS whitespace (space, tab, and line breaks), but not other Unicode whitespace like a no-break space, or a whitespace character that a backslash escapes, like in `a\ `.

The end is trimmed with a backward scan, because a `$`-anchored regex tries every position of the text, which is quadratic for a long run of inner whitespace.

@param {string} string
@returns {string}
*/
export function trimCssWhitespaceEnd(string) {
	let end = string.length;
	while (end > 0 && isCssWhitespace(string[end - 1])) {
		end--;
	}

	let backslashCount = 0;
	while (string[end - 1 - backslashCount] === '\\') {
		backslashCount++;
	}

	if (end < string.length && backslashCount % 2 === 1) {
		end++;
	}

	return string.slice(0, end);
}

/**
Remove leading and trailing CSS whitespace (space, tab, and line breaks), but not other Unicode whitespace like a no-break space, or a whitespace character that a backslash escapes, like in `a\ `.

@param {string} string
@returns {string}
*/
export default function trimCssWhitespace(string) {
	const trimmed = trimCssWhitespaceEnd(string);
	let start = 0;
	while (start < trimmed.length && isCssWhitespace(trimmed[start])) {
		start++;
	}

	return trimmed.slice(start);
}
