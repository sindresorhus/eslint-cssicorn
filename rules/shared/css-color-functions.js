// Color functions with an optional alpha component. Absolute colors default to opaque; relative colors inherit their origin's alpha.
// https://drafts.csswg.org/css-color-4/#color-functions
// https://drafts.csswg.org/css-color-5/#relative-colors
const colorFunctionsWithAlpha = new Set(['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color']);

// Color-producing functions, including functions that combine or select colors.
export const colorFunctions = new Set([...colorFunctionsWithAlpha, 'color-mix', 'light-dark', 'device-cmyk', 'contrast-color']);

// Functions whose arguments can contain non-color tokens, so the value is not a literal color and must not be rewritten.
export const nonColorFunctions = new Set(['element', '-moz-element', 'url']);

export default colorFunctionsWithAlpha;
