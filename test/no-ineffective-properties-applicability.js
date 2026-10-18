import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'no-ineffective-properties');

const outlineProperties = [['outline-color', 'red'], ['outline-width', '2px'], ['outline-offset', '3px']];
const floatedItemProperties = [['justify-self', 'center'], ['place-self', 'center'], ['column-span', 'all'], ['vertical-align', 'middle']];
const anchorPlacementProperties = [
	['position-area', 'top'],
	['position-try', 'flip-block'],
	['position-try-fallbacks', '--below'],
	['position-try-order', 'most-height'],
	['position-visibility', 'no-overflow'],
];

test({
	valid: [
		...anchorPlacementProperties.map(([property, value]) => `a { ${property}: ${value}; }`),
		...anchorPlacementProperties.flatMap(([property, value]) => ['absolute', 'fixed'].map(position => `a { position: ${position}; ${property}: ${value}; }`)),
		...['inherit', 'var(--position)', 'relative sticky'].map(position => `a { position: ${position}; position-area: top; }`),
		'a { position: relative; position: fixed; position-area: top; }',
		...anchorPlacementProperties.map(([property]) => `a { position: relative; ${property}: inherit; }`),
		...anchorPlacementProperties.map(([property]) => `a { position: sticky; ${property}: var(--placement); }`),
		'a { all: unset; position: relative; position-try: flip-block; }',
		'a { position: relative; > .item { position-area: top; } }',
		'a { position: relative; position-anchor: --tooltip; > .item { position: absolute; position-anchor: match-parent; } }',
		'@keyframes layout { to { position: static; position-area: top; } }',
		':export { position: relative; position-try: flip-block; }',
	],
	invalid: [
		...anchorPlacementProperties.flatMap(([property, value]) => ['static', 'relative', 'sticky'].map(position => ({
			code: `a { position: ${position}; ${property}: ${value}; }`,
			errors: [{messageId: 'no-ineffective-properties/absolute-position', data: {property, position}}],
		}))),
		{
			code: 'a { POSITION: /* layout */ RELATIVE !important; POSITION-AREA: BLOCK-START SPAN-INLINE-END; }',
			errors: [{messageId: 'no-ineffective-properties/absolute-position', data: {property: 'position-area', position: 'relative'}}],
		},
		{
			code: '@supports (position-area: top) { a { @media (width > 1px) { position: sticky; position-try: most-width --below, flip-block; } } }',
			errors: [{messageId: 'no-ineffective-properties/absolute-position'}],
		},
		{
			code: 'a { display: flex; > .item { position: relative; position-visibility: anchors-visible; } }',
			errors: [{messageId: 'no-ineffective-properties/absolute-position'}],
		},
		{
			code: 'a { position: static; position-area: none; position-try-fallbacks: none; position-try-order: normal; position-visibility: always; }',
			errors: Array.from({length: 4}, () => ({messageId: 'no-ineffective-properties/absolute-position'})),
		},
	],
});

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
		'a { float: left; vertical-align: middle; }',
		...['inline-flex', 'inline-grid'].map(display => `a { display: block; > .item { display: ${display}; float: none; vertical-align: middle; } }`),
		'a { display: block; > .item { float: left; float: none; vertical-align: middle; } }',
		'a { display: block; > .item { position: var(--position); float: left; vertical-align: middle; } }',
		'a { display: block; > .item { display: contents; float: left; vertical-align: middle; } }',
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
			errors: Array.from({length: 3}, () => ({messageId: 'no-ineffective-properties/floated-item'})),
		},
		...['flex', 'grid'].map(display => ({
			code: `a { display: ${display}; > .item { display: inline-grid; float: left; vertical-align: middle; } }`,
			errors: [{messageId: `no-ineffective-properties/${display}-item`, data: {property: 'float'}}],
		})),
		{
			code: '@media (width > 1px) { a { display: flow-root; & > .item { display: inline-flex; FLOAT: LEFT; VERTICAL-ALIGN: /* baseline */ MIDDLE !important; } } }',
			errors: [{messageId: 'no-ineffective-properties/floated-item', data: {property: 'vertical-align'}}],
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
		'a { column-rule-color: red; }',
		'a { column-rule-style: solid; column-rule-color: red; }',
		'a { column-rule-style: none; column-rule-width: 3px; }',
		...[
			'column-rule: 2px solid blue',
			'column-rule-style: solid',
			'rule: 2px solid blue',
			'rule-style: solid',
			'-webkit-column-rule: 2px solid blue',
			'-webkit-column-rule-style: solid',
			'-moz-column-rule: 2px solid blue',
			'-moz-column-rule-style: solid',
		].map(control => `a { column-rule-style: none; ${control}; column-rule-color: red; }`),
		...['inherit', 'var(--style)', 'none solid'].map(style => `a { column-rule-style: ${style}; column-rule-color: red; }`),
		...['inherit', 'var(--color)'].map(color => `a { column-rule-style: none; column-rule-color: ${color}; }`),
		'a { all: unset; column-rule-style: none; column-rule-color: red; }',
		'a { column-rule-style: none; > .item { column-rule-color: red; } }',
		'@keyframes rules { to { column-rule-style: none; column-rule-color: red; } }',
		':export { column-rule-style: none; column-rule-color: red; }',
	],
	invalid: [
		{
			code: 'a { columns: 2; column-rule-style: none; column-rule-color: red; }',
			errors: [{messageId: 'no-ineffective-properties/column-rule-color', data: {property: 'column-rule-color'}}],
		},
		{
			code: 'a { COLUMN-RULE-STYLE: /* disabled */ NONE !important; COLUMN-RULE-COLOR: rgb(1 2 3); }',
			errors: [{messageId: 'no-ineffective-properties/column-rule-color'}],
		},
		{
			code: 'a { @supports (columns: 2) { column-rule-style: none; column-rule-color: red; } }',
			errors: [{messageId: 'no-ineffective-properties/column-rule-color'}],
		},
	],
});

