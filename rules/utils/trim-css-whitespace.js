// @ts-check

/**
Remove leading and trailing CSS whitespace (space, tab, and line breaks), but not other Unicode whitespace like a no-break space.

The end is trimmed with a backward scan, because a `$`-anchored regex tries every position of the text, which is quadratic for a long run of inner whitespace.

@param {string} string
@returns {string}
*/
export default function trimCssWhitespace(string) {
	let end = string.length;
	while (end > 0 && '\t\n\f\r '.includes(string[end - 1])) {
		end--;
	}

	let start = 0;
	while (start < end && '\t\n\f\r '.includes(string[start])) {
		start++;
	}

	return string.slice(start, end);
}
