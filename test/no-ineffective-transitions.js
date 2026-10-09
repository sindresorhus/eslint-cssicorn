import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'a { transition: display 1s; -webkit-transition: opacity 1s; }',
		'a { -webkit-transition: display 1s; transition: opacity 1s; }',
		'a { transition: display 1s; -webkit-transition-property: opacity; }',
		'a { -webkit-transition: display 1s; transition-property: opacity; }',
		'a { -webkit-transition-property: display; }',
		'a { -webkit-transition: display 1s; transition-behavior: allow-discrete; }',
		'a { transition-behavior: allow-discrete !important; -webkit-transition: display 1s; }',
		'a { -webkit-transition: opacity 1s !important; transition: display 1s; }',
		'a { transition: display 1s; -webkit-transition: var(--transition); }',
		'a { transition: display 1s; -webkit-transition-property: var(--target); }',
		'a { -moz-transition: display 1s; }',
		'@keyframes fade { from { -webkit-transition: display 1s; } }',
		':export { -webkit-transition: display 1s; }',
	],
	invalid: [
		...[
			['a { -webkit-transition: display 1s; }', 'a { -webkit-transition: allow-discrete display 1s; }'],
			['a { -WEBKIT-TRANSITION: /* keep */ display 1s normal !important; }', 'a { -WEBKIT-TRANSITION: /* keep */ display 1s allow-discrete !important; }'],
			['a { -webkit-transition: display 1s allow-discrete; transition: display 1s; }', 'a { -webkit-transition: display 1s allow-discrete; transition: allow-discrete display 1s; }'],
			['a { -webkit-transition: display 1s !important; transition: opacity 1s; }', 'a { -webkit-transition: allow-discrete display 1s !important; transition: opacity 1s; }'],
			[
				'a { transition: opacity 1s !important; -webkit-transition: display 1s !important; }',
				'a { transition: opacity 1s !important; -webkit-transition: allow-discrete display 1s !important; }',
			],
			['a { -webkit-transition-property: display; transition-behavior: normal; }', 'a { -webkit-transition-property: display; transition-behavior: allow-discrete; }'],
			['a { transition: opacity 1s normal; -webkit-transition-property: display; }', 'a { transition: opacity 1s allow-discrete; -webkit-transition-property: display; }'],
		].map(([code, output]) => ({
			code,
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'display'},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output}],
			}],
		})),
		...['initial', 'unset'].map(value => ({
			code: `a { -webkit-transition: ${value}; -webkit-transition-property: display; }`,
			errors: [{messageId: 'no-ineffective-transitions/discrete', data: {property: 'display'}, suggestions: 0}],
		})),
		{
			code: 'a { -webkit-transition-property: will-change; }',
			errors: [{messageId: 'no-ineffective-transitions/non-animatable', data: {property: 'will-change'}, suggestions: 0}],
		},
	],
});

