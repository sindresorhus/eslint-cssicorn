// Color functions with an optional alpha component. Absolute colors default to opaque; relative colors inherit their origin's alpha.
// https://drafts.csswg.org/css-color-4/#color-functions
// https://drafts.csswg.org/css-color-5/#relative-colors
export default new Set(['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color']);
