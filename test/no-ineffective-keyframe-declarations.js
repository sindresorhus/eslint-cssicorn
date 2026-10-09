import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);
const animationControls = [
	['animation-name', 'fade'],
	['animation-duration', '2s'],
	['animation-delay', '1s'],
	['animation-delay-start', '1s'],
	['animation-delay-end', '1s'],
	['animation-iteration-count', 'infinite'],
	['animation-direction', 'alternate'],
	['animation-fill-mode', 'both'],
	['animation-play-state', 'paused'],
	['animation-timeline', 'scroll()'],
	['animation-range', 'entry exit'],
	['animation-range-start', 'entry 10%'],
	['animation-range-end', 'exit 90%'],
	['animation-trigger', 'none'],
];

test.snapshot({
	valid: [
		...animationControls.map(([property, value]) => `.element { ${property}: ${value}; }`),
		'@keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
		'@keyframes fade { from { animation-timing-function: ease-in; } 50% { animation-timing-function: ease-out; } }',
		'@keyframes fade { 0%, 100% { animation-timing-function: linear; } }',
		'@keyframes fade { 50%, to { animation-timing-function: linear; } }',
		'@keyframes fade { 99% { animation-timing-function: linear; } }',
		'@keyframes fade { from { opacity: 0; } to { opacity: 1; animation-timing-function: ease-in; } to { opacity: 0.5; } }',
		'@keyframes fade { 100% { opacity: 1; } to { opacity: 0.5; animation-timing-function: ease-in; } }',
		'@keyframes fade { 50%, 100% { opacity: 1; } to { opacity: 0.5; animation-timing-function: ease-in; } }',
		String.raw`@keyframes fade { \74 o { opacity: 1; } 1e2% { opacity: 0.5; animation-timing-function: ease-in; } }`,
		'@keyframes fade { to { animation-composition: add; } }',
		'@keyframes fade { to { --animation-duration: 2s; --easing: "!important"; content: "!important"; } }',
		'@keyframes fade { to { --tokens: { opacity: 1 !important; }; opacity: 1; } }',
		'@keyframes fade { to { --tokens: fn(!important); } }',
		'@keyframes fade { to { opacity: 1 !urgent; } }',
		'@keyframes fade { to { animation: fade 2s ease; } }',
		'@keyframes fade { to { animation-imaginary: 2s; } }',
		'@keyframes fade { to { -webkit-animation-duration: 2s; -webkit-animation-timing-function: ease; } }',
		'@keyframes fade { entry 100% { animation-timing-function: ease; } }',
		'@keyframes fade { to { animation-timing-function: ease; } exit 100% { opacity: 1; } }',
		'@keyframes fade { exit 100% { opacity: 1; } to { animation-timing-function: ease; } }',
		'@keyframes fade { to, exit 100% { animation-timing-function: ease; } }',
		'@keyframes fade { something {} to { animation-timing-function: ease; } }',
		'@keyframes fade { 120% {} to { animation-timing-function: ease; } }',
		'@keyframes fade { -10% {} to { animation-timing-function: ease; } }',
		'.element { opacity: 1 !important; animation-duration: 1s; }',
		'@font-face { font-family: example !important; }',
		'@unknown fade { to { animation-duration: 1s; opacity: 1 !important; } }',
		'@keyframes fade {}',
		'@keyframes fade;',
		// Vendor-prefixed controls are a different property name and are not checked
		'@keyframes fade { to { -moz-animation-duration: 2s; -o-animation-play-state: paused; } }',
		// A mixed keyframe that includes the terminal offset is not a final keyframe
		'@keyframes fade { 0%, 50%, 100% { animation-timing-function: linear; } }',
		// A fractional offset near but not at the end is not terminal
		'@keyframes fade { 99.5% { animation-timing-function: linear; } }',
		// Duplicate terminal blocks disable the terminal easing check
		'@keyframes fade { 100%, to { animation-timing-function: ease; } to { opacity: 1; } }',
	],
	invalid: [
		...animationControls.map(([property, value]) => `@keyframes fade { from { ${property}: ${value}; } }`),
		'@keyframes fade { from { animation-duration: var(--duration); } }',
		'@keyframes fade { to { animation-timing-function: ease-in; } }',
		'@keyframes fade { 100% { animation-timing-function: ease-in; } }',
		'@keyframes fade { +100.0%, 1e2%, to { animation-timing-function: ease-in; } }',
		'@keyframes fade { 100%, to { animation-timing-function: var(--easing); } }',
		'@keyframes fade { to { animation-timing-function: ease; } from { opacity: 0; } }',
		'@keyframes fade { from { animation-timing-function: ease; } to { animation-timing-function: ease-out; animation-composition: add; opacity: 1; } }',
		'@keyframes fade { from { opacity: 0 !important; } }',
		'@keyframes fade { to { --progress: 1 !important; } }',
		'@keyframes fade { to { animation-composition: add !important; } }',
		'@keyframes fade { to { animation: fade 2s !important; } }',
		'@keyframes fade { to { opacity: 1 ! IMPORTANT; } }',
		'@keyframes fade { to { opacity: 1 !/**/important; } }',
		String.raw`@keyframes fade { to { opacity: 1 !impor\74 ant; } }`,
		String.raw`@keyframes fade { to { opacity: 1 !\49 MPORTANT; } }`,
		'@KEYFRAMES fade { TO { ANIMATION-DURATION: 2s; ANIMATION-TIMING-FUNCTION: ease; } }',
		String.raw`@\6b eyframes fade { \74 o { animation-\64 uration: 2s; animation-timing-\66 unction: ease; } }`,
		'@-webkit-keyframes fade { to { animation-duration: 2s; animation-timing-function: ease; } }',
		'@-moz-keyframes fade { from { animation-delay: 2s; } }',
		'@-o-keyframes fade { from { opacity: 0 !important; } }',
		'@keyframes "fade" { to { animation-timing-function: ease; } }',
		'@media (prefers-reduced-motion: no-preference) { @supports (animation-composition: add) { @keyframes fade { to { animation-duration: 2s; } } } }',
		'@keyframes fade { entry 100% { animation-duration: 2s; animation-timing-function: ease; opacity: 1 !important; } to { animation-timing-function: ease; } }',
		'@keyframes fade { to { animation-duration: 2s !important; } }',
		'@keyframes fade { to { animation-timing-function: ease !important; } }',
		'@keyframes fade { to { opacity: 1 !important; animation-duration: 2s; animation-timing-function: ease; } }',
		'@keyframes fade { to { animation-duration: /* retain */ 2s; } }',
		'@keyframes fade { to { animation-duration: 2s /* retain */ ; opacity: 1; } }',
		'@keyframes fade { to { animation-duration: 2s; /* retain */ opacity: 1; } }',
		'@keyframes fade { to { /* retain */ animation-duration: 2s; opacity: 1; } }',
		'@keyframes fade { from { animation-duration: 2s; } } @keyframes move { entry 100% {} to { animation-timing-function: ease; } }',
		outdent`
			@keyframes fade {
				from {
					animation-duration: 2s; opacity: 0;
				}

				to {
					animation-timing-function: ease-in; opacity: 1;
				}
			}
		`,
		// A keyframes rule nested in a layer or scope is still checked
		'@layer a { @keyframes fade { from { animation-duration: 2s; } } }',
		'@scope (.a) { @keyframes fade { to { animation-name: fade; } } }',
		// A selector list that includes an ordinary offset is a control declaration
		'@keyframes fade { from, 50% { animation-duration: 2s; } }',
		// `!important` is reported even on an otherwise allowed property
		'@keyframes fade { from { animation-composition: add !important; } }',
		// Terminal easing remains reported when another block is empty
		'@keyframes fade { to { animation-timing-function: ease-in; } 0% {} }',
		// A control on the first block and easing on the single terminal block
		'@keyframes fade { 0% { animation-duration: 2s; } 100% { animation-timing-function: ease; } }',
	],
});