test({
	valid: [
		'a { transition: -webkit-backface-visibility 1s allow-discrete; }',
		'a { transition: backface-visibility 1s, -webkit-backface-visibility 1s allow-discrete; }',
		'a { transition: -webkit-backface-visibility 1s, backface-visibility 1s allow-discrete; }',
		'a { transition: flex-direction 1s, -webkit-flex-flow 1s allow-discrete; }',
		'a { transition: -webkit-flex-direction 1s, flex-flow 1s allow-discrete; }',
		'a { transition: -webkit-flex-flow 1s, flex-direction 1s allow-discrete, -webkit-flex-wrap 1s allow-discrete; }',
		'a { transition: -webkit-flex-direction 1s, -webkit-flex-wrap 1s, flex-flow 1s allow-discrete; }',
		'a { transition: animation-name 1s, -webkit-animation 1s; }',
		'a { transition: -webkit-mask-box-image-repeat 1s, mask-border 1s allow-discrete; }',
		'a { transition: -webkit-display 1s, -moz-backface-visibility 1s, -webkit-box-align 1s; }',
		'a { transition-property: -webkit-box-sizing; }',
		{
			code: 'a { transition: -webkit-backface-visibility 1s; }',
			languageOptions: {customSyntax: {properties: {'backface-visibility': null}}},
		},
	],
	invalid: [
		...[
			'-webkit-align-content',
			'-webkit-align-items',
			'-webkit-align-self',
			'-webkit-backface-visibility',
			'-webkit-box-sizing',
			'-webkit-flex-direction',
			'-webkit-flex-flow',
			'-webkit-flex-wrap',
			'-webkit-justify-content',
			'-webkit-transform-style',
			'-webkit-mask-box-image-repeat',
		].map(property => ({
			code: `a { transition: ${property} 1s; }`,
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output: `a { transition: allow-discrete ${property} 1s; }`}],
			}],
		})),
		...['-webkit-animation-name', '-webkit-transition-duration'].map(property => ({
			code: `a { transition-property: ${property}; }`,
			errors: [{messageId: 'no-ineffective-transitions/non-animatable', data: {property}, suggestions: 0}],
		})),
		{
			code: 'a { transition: backface-visibility 1s allow-discrete, -webkit-backface-visibility 1s; }',
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: '-webkit-backface-visibility'},
				suggestions: [{
					messageId: 'no-ineffective-transitions/allow-discrete',
					output: 'a { transition: backface-visibility 1s allow-discrete, allow-discrete -webkit-backface-visibility 1s; }',
				}],
			}],
		},
		{
			code: 'a { transition: -webkit-flex-flow 1s, flex-direction 1s allow-discrete; }',
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: '-webkit-flex-flow'},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output: 'a { transition: allow-discrete -webkit-flex-flow 1s, flex-direction 1s allow-discrete; }'}],
			}],
		},
		{
			code: 'a { TRANSITION-PROPERTY: -WEBKIT-BOX-SIZING; transition-behavior: /* keep */ normal !important; }',
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: '-WEBKIT-BOX-SIZING'},
				suggestions: [{
					messageId: 'no-ineffective-transitions/allow-discrete',
					output: 'a { TRANSITION-PROPERTY: -WEBKIT-BOX-SIZING; transition-behavior: /* keep */ allow-discrete !important; }',
				}],
			}],
		},
	],
});

test({
	valid: [
		'a { transition-property: background-repeat; }',
		'a { transition: background-repeat 1s allow-discrete; }',
		...[
			'a { transition: background-repeat-x 1s, background-repeat 1s allow-discrete; }',
			'a { transition: background-repeat-y 1s, background 1s allow-discrete; }',
			'a { transition: background-repeat 1s, background-repeat-x 1s allow-discrete, background-repeat-y 1s allow-discrete; }',
		].map(code => ({
			code,
			languageOptions: {customSyntax: {properties: {'background-repeat-x': '<custom-ident>#', 'background-repeat-y': '<custom-ident>#'}}},
		})),
		'a { transition: direction 1s; transition-property: opacity; }',
		'a { transition: unicode-bidi 1s, all 1s; }',
	],
	invalid: [
		...['direction', 'unicode-bidi'].flatMap(property => [
			{
				code: `a { transition-property: ${property}; }`,
				errors: [{messageId: 'no-ineffective-transitions/non-animatable', data: {property}, suggestions: 0}],
			},
			{
				code: `a { transition: ${property} 1s allow-discrete; }`,
				errors: [{messageId: 'no-ineffective-transitions/non-animatable', data: {property}, suggestions: 0}],
			},
		]),
		{
			code: String.raw`a { TRANSITION: DIRECTION 1s, unicode\2d bidi 1s; }`,
			errors: ['DIRECTION', String.raw`unicode\2d bidi`].map(property => ({messageId: 'no-ineffective-transitions/non-animatable', data: {property}, suggestions: 0})),
		},
		...[
			['a { transition: background-repeat 1s; }', 'a { transition: allow-discrete background-repeat 1s; }'],
			['a { transition: background-repeat 1s, background-repeat-x 1s allow-discrete; }', 'a { transition: allow-discrete background-repeat 1s, background-repeat-x 1s allow-discrete; }'],
		].map(([code, output]) => ({
			code,
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'background-repeat'},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output}],
			}],
		})),
		{
			code: 'a { transition: background-repeat 1s allow-discrete, background-repeat-y 1s; }',
			languageOptions: {customSyntax: {properties: {'background-repeat-y': '<custom-ident>#'}}},
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'background-repeat-y'},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output: 'a { transition: background-repeat 1s allow-discrete, allow-discrete background-repeat-y 1s; }'}],
			}],
		},
		{
			code: String.raw`a { transition-property: BACKGROUND\2d REPEAT; transition-behavior: /* keep */ normal; }`,
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: String.raw`BACKGROUND\2d REPEAT`},
				suggestions: [{
					messageId: 'no-ineffective-transitions/allow-discrete',
					output: String.raw`a { transition-property: BACKGROUND\2d REPEAT; transition-behavior: /* keep */ allow-discrete; }`,
				}],
			}],
		},
	],
});

