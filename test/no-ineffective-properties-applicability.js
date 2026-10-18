import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'no-ineffective-properties');

const outlineProperties = [['outline-color', 'red'], ['outline-width', '2px'], ['outline-offset', '3px']];
const floatedItemProperties = [['justify-self', 'center'], ['place-self', 'center'], ['column-span', 'all']];

test({
	valid: [
		...['solid', 'dashed', 'auto'].map(style => `a { outline-style: ${style}; outline-color: red; outline-width: 2px; outline-offset: 3px; }`),
		'a { outline-color: red; outline-width: 2px; outline-offset: 3px; }',
		'a { outline: none; outline-color: red; outline-width: 2px; outline-offset: 3px; }',
		...['outline: 2px solid red', 'outline-style: solid', '-webkit-outline: solid', '-moz-outline-style: solid'].map(control => `a { outline-style: none; ${control}; outline-offset: 3px; }`),
		'a { outline: solid !important; outline-style: none; outline-color: red; }',
		...['inherit', 'var(--style)', 'none none'].map(style => `a { outline-style: ${style}; outline-offset: 3px; }`),
		...outlineProperties.map(([property]) => `a { outline-style: none; ${property}: inherit; }`),
		...outlineProperties.map(([property]) => `a { outline-style: none; ${property}: var(--value); }`),
		'a { all: unset; outline-style: none; outline-offset: 3px; }',
		'a { outline-style: none; > .item { outline-color: red; } }',
		'@keyframes focus { to { outline-style: none; outline-offset: 3px; } }',
		':export { outline-style: none; outline-width: 2px; }',
	],
	invalid: [
		...outlineProperties.map(([property, value]) => ({
			code: `a { outline-style: none; ${property}: ${value}; }`,
			errors: [{messageId: 'no-ineffective-properties/outline', data: {property}}],
		})),
		{
			code: 'a { OUTLINE-STYLE: /* disabled */ NONE !important; OUTLINE-OFFSET: -3px; }',
			errors: [{messageId: 'no-ineffective-properties/outline'}],
		},
		{
			code: 'a { @media (width > 1px) { outline-style: none; outline-color: red; outline-width: calc(1px + 1px); outline-offset: 3px; } }',
			errors: Array.from({length: 3}, () => ({messageId: 'no-ineffective-properties/outline'})),
		},
	],
});

test({
	valid: [
		'a { float: left; justify-self: center; place-self: center; column-span: all; }',
		...['none', 'inherit', 'var(--float)'].map(value => `a { display: block; > .item { float: ${value}; justify-self: center; place-self: center; column-span: all; } }`),
		'a { display: block; > .item { float: left; float: none; justify-self: center; } }',
		'a { display: block; > .item { float: left; column-span: none; } }',
		'a { display: block; > .item { --float: left; place-self: center; } }',
		'a { display: block; > .item { position: var(--position); float: left; place-self: center; } }',
		'a { display: block; > .item { display: contents; float: left; place-self: center; } }',
		'a { display: block; display: grid; > .item { float: left; justify-self: center; } }',
		'a { display: var(--layout); > .item { float: left; place-self: center; } }',
		'a { display: block; .item { float: left; place-self: center; } }',
		'a { display: block; @media (width > 1px) { > .item { float: left; place-self: center; } } }',
		'a { display: block; > .item { all: unset; float: left; place-self: center; } }',
		...floatedItemProperties.map(([property]) => `a { display: block; > .item { float: left; ${property}: inherit; } }`),
		...floatedItemProperties.map(([property]) => `a { display: block; > .item { float: left; ${property}: var(--value); } }`),
	],
	invalid: [
		...floatedItemProperties.map(([property, value]) => ({
			code: `a { display: block; > .item { float: left; ${property}: ${value}; } }`,
			errors: [{messageId: 'no-ineffective-properties/floated-item', data: {property}}],
		})),
		...['right', 'inline-start', 'inline-end'].map(value => ({
			code: `a { display: flow-root; > .item { float: ${value}; justify-self: center; } }`,
			errors: [{messageId: 'no-ineffective-properties/floated-item'}],
		})),
		{
			code: '@supports (display: block) { a { display: block; &:hover > .item { FLOAT: /* side */ LEFT !important; PLACE-SELF: CENTER; } } }',
			errors: [{messageId: 'no-ineffective-properties/floated-item'}],
		},
		{
			code: 'a { display: block; > .item { justify-self: center; place-self: center; float: right; clear: both; vertical-align: middle; } }',
			errors: [{messageId: 'no-ineffective-properties/floated-item'}, {messageId: 'no-ineffective-properties/floated-item'}],
		},
		{
			code: 'a { display: grid; > .item { float: left; justify-self: center; place-self: center; } }',
			errors: [{messageId: 'no-ineffective-properties/grid-item', data: {property: 'float'}}],
		},
		{
			code: 'a { display: flex; > .item { float: left; place-self: center; } }',
			errors: [{messageId: 'no-ineffective-properties/flex-item', data: {property: 'float'}}],
		},
		{
			code: 'a { display: block; > .item { position: absolute; float: left; justify-self: center; place-self: center; column-span: all; } }',
			errors: [{messageId: 'no-ineffective-properties/float'}, {messageId: 'no-ineffective-properties/column-span'}],
		},
	],
});

