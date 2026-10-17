import hasCommentInRange from './has-comment-in-range.js';

/**
@import {CssicornContext} from '../rule/cssicorn-context.js';
*/

const isCssWhitespace = character => '\t\n\f\r '.includes(character);
const isHorizontalWhitespace = character => character === ' ' || character === '\t';
// The start and the end of the text also end a line.
const isLineBoundary = character => character === undefined || '\n\r\f'.includes(character);

/**
Get the range to remove so a whole declaration disappears, including its trailing `;`. When the declaration is alone on its line, the range covers the whole line with its line break, so no whitespace-only line is left. Returns `undefined` when the declaration contains a comment, because removing it would drop the comment.

@param {import('@eslint/css-tree').DeclarationPlain} declaration
@param {CssicornContext} context
@returns {[number, number] | undefined}
*/
export default function getDeclarationRemovalRange(declaration, context) {
	const {sourceCode} = context;
	const {text} = sourceCode;
	const [start, end] = sourceCode.getRange(declaration);
	if (hasCommentInRange(context, [start, end])) {
		return;
	}

	const removalEnd = end + (text[end] === ';' ? 1 : 0);

	let lineStart = start;
	while (isHorizontalWhitespace(text[lineStart - 1])) {
		lineStart--;
	}

	// Without a `;`, the range of the last declaration includes the whitespace before `}`.
	let lineEnd = removalEnd;
	while (isCssWhitespace(text[lineEnd - 1])) {
		lineEnd--;
	}

	while (isHorizontalWhitespace(text[lineEnd])) {
		lineEnd++;
	}

	if (isLineBoundary(text[lineStart - 1]) && isLineBoundary(text[lineEnd])) {
		const linebreakLength = text.startsWith('\r\n', lineEnd) ? 2 : 1;
		return [lineStart, Math.min(lineEnd + linebreakLength, text.length)];
	}

	return [start, removalEnd];
}