test({
	valid: [
		'a { all: initial; transition-property: display; transition-behavior: allow-discrete; }',
		'a { transition: unset; transition-behavior: allow-discrete; transition-property: display; }',
		'a { transition-property: display; all: unset; }',
		'a { transition-behavior: allow-discrete !important; all: initial; transition-property: display; }',
		'a { all: initial !important; transition-property: display; }',
		'a { transition: initial; transition-property: display; transition-behavior: inherit; }',
		...['inherit', 'revert', 'revert-layer'].flatMap(value => [
			`a { all: ${value}; transition-property: display; }`,
			`a { transition: ${value}; transition-property: display; }`,
		]),
		'a { all: var(--reset); transition-property: display; }',
	],
	invalid: [
		...['all', 'transition'].flatMap(property => ['initial', 'unset'].map(value => ({
			code: `a { ${property}: ${value}; transition-property: display; transition-duration: 200ms; }`,
			errors: [{messageId: 'no-ineffective-transitions/discrete', data: {property: 'display'}, suggestions: 0}],
		}))),
		{
			code: 'a { transition-property: display !important; transition-behavior: allow-discrete; all: unset; }',
			errors: [{messageId: 'no-ineffective-transitions/discrete', data: {property: 'display'}, suggestions: 0}],
		},
		{
			code: 'a { all: initial !important; transition-property: display !important; transition-behavior: allow-discrete; }',
			errors: [{messageId: 'no-ineffective-transitions/discrete', data: {property: 'display'}, suggestions: 0}],
		},
		{
			code: 'a { ALL: /* before */ UNSET /* after */; transition-property: display, opacity, overlay; }',
			errors: ['display', 'overlay'].map(property => ({messageId: 'no-ineffective-transitions/discrete', data: {property}, suggestions: 0})),
		},
	],
});

