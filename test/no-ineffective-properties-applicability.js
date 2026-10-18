import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'no-ineffective-properties');

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
