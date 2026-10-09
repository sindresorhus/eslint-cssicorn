import {decodeCssIdentifier} from './normalize-css-identifier.js';

/**
Check whether a name is a dashed identifier, like the custom property name `--color`, decoding escapes. Custom property, function, and selector names are dashed identifiers.

@param {string} name - The raw name, for example `node.property`.
@returns {boolean}
*/
export default function isDashedIdentifier(name) {
	return decodeCssIdentifier(name).startsWith('--');
}