test({
	valid: [
		'a { background-blend-mode: multiply; }',
		'a { background-image: none; background-blend-mode: normal; }',
		'a { background-image: none; background-blend-mode: NORMAL, /* reset */ normal; }',
		'a { background-image: none; background-color: red; background-clip: content-box; background-attachment: local; }',
		...['url("image.png")', 'linear-gradient(red, blue)', 'none, url("image.png")'].map(image => `a { background-image: ${image}; background-blend-mode: multiply; }`),
		...['background: url("image.png")', 'background-image: url("image.png")'].map(control => `a { background-image: none; ${control}; background-blend-mode: multiply; }`),
		...['inherit', 'var(--image)'].map(image => `a { background-image: ${image}; background-blend-mode: multiply; }`),
		...['inherit', 'var(--blend)'].map(blend => `a { background-image: none; background-blend-mode: ${blend}; }`),
		'a { all: unset; background-image: none; background-blend-mode: multiply; }',
		'a { background-image: none; > .item { background-blend-mode: multiply; } }',
	],
	invalid: [
		...['multiply', 'screen', 'normal, multiply'].map(value => ({
			code: `a { background-image: none; background-color: red; background-blend-mode: ${value}; }`,
			errors: [{messageId: 'no-ineffective-properties/background-image', data: {property: 'background-blend-mode'}}],
		})),
		{
			code: 'a { BACKGROUND-IMAGE: /* disabled */ NONE; BACKGROUND-BLEND-MODE: MULTIPLY !important; }',
			errors: [{messageId: 'no-ineffective-properties/background-image'}],
		},
		{
			code: '@media (width > 1px) { a { background-image: none; background-blend-mode: multiply; } }',
			errors: [{messageId: 'no-ineffective-properties/background-image'}],
		},
	],
});

test({
	valid: [
		'a { scroll-snap-stop: always; }',
		'a { scroll-snap-align: none; scroll-snap-stop: normal; }',
		...['start', 'center', 'none start', 'start none'].map(alignment => `a { scroll-snap-align: ${alignment}; scroll-snap-stop: always; }`),
		'a { scroll-snap-align: none; scroll-snap-align: start; scroll-snap-stop: always; }',
		...['inherit', 'var(--align)', 'none none none'].map(alignment => `a { scroll-snap-align: ${alignment}; scroll-snap-stop: always; }`),
		...['inherit', 'var(--stop)'].map(stop => `a { scroll-snap-align: none; scroll-snap-stop: ${stop}; }`),
		'a { scroll-snap-align: none; scroll-margin: 20px; scroll-padding: 20px; }',
		'a { scroll-snap-type: none; scroll-snap-align: start; scroll-snap-stop: always; }',
		'a { all: unset; scroll-snap-align: none; scroll-snap-stop: always; }',
		'a { scroll-snap-align: none; > .item { scroll-snap-stop: always; } }',
		'@keyframes snapping { to { scroll-snap-align: none; scroll-snap-stop: always; } }',
		':export { scroll-snap-align: none; scroll-snap-stop: always; }',
	],
	invalid: [
		...['none', 'none none'].map(alignment => ({
			code: `a { scroll-snap-align: ${alignment}; scroll-snap-stop: always; }`,
			errors: [{messageId: 'no-ineffective-properties/scroll-snap-stop', data: {property: 'scroll-snap-stop'}}],
		})),
		{
			code: 'a { SCROLL-SNAP-ALIGN: /* disabled */ NONE NONE !important; SCROLL-SNAP-STOP: ALWAYS; }',
			errors: [{messageId: 'no-ineffective-properties/scroll-snap-stop'}],
		},
		{
			code: 'a { @container (width > 1px) { scroll-snap-align: none; scroll-snap-stop: always; } }',
			errors: [{messageId: 'no-ineffective-properties/scroll-snap-stop'}],
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