test.snapshot({
	valid: [
		'a { transition: opacity 200ms, transform 1s; }',
		'a { transition: visibility 1s normal; }',
		'a { transition-property: display; }',
		'a { transition-property: display; } a { transition-behavior: normal; }',
		'a { transition: display 1s allow-discrete, content-visibility 1s allow-discrete, overlay 1s allow-discrete; }',
		String.raw`a { transition: d\69 splay 1s \61 llow-discrete; }`,
		'a { transition: display 1s; transition-behavior: allow-discrete; }',
		'a { transition-property: display, position; transition-behavior: allow-discrete; }',
		'a { transition: all 1s; }',
		'a { transition: 1s; }',
		'a { transition: none; }',
		'a { transition-property: none; transition-behavior: normal; }',
		'a { transition: display 1s; transition-property: opacity; }',
		'a { transition: display 1s; transition: opacity 1s; }',
		'a { transition: display 1s normal, all 1s allow-discrete; }',
		'a { transition: display 1s normal, display 1s allow-discrete; }',
		'a { transition: overflow-x 1s normal, overflow 1s allow-discrete; }',
		'a { transition: flex-direction 1s normal, flex-flow 1s allow-discrete; }',
		'a { transition: font-family 1s normal, font 1s allow-discrete; }',
		'a { transition: white-space-collapse 1s normal, white-space 1s allow-discrete; }',
		'a { transition: text-wrap-mode 1s normal, text-wrap 1s allow-discrete; }',
		'a { transition: text-box-trim 1s normal, text-box 1s allow-discrete; }',
		'a { transition: caret-animation 1s normal, caret 1s allow-discrete; }',
		'a { transition: text-decoration-skip-ink 1s normal, text-decoration-skip 1s allow-discrete; }',
		'a { transition: text-align-last 1s normal, text-align 1s allow-discrete; }',
		'a { transition: position-try-order 1s normal, position-try 1s allow-discrete; }',
		'a { transition: animation-trigger 1s, animation 1s; }',
		'a { transition: animation-composition 1s, animation 1s; }',
		'a { transition-property: text-wrap-mode, text-wrap; transition-behavior: normal, allow-discrete; }',
		String.raw`a { transition: white-space-collapse 1s normal, white\2d space 1s allow-discrete; }`,
		'a { transition-behavior: allow-discrete !important; transition: display 1s; }',
		'a { transition: display 1s !important; transition-behavior: allow-discrete !important; }',
		'a { transition: opacity 1s !important; transition-property: display; }',
		'a { transition: display 1s; all: initial; }',
		'a { transition: display 1s; all: revert-layer !important; transition-behavior: normal; }',
		'a { transition: display 1s; transition-behavior: var(--behavior); }',
		'a { transition: display 1s; transition-property: var(--property); }',
		'a { transition: display 1s; transition: var(--transition); }',
		'a { transition: display var(--duration); }',
		'a { transition: none, display 1s; }',
		'a { transition-property: none, display; transition-behavior: normal; }',
		'a { transition: display 1s; transition-behavior: "normal"; }',
		'a { transition: display 1s; transition-behavior: env(behavior); }',
		...['inherit', 'revert', 'revert-layer', 'revert-rule'].map(value => `a { transition: display 1s; transition-behavior: ${value}; }`),
		...['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'revert-rule'].flatMap(value => [
			`a { transition: display 1s; transition-property: ${value}; }`,
			`a { transition: display 1s; transition: ${value}; }`,
		]),
		'a { transition-property: --progress, -webkit-display, future-property; transition-behavior: normal; }',
		'a { transition: --progress 1s, -webkit-display 1s, future-property 1s; }',
		'a { --transition: display 1s; color: "display"; }',
		'a { transition: margin 1s, background 1s, font 1s; }',
		...[
			'background-image',
			'border-image-source',
			'list-style-image',
			'mask-image',
			'mask-border-source',
			'font-style',
			'stroke-miterlimit',
			'text-overflow',
		].map(property => `a { transition: ${property} 1s; }`),
		'@font-face { transition: display 1s; }',
		'@property --example { transition: display 1s; }',
		'@keyframes fade { from { transition: display 1s; } }',
		'@-webkit-keyframes fade { 50% { transition: display 1s; } }',
		':export { transition: display 1s; } :import("a.css") { transition: display 1s; }',
		'@supports (transition: display 1s) {}',
		'a { transition-behavior: normal; & b { transition-property: display; } }',
		{
			code: 'a { transition: display 1s; }',
			languageOptions: {customSyntax: {properties: {display: null}}},
		},
		{
			code: 'a { transition: display 1s; transition-behavior: ???; }',
			languageOptions: {tolerant: true},
		},
		{
			code: '@custom-descriptors { transition: display 1s; }',
			languageOptions: {customSyntax: {atrules: {'custom-descriptors': {descriptors: {transition: '<custom-ident>'}}}}},
		},
		'a { transition-behavior: allow-discrete !IMPORTANT; transition: display 1s; }',
		'a { transition: display 1s, opacity 1s allow-discrete, overlay 2s; transition-behavior: allow-discrete; }',
		'a { transition-property: display, display; transition-behavior: allow-discrete; }',
	],
	invalid: [
		'a { transition: display 200ms; transition-behavior: normal; }',
		'a { transition: display 200ms; }',
		'a { transition: 200ms ease display; }',
		'a { transition-property: display; transition-behavior: normal; }',
		'a { transition-behavior: normal; transition-property: display; }',
		'a { transition-behavior: allow-discrete; transition: display 1s; }',
		'a { transition: display 1s allow-discrete; transition-behavior: normal; }',
		'a { transition: opacity 1s; transition-property: display; }',
		'a { transition-property: display, opacity, content-visibility, overlay; transition-behavior: normal; }',
		'a { transition-property: display, opacity, position; transition-behavior: normal, allow-discrete; }',
		'a { transition-property: opacity, --progress, display; transition-behavior: normal, allow-discrete; }',
		'a { transition-property: display; transition-behavior: normal, allow-discrete; }',
		'a { transition: all 1s allow-discrete, display 1s normal; }',
		'a { transition: display 1s allow-discrete, display 1s normal; }',
		'a { transition: overflow 1s allow-discrete, overflow-x 1s normal; }',
		'a { transition: white-space 1s allow-discrete, white-space-collapse 1s normal; }',
		'a { transition: white-space-collapse 1s normal, white-space 1s allow-discrete, display 1s normal; }',
		'a { transition: display 1s !important; transition-behavior: allow-discrete; }',
		'a { transition-behavior: normal !important; transition: display 1s allow-discrete; }',
		'a { transition: display 1s !important; all: initial; }',
		String.raw`a { transition: display 1s !\69mportant; transition-behavior: allow-discrete; }`,
		'a { transition-property: display !important; transition-behavior: normal !important; all: var(--reset); }',
		'a { transition: opacity 1s; transition-property: display !important; transition: transform 1s allow-discrete; transition-behavior: normal; }',
		'a { all: initial; transition: display 1s; }',
		'a { transition: display 1s !important; transition: var(--transition); }',
		'a { transition: var(--transition); transition: display 1s; }',
		'a { transition: display 1s; transition-behavior: var(--behavior); transition-behavior: normal; }',
		...['contain', 'will-change', 'transition-duration', 'animation-name', 'scroll-behavior', 'touch-action'].flatMap(property => [
			`a { transition: ${property} 1s; }`,
			`a { transition: ${property} 1s allow-discrete; }`,
			`a { transition-property: ${property}; }`,
		]),
		...['position', 'cursor', 'pointer-events', 'font-family', 'flex-direction', 'overflow-x'].map(property => `a { transition: ${property} 1s; }`),
		'a { TRANSITION: DISPLAY 200MS EASE NORMAL; }',
		String.raw`a { tr\61 nsition: d\69 splay 200m\73  \65 ase n\6f rmal; }`,
		String.raw`a { transition\2d property: d\69 splay; transition-behavior: n\6f rmal; }`,
		'a { transition: /* before */ display /* target */ 1s /* end */ !important; }',
		'a {\r\n  transition-property: display;\r\n  transition-behavior: /* before */ normal /* after */;\r\n}',
		'a { transition: display 0s 1s; }',
		'a { & b { transition: display 1s; } }',
		...['media (width > 1px)', 'supports (display: grid)', 'container (width > 1px)', 'layer components', 'scope (.card)'].map(atRule => `@${atRule} { a { transition: display 1s; } }`),
		'a { @media print { transition: display 1s; } }',
		'a { @starting-style { transition: display 1s; } }',
		'a { transition: display 1s, display 2s; }',
		'a { transition-property: display, display; transition-behavior: normal; }',
		'a { transition-property: none; transition-property: display; transition-behavior: normal; }',
		'a { transition: all 1s; transition-property: display; transition-behavior: normal; }',
		'a { transition-property: display, will-change; transition-behavior: normal, normal; }',
		'a { transition: display 1s normal, content-visibility 1s normal; }',
		'a { transition: display 1s normal, opacity 2s allow-discrete, content-visibility 1s; }',
		'a { transition-behavior: allow-discrete, normal; transition-property: display, position; }',
	],
});

