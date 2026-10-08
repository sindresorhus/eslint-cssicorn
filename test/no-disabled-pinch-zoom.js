import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const panOnlyValues = ['pan-x', 'pan-left', 'pan-right', 'pan-y', 'pan-up', 'pan-down'];
for (const horizontal of ['pan-x', 'pan-left', 'pan-right']) {
	for (const vertical of ['pan-y', 'pan-up', 'pan-down']) {
		panOnlyValues.push(`${horizontal} ${vertical}`, `${vertical} ${horizontal}`);
	}
}

test.snapshot({
	valid: [
		'a { color: red; }',
		'a { touch-action: auto; }',
		'a { touch-action: manipulation; }',
		'a { touch-action: pinch-zoom; }',
		'a { touch-action: pan-y pinch-zoom; }',
		'a { touch-action: pinch-zoom pan-x; }',
		'a { touch-action: pan-x pinch-zoom pan-y; }',
		'a { touch-action: pan-down pan-right pinch-zoom; }',
		'a { TOUCH-ACTION: PAN-Y PINCH-ZOOM; }',
		String.raw`a { t\6f uch-action: pan-y p\69nch-zoom; }`,
		'a { touch-action: inherit; }',
		'a { touch-action: initial; }',
		'a { touch-action: unset; }',
		'a { touch-action: revert; }',
		'a { touch-action: revert-layer; }',
		'a { touch-action: revert-rule; }',
		'a { touch-action: var(--gestures); }',
		'a { touch-action: var(--gestures, none); }',
		'a { touch-action: pan-y var(--zoom); }',
		'a { --touch-action: none; --gestures: pan-y; }',
		'a { -ms-touch-action: none; }',
		':export { touch-action: none; }',
		':import("./gestures.css") { touch-action: pan-y; }',
		'@supports (touch-action: none) { a { color: red; } }',
		'@container style(touch-action: pan-y) { a { color: red; } }',
		// Invalid property values belong to `css/no-invalid-properties`.
		'a { touch-action: unknown; }',
		'a { touch-action: "pan-y"; }',
		'a { touch-action: url("pan-y"); }',
		'a { touch-action: 0; }',
		'a { touch-action: pan-x, pan-y; }',
		'a { touch-action: pan-y pan-y; }',
		'a { touch-action: pan-left pan-right; }',
		'a { touch-action: pan-up pan-down; }',
		'a { touch-action: pan-x pan-left; }',
		'a { touch-action: pan-y pan-up; }',
		'a { touch-action: pan-x pan-y pan-left; }',
		'a { touch-action: none pan-y; }',
		'a { touch-action: none pinch-zoom; }',
	],
	invalid: [
		...panOnlyValues.map(value => `a { touch-action: ${value}; }`),
		'a { touch-action: none; }',
		'a { TOUCH-ACTION: NONE; }',
		'a { Touch-Action: PAN-Y pan-LEFT; }',
		String.raw`a { t\6f uch-action: p\61n-y; }`,
		String.raw`a { touch-action: pan-\79; }`,
		String.raw`a { touch-action: pan-\79 ; }`,
		String.raw`a { touch-action: n\6fne; }`,
		'a { touch-action: /* before */ pan-y /* after */; }',
		'a { touch-action: pan-left /* between */ pan-down; }',
		'a { touch-action: /* before */ none /* after */; }',
		'a { touch-action: pan-y!important; }',
		'a { touch-action: none !IMPORTANT; }',
		'a {\n  touch-action:\n    pan-x\n    pan-y;\n}',
		'a {\r\n  touch-action: pan-y /* comment */ !important;\r\n}',
		'a { & .drag { touch-action: none; } }',
		'@media (hover: none) { a { touch-action: pan-y; } }',
		'@supports (touch-action: pan-y) { a { touch-action: pan-y; } }',
		'@container (width > 20em) { a { touch-action: pan-y; } }',
		'@layer gestures { a { touch-action: pan-y; } }',
		'@scope (.carousel) { a { touch-action: pan-y; } }',
		'a { touch-action: none; touch-action: auto; }',
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'a { touch-action: none; }',
			errors: [{
				messageId: 'no-disabled-pinch-zoom/error',
				suggestions: [{
					messageId: 'no-disabled-pinch-zoom/suggestion',
					output: 'a { touch-action: pinch-zoom; }',
				}],
			}],
		},
		{
			code: String.raw`a { touch-action: pan-\79; }`,
			errors: [{
				messageId: 'no-disabled-pinch-zoom/error',
				suggestions: [{
					messageId: 'no-disabled-pinch-zoom/suggestion',
					output: String.raw`a { touch-action: pinch-zoom pan-\79; }`,
				}],
			}],
		},
		{
			code: 'a {\r\n  touch-action: /* before */ pan-x/**/pan-y /* after */ !important;\r\n}',
			errors: [{
				messageId: 'no-disabled-pinch-zoom/error',
				suggestions: [{
					messageId: 'no-disabled-pinch-zoom/suggestion',
					output: 'a {\r\n  touch-action: /* before */ pinch-zoom pan-x/**/pan-y /* after */ !important;\r\n}',
				}],
			}],
		},
		{
			code: 'a { @supports (touch-action: none) { touch-action: pan-y; } }',
			errors: [{
				messageId: 'no-disabled-pinch-zoom/error',
				suggestions: [{
					messageId: 'no-disabled-pinch-zoom/suggestion',
					output: 'a { @supports (touch-action: none) { touch-action: pinch-zoom pan-y; } }',
				}],
			}],
		},
	],
});
