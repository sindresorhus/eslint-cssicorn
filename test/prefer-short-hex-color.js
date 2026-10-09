import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'a { color: #fff; background: #abcd; }',
		'a { color: #a4a4a4; background: #aabbccdf; }',
		'#ffffff { color: red; }',
		'a { content: "#ffffff"; background: url(#ffffff); background-image: url("#aabbccdd"); /* #ffffff */ }',
		'a { background-image: element(#ffffff); background-image: -moz-element(#aabbccdd); }',
		String.raw`a { background: u\72l(#ffffff); --image: u\72l(#aabbccdd); --upper-image: U\52L(#ffffff); color: custom(u\72l(#ffffff)); }`,
		String.raw`a { color: #\66fffff; color: #fffff; }`,
		// CSS Modules interop blocks are read by JavaScript as exact strings.
		':export { primaryColor: #ff0000; color: #aabbccdd; }',
		':import("./theme.css") { color: #ff0000; }',
		':EXPORT { color: #ff0000; }',
	],
	invalid: [
		{
			code: 'a { color: #ffffff; }',
			output: 'a { color: #fff; }',
			errors: 1,
		},
		{
			code: 'a { color: #aabbccdd; }',
			output: 'a { color: #abcd; }',
			errors: 1,
		},
		{
			code: 'a { color: #112233; background: #11223344; }',
			output: 'a { color: #123; background: #1234; }',
			errors: 2,
		},
		{
			code: String.raw`a { color: #\46 FFFFF; background: #\61 abbccdd; }`,
			output: 'a { color: #FFF; background: #abcd; }',
			errors: 2,
		},
		{
			code: 'a {\n\tcolor: var(--color,\n\t\t#ffffff);\n}',
			output: 'a {\n\tcolor: var(--color,\n\t\t#fff);\n}',
			errors: [{
				messageId: 'prefer-short-hex-color', line: 3, column: 3, endLine: 3, endColumn: 10,
			}],
		},
		{
			code: 'a { color: #aABbcC; background: #AaBbCcDd; }',
			output: 'a { color: #aBc; background: #ABCD; }',
			errors: 2,
		},
		{
			code: 'a { --theme: #ffffff; unknown: #aabbccdd; }',
			output: 'a { --theme: #fff; unknown: #abcd; }',
			errors: 2,
		},
		{
			code: String.raw`a { --image: custom(u\72l(#ffffff)) #aabbcc; }`,
			output: String.raw`a { --image: custom(u\72l(#ffffff)) #abc; }`,
			errors: 1,
		},
		{
			code: 'a { --image: element(#ffffff) -moz-element(#aabbccdd) #112233; }',
			output: 'a { --image: element(#ffffff) -moz-element(#aabbccdd) #123; }',
			errors: 1,
		},
		{
			code: '@supports (color: #ffffff) { a { color: custom(#aabbccdd); } }',
			output: '@supports (color: #fff) { a { color: custom(#abcd); } }',
			errors: 2,
		},
		{
			code: 'a { color: #ffffff /* keep */ #aabbccdd; }',
			output: 'a { color: #fff /* keep */ #abcd; }',
			errors: 2,
		},
		{
			code: '.a:export { color: #ff0000; } :export .a { color: #ff0000; }',
			output: '.a:export { color: #f00; } :export .a { color: #f00; }',
			errors: 2,
		},
	],
});

test.snapshot({
	valid: [
		// Wrong length or not hexadecimal.
		'a { color: #ffff; }',
		'a { color: #fffff; }',
		'a { color: #fffffff; }',
		'a { color: #gggggg; }',
		// An escaped value is decoded before the pairs are compared.
		String.raw`a { color: #\61 4a4a4; }`,
		// Hex colors that cannot be shortened are left alone.
		'a { border: 1px solid #123456; }',
	],
	invalid: [
		'a { color: #FFFFFF; }',
		'a { color: #aabbcc; }',
		'a { color: #ffffff00; }',
		'a { color: #AABBCCDD; }',
		'a { border-color: #ffffff #aabbcc; }',
		'a { color: #ffffff !important; }',
		'a { color: #ffffff /* keep */; }',
		'a { --theme: #ffffff; }',
		String.raw`a { color: #\66 fffff; }`,
		'a { background: linear-gradient(#ffffff, #aabbccdd); }',
		'@media (width > 0px) { a { color: #ffffff; } }',
		'@layer theme { a { color: #aabbcc; } }',
		'@container (width > 0px) { a { color: #ffffff; } }',
		'@scope (.card) { a { color: #ffffff; } }',
	],
});