test({
	valid: [
		'a { transition: overflow-wrap 1s, word-wrap 1s allow-discrete; }',
		'a { transition: word-wrap 1s, overflow-wrap 1s allow-discrete; }',
		String.raw`a { transition: OVERFLOW-WRAP 1s, w\6f rd-wrap 1s allow-discrete; }`,
		'a { transition: overflow 1s, overflow-x 1s allow-discrete, overflow-y 1s allow-discrete; }',
		'a { transition: grid-area 1s, grid-row 1s allow-discrete, grid-column 1s allow-discrete; }',
		'a { transition: white-space 1s, white-space-collapse 1s allow-discrete, text-wrap-mode 1s allow-discrete, white-space-trim 1s allow-discrete; }',
		'a { transition: overflow 1s allow-discrete; }',
		'a { transition-property: flex-flow; }',
		'a { transition: display 1s; transition-behavior: initial; transition-behavior: allow-discrete; }',
		'a { transition: display 1s; transition-behavior: allow-discrete !important; transition-behavior: unset; }',
		'a { transition: display 1s; transition-behavior: initial; all: unset; }',
		'a { transition: display 1s; transition-behavior: initial, allow-discrete; }',
		{
			code: 'a { transition: word-wrap 1s; }',
			languageOptions: {customSyntax: {properties: {'word-wrap': null}}},
		},
	],
	invalid: [
		...['word-wrap', 'overflow', 'flex-flow', 'text-box'].map(property => ({
			code: `a { transition: ${property} 1s; }`,
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output: `a { transition: allow-discrete ${property} 1s; }`}],
			}],
		})),
		{
			code: 'a { transition: overflow 1s, overflow-x 1s allow-discrete; }',
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'overflow'},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output: 'a { transition: allow-discrete overflow 1s, overflow-x 1s allow-discrete; }'}],
			}],
		},
		{
			code: 'a { transition: overflow-wrap 1s allow-discrete, word-wrap 1s; }',
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'word-wrap'},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output: 'a { transition: overflow-wrap 1s allow-discrete, allow-discrete word-wrap 1s; }'}],
			}],
		},
		...['transition', 'animation-range'].map(property => ({
			code: `a { transition: ${property} 1s allow-discrete; }`,
			errors: [{messageId: 'no-ineffective-transitions/non-animatable', data: {property}}],
		})),
		...['initial', 'unset'].map(value => ({
			code: `a { transition-property: display; transition-behavior: /* before */ ${value} /* after */; }`,
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'display'},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output: 'a { transition-property: display; transition-behavior: /* before */ allow-discrete /* after */; }'}],
			}],
		})),
		{
			code: String.raw`a { transition: DISPLAY 1s allow-discrete !important; TRANSITION-BEHAVIOR: \75 nset !important; }`,
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'DISPLAY'},
				suggestions: [{
					messageId: 'no-ineffective-transitions/allow-discrete',
					output: 'a { transition: DISPLAY 1s allow-discrete !important; TRANSITION-BEHAVIOR: allow-discrete !important; }',
				}],
			}],
		},
		{
			code: 'a { transition-property: text-wrap, white-space, border-style, grid-area; transition-behavior: normal, allow-discrete; }',
			errors: ['text-wrap', 'border-style'].map(property => ({
				messageId: 'no-ineffective-transitions/discrete',
				data: {property},
				suggestions: [{
					messageId: 'no-ineffective-transitions/allow-discrete',
					output: 'a { transition-property: text-wrap, white-space, border-style, grid-area; transition-behavior: allow-discrete, allow-discrete; }',
				}],
			})),
		},
	],
});