test({
	valid: [],
	invalid: [
		{
			code: '@keyframes fade { to { animation-timing-function: ease; animation-duration: 2s; opacity: 1 !important; } 100% { opacity: 0.5; } }',
			output: '@keyframes fade { to { animation-timing-function: ease;   } 100% { opacity: 0.5; } }',
			errors: [
				{messageId: 'no-ineffective-keyframe-declarations/animation-control'},
				{messageId: 'no-ineffective-keyframe-declarations/important'},
			],
		},
		{
			code: '@keyframes fade { 100%, to { animation-timing-function: ease; } }',
			output: '@keyframes fade { 100%, to {  } }',
			errors: [{messageId: 'no-ineffective-keyframe-declarations/terminal-easing'}],
		},
		{
			code: '@keyframes fade { to { opacity: 1; animation-timing-function: ease-in; } 100% { opacity: 0.5; animation-timing-function: ease-out !important; } }',
			output: '@keyframes fade { to { opacity: 1; animation-timing-function: ease-in; } 100% { opacity: 0.5;  } }',
			errors: [{messageId: 'no-ineffective-keyframe-declarations/important'}],
		},
		{
			code: '@keyframes fade { to { --progress: 1 !IMPORTANT /* retain */; } }',
			errors: [{messageId: 'no-ineffective-keyframe-declarations/important'}],
		},
		{
			code: String.raw`@keyframes fade { to { --progress: 1 !impor\74 ant; } }`,
			output: '@keyframes fade { to {  } }',
			errors: [{messageId: 'no-ineffective-keyframe-declarations/important'}],
		},
		{
			code: '@keyframes fade{to{animation-duration:2s;opacity:1}}',
			output: '@keyframes fade{to{opacity:1}}',
			errors: [{messageId: 'no-ineffective-keyframe-declarations/animation-control'}],
		},
		{
			code: '@keyframes fade { to { animation-timing-function: ease } }',
			output: '@keyframes fade { to { } }',
			errors: [{messageId: 'no-ineffective-keyframe-declarations/terminal-easing'}],
		},
		{
			code: '@keyframes fade{to{animation-duration:2s\n}}',
			output: '@keyframes fade{to{}}',
			errors: [{messageId: 'no-ineffective-keyframe-declarations/animation-control'}],
		},
		{
			code: '@keyframes fade { to { animation-timing-function: ease; } } @keyframes scroll { entry 100% {} to { animation-timing-function: ease; } }',
			output: '@keyframes fade { to {  } } @keyframes scroll { entry 100% {} to { animation-timing-function: ease; } }',
			errors: [{messageId: 'no-ineffective-keyframe-declarations/terminal-easing'}],
		},
		{
			code: '@keyframes scroll { entry 100% {} to { animation-timing-function: ease; } } @keyframes fade { to { animation-timing-function: ease; } }',
			output: '@keyframes scroll { entry 100% {} to { animation-timing-function: ease; } } @keyframes fade { to {  } }',
			errors: [{messageId: 'no-ineffective-keyframe-declarations/terminal-easing'}],
		},
		{
			code: '@keyframes fade { to { animation-duration: 2s !important; } }',
			output: '@keyframes fade { to {  } }',
			errors: [{messageId: 'no-ineffective-keyframe-declarations/important'}],
		},
		{
			code: '@keyframes fade { to { opacity: 1 !important; animation-duration: 2s; animation-timing-function: ease; } }',
			output: '@keyframes fade { to {    } }',
			errors: 3,
		},
		{
			code: '@keyframes fade {\r\n  to {\r\n    animation-duration: 2s;\r\n    opacity: 1;\r\n  }\r\n}',
			output: '@keyframes fade {\r\n  to {\r\n    \r\n    opacity: 1;\r\n  }\r\n}',
			errors: 1,
		},
		{
			code: '@keyframes fade { to { animation-duration: 2s;/* retain */opacity: 1; } }',
			output: '@keyframes fade { to { /* retain */opacity: 1; } }',
			errors: 1,
		},
		{
			code: '@keyframes fade { to { animation-duration: 2s /* retain */ ; opacity: 1; } }',
			errors: 1,
		},
		{
			code: '@keyframes fade { to { animation-duration/**/: 2s; } }',
			errors: [{messageId: 'no-ineffective-keyframe-declarations/animation-control'}],
		},
		{
			code: '@keyframes fade { entry 100% { animation-range: entry 10% exit 90%; animation-timing-function: ease; } to { animation-timing-function: ease; } }',
			output: '@keyframes fade { entry 100% {  animation-timing-function: ease; } to { animation-timing-function: ease; } }',
			errors: [{messageId: 'no-ineffective-keyframe-declarations/animation-control'}],
		},
	],
});

test.snapshot({
	valid: [
		'@keyframes fade { calc(100%) { animation-timing-function: ease; } to { animation-timing-function: ease; } }',
		'@keyframes fade { ??? {} to { animation-timing-function: ease; } }',
	].map(code => ({code, languageOptions: {tolerant: true}})),
	invalid: [
		'@keyframes fade { calc(100%) { animation-duration: 2s; opacity: 1 !important; } to { animation-timing-function: ease; } }',
		'@keyframes fade { to { animation-duration: ???; animation-timing-function: ???; opacity: ??? !important; } }',
	].map(code => ({code, languageOptions: {tolerant: true}})),
});
