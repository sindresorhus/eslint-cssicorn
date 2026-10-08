// Math functions inherit their calculation context and accept calculations as arguments. Numeric functions with other argument grammars, like calc-size(), are excluded.
// https://drafts.csswg.org/css-values-4/#math
// https://drafts.csswg.org/css-values-5/#progress
// https://drafts.csswg.org/css-values-5/#random
export default new Set([
	'abs',
	'acos',
	'asin',
	'atan',
	'atan2',
	'calc',
	'clamp',
	'cos',
	'exp',
	'hypot',
	'log',
	'max',
	'min',
	'mod',
	'pow',
	'progress',
	'random',
	'rem',
	'round',
	'sign',
	'sin',
	'sqrt',
	'tan',
]);