test({
	valid: [
		'a { transition: opacity 1s allow-discrete, transform 2s normal; transition-property: display, opacity, content-visibility; }',
		'a { transition: opacity 1s steps(2, jump-start), allow-discrete display min(1s, 2s); }',
	],
	invalid: [
		{
			code: 'a { transition: opacity 1s steps(2, jump-start), display min(1s, 2s); }',
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'display'},
				suggestions: [{
					messageId: 'no-ineffective-transitions/allow-discrete',
					output: 'a { transition: opacity 1s steps(2, jump-start), allow-discrete display min(1s, 2s); }',
				}],
			}],
		},
		{
			code: 'a { transition: opacity 1s normal, transform 2s allow-discrete; transition-property: display, opacity, content-visibility; }',
			errors: ['display', 'content-visibility'].map(property => ({
				messageId: 'no-ineffective-transitions/discrete',
				data: {property},
				suggestions: [{
					messageId: 'no-ineffective-transitions/allow-discrete',
					output: 'a { transition: opacity 1s allow-discrete, transform 2s allow-discrete; transition-property: display, opacity, content-visibility; }',
				}],
			})),
		},
		{
			code: String.raw`a { transition: displa\79; }`,
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: String.raw`displa\79`},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output: String.raw`a { transition: allow-discrete displa\79; }`}],
			}],
		},
		{
			code: String.raw`a { transition: display 1\73; }`,
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'display'},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output: String.raw`a { transition: allow-discrete display 1\73; }`}],
			}],
		},
		{
			code: 'a { transition: display 1s, opacity 2s; }',
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'display'},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output: 'a { transition: allow-discrete display 1s, opacity 2s; }'}],
			}],
		},
		{
			code: 'a { transition: display 1s normal; transition-property: position; }',
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'position'},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output: 'a { transition: display 1s allow-discrete; transition-property: position; }'}],
			}],
		},
		{
			code: 'a { transition: opacity 1s; transition-property: display; }',
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'display'},
				suggestions: [{messageId: 'no-ineffective-transitions/allow-discrete', output: 'a { transition: allow-discrete opacity 1s; transition-property: display; }'}],
			}],
		},
		{
			code: 'a { transition-property: opacity, --progress, display; transition-behavior: normal, allow-discrete; }',
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'display'},
				suggestions: [{
					messageId: 'no-ineffective-transitions/allow-discrete',
					output: 'a { transition-property: opacity, --progress, display; transition-behavior: allow-discrete, allow-discrete; }',
				}],
			}],
		},
		{
			code: 'a {\r\n  transition: opacity 1s, /* before */ display /* target */ 2s /* after */ !important;\r\n}',
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: 'display'},
				suggestions: [{
					messageId: 'no-ineffective-transitions/allow-discrete',
					output: 'a {\r\n  transition: opacity 1s, /* before */ allow-discrete display /* target */ 2s /* after */ !important;\r\n}',
				}],
			}],
		},
		{
			code: String.raw`a { transition-property: d\69 splay; transition-behavior: /* before */ n\6f rmal /* after */; }`,
			errors: [{
				messageId: 'no-ineffective-transitions/discrete',
				data: {property: String.raw`d\69 splay`},
				suggestions: [{
					messageId: 'no-ineffective-transitions/allow-discrete',
					output: String.raw`a { transition-property: d\69 splay; transition-behavior: /* before */ allow-discrete /* after */; }`,
				}],
			}],
		},
	],
});