test({
	valid: [
		'a { position: static; z-index: 1; }',
		...['flex', 'grid', 'inline-flex', 'inline-grid'].map(display => `a { display: ${display}; > .item { position: static; z-index: 1; } }`),
		...['relative', 'sticky', 'absolute', 'fixed', 'inherit', 'var(--position)'].map(position => `a { display: block; > .item { position: ${position}; z-index: 1; } }`),
		'a { display: block; > .item { z-index: 1; } }',
		'a { display: block; > .item { position: static; z-index: auto; } }',
		'a { display: block; > .item { position: static; z-index: inherit; } }',
		'a { display: block; > .item { position: static; z-index: var(--layer); } }',
		'a { display: block; > .item { position: static; position: relative; z-index: 1; } }',
		'a { display: block; display: grid; > .item { position: static; z-index: 1; } }',
		'a { display: var(--layout); > .item { position: static; z-index: 1; } }',
		'a { display: block; .item { position: static; z-index: 1; } }',
		'a { display: block; @media (width > 1px) { > .item { position: static; z-index: 1; } } }',
		'a { display: block; > .item { all: unset; position: static; z-index: 1; } }',
		'a { all: unset; display: block; > .item { position: static; z-index: 1; } }',
		...['none', 'contents', 'var(--display)'].map(display => `a { display: block; > .item { display: ${display}; position: static; z-index: 1; } }`),
	],
	invalid: [
		...['block', 'flow-root', 'inline-block', 'inline flow-root'].map(display => ({
			code: `a { display: ${display}; > .item { position: static; z-index: 1; } }`,
			errors: [{messageId: 'no-ineffective-properties/z-index'}],
		})),
		{
			code: 'a { display: block; > .item { display: grid; position: static; z-index: 0; } }',
			errors: [{messageId: 'no-ineffective-properties/z-index'}],
		},
		{
			code: '@media (width > 1px) { a { DISPLAY: BLOCK; &:hover > .item { POSITION: STATIC; Z-INDEX: /* layer */ -1 !important; } } }',
			errors: [{messageId: 'no-ineffective-properties/z-index'}],
		},
		{
			code: 'a { display: block; & > .item { position: static; z-index: calc(1 + 2); } }',
			errors: [{messageId: 'no-ineffective-properties/z-index'}],
		},
	],
});

test({
	valid: [
		...[
			'url("shape.png")',
			'linear-gradient(transparent, black)',
			'radial-gradient(circle, transparent, black)',
			'image-set(url("shape.png") 1x)',
		].map(shape => `a { float: left; shape-outside: ${shape}; shape-image-threshold: 0.5; }`),
		// The installed CSS grammar does not recognize a single percentage radius for circle().
		'a { float: left; shape-outside: circle(50%); shape-image-threshold: 0.5; }',
		'a { shape-image-threshold: 0.5; }',
		...['inherit', 'var(--shape)', 'circle(var(--radius))', 'circle(-1px) invalid', 'circle() url("shape.png")'].map(shape => `a { shape-outside: ${shape}; shape-image-threshold: 0.5; }`),
		'a { shape-outside: circle(); shape-outside: url("shape.png"); shape-image-threshold: 0.5; }',
		'a { shape-outside: circle(); -webkit-shape-outside: url("shape.png"); shape-image-threshold: 0.5; }',
		'a { -webkit-shape-outside: circle(); shape-image-threshold: 0.5; }',
		'a { shape-outside: circle(); shape-image-threshold: inherit; }',
		'a { shape-outside: circle(); shape-image-threshold: var(--threshold); }',
		'a { all: unset; shape-outside: circle(); shape-image-threshold: 0.5; }',
		'a { shape-outside: circle(); > .item { shape-image-threshold: 0.5; } }',
		'@keyframes shape { to { shape-outside: circle(); shape-image-threshold: 0.5; } }',
		':export { shape-outside: circle(); shape-image-threshold: 0.5; }',
	],
	invalid: [
		...[
			'circle(10px)',
			'ellipse(40% 50%)',
			'inset(10px)',
			'polygon(0 0, 100% 0, 50% 100%)',
			'margin-box',
			'border-box',
			'padding-box',
			'content-box',
			'circle() border-box',
			'padding-box ellipse()',
		].map(shape => ({
			code: `a { float: left; shape-outside: ${shape}; shape-image-threshold: 0.5; }`,
			errors: [{messageId: 'no-ineffective-properties/non-image-shape'}],
		})),
		{
			code: 'a { SHAPE-OUTSIDE: /* shape */ CIRCLE() BORDER-BOX; SHAPE-IMAGE-THRESHOLD: 50% !important; }',
			errors: [{messageId: 'no-ineffective-properties/non-image-shape'}],
		},
		{
			code: 'a { @supports (shape-outside: circle()) { shape-outside: circle(); shape-image-threshold: 0.5; } }',
			errors: [{messageId: 'no-ineffective-properties/non-image-shape'}],
		},
	],
});
