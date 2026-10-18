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
const maskBorderProperties = [['mask-border-mode', 'luminance'], ['mask-border-slice', '25 fill'], ['mask-border-width', '2'], ['mask-border-outset', '3px'], ['mask-border-repeat', 'round']];
const shapeProperties = [['shape-outside', 'circle()'], ['shape-margin', '8px'], ['shape-image-threshold', '0.5']];
const tableMulticolProperties = [['columns', '12rem 2'], ['column-count', '3'], ['column-width', '12rem'], ['column-fill', 'balance'], ['column-height', '20rem'], ['column-wrap', 'wrap']];
const breakProperties = [['break-before', 'page'], ['break-after', 'column'], ['break-inside', 'avoid'], ['page-break-before', 'always'], ['page-break-after', 'left'], ['page-break-inside', 'avoid']];
const decorationProperties = [['text-decoration-color', 'blue'], ['text-decoration-style', 'dashed'], ['text-decoration-thickness', '3px'], ['text-decoration-inset', '2px']];
const backgroundRepeatProperties = ['background-repeat-x', 'background-repeat-y', 'background-repeat-block', 'background-repeat-inline'];
const animationDelayProperties = ['animation-delay-start', 'animation-delay-end'];

test({
	valid: [
		...['flex', 'grid'].flatMap(parentDisplay => ['block', 'flow-root', 'flex', 'grid', 'table']
			.map(display => `a { display: ${parentDisplay}; align-items: baseline; > .item { display: ${display}; vertical-align: middle; } }`)),
		'a { display: flex; & > .item { display: block; position: relative; vertical-align: top; } }',
		'@supports (display: grid) { a { DISPLAY: GRID; > .item { DISPLAY: BLOCK; VERTICAL-ALIGN: /* baseline */ MIDDLE !important; } } }',
	],
	invalid: [
		{
			code: 'a { display: block; > .item { display: block; vertical-align: middle; } }',
			errors: [{messageId: 'no-ineffective-properties/vertical-align'}],
		},
		...['absolute', 'fixed'].map(position => ({
			code: `a { display: flex; > .item { display: block; position: ${position}; vertical-align: middle; } }`,
			errors: [{messageId: 'no-ineffective-properties/vertical-align'}],
		})),
	],
});

test({
	valid: [
		...['none', 'ray(45deg)', 'circle()', 'url("path.svg#route")', 'ray(45deg) padding-box'].map(path => `a { offset-path: ${path}; offset-position: right bottom; }`),
		'a { offset-position: right bottom; }',
		'a { offset-path: padding-box; offset-path: ray(45deg); offset-position: right bottom; }',
		'a { offset-path: border-box; offset: ray(45deg); offset-position: right bottom; }',
		'a { offset: border-box; offset-position: right bottom; }',
		'a { offset-path: var(--path); offset-position: right bottom; }',
		'a { offset-path: content-box; offset-position: inherit; }',
		'a { offset-path: border-box; offset-position: var(--position); }',
		'a { all: unset; offset-path: border-box; offset-position: right bottom; }',
		'@keyframes move { to { offset-path: padding-box; offset-position: right bottom; } }',
		':export { offset-path: border-box; offset-position: right bottom; }',
	],
	invalid: [
		...['border-box', 'padding-box', 'content-box', 'fill-box', 'stroke-box', 'view-box'].map(path => ({
			code: `a { offset-path: ${path}; offset-position: right bottom; }`,
			errors: [{messageId: 'no-ineffective-properties/offset-position'}],
		})),
		{
			code: '@supports (offset-path: border-box) { a { OFFSET-PATH: /* box */ BORDER-BOX; OFFSET-POSITION: 20% 30% !important; } }',
			errors: [{messageId: 'no-ineffective-properties/offset-position'}],
		},
	],
});

test({
	valid: [
		...['wrap', 'auto', 'inherit', 'var(--wrap)'].map(wrap => `a { display: block; column-wrap: ${wrap}; row-gap: 1rem; }`),
		'a { column-wrap: nowrap; row-gap: 1rem; }',
		'a { display: block; column-count: 2; column-wrap: nowrap; column-gap: 1rem; gap: 1rem; }',
		'a { display: block; column-wrap: nowrap; column-wrap: wrap; row-gap: 1rem; }',
		...['columns', '-webkit-columns', '-moz-columns'].map(property => `a { display: block; ${property}: 2; column-wrap: nowrap; row-gap: 1rem; }`),
		...['none', 'contents', 'var(--display)'].map(display => `a { display: ${display}; column-wrap: nowrap; row-gap: 1rem; }`),
		'a { display: block; display: grid; column-wrap: nowrap; row-gap: 1rem; }',
		'a { display: block; column-wrap: nowrap; row-gap: var(--gap); grid-row-gap: inherit; }',
		'a { all: unset; display: block; column-wrap: nowrap; row-gap: 1rem; }',
		'@keyframes layout { to { display: block; column-wrap: nowrap; row-gap: 1rem; } }',
		':export { display: block; column-wrap: nowrap; row-gap: 1rem; }',
	],
	invalid: [
		...['flex', 'grid', 'inline-flex', 'inline-grid'].map(display => ({
			code: `a { display: ${display}; column-wrap: nowrap; row-gap: 1rem; }`,
			errors: [{messageId: 'no-ineffective-properties/multicol', data: {property: 'column-wrap', display}}],
		})),
		...['block', 'inline-block', 'flow-root', 'block flow', 'inline flow-root', 'list-item'].map(display => ({
			code: `a { display: ${display}; column-count: 2; column-height: 20rem; column-wrap: nowrap; row-gap: 1rem; }`,
			errors: [{messageId: 'no-ineffective-properties/multicol-gap'}],
		})),
		{
			code: 'a { display: block; column-wrap: nowrap; grid-row-gap: 1rem; > h2 { column-span: all; } }',
			errors: [{messageId: 'no-ineffective-properties/multicol-gap', data: {property: 'grid-row-gap'}}],
		},
		{
			code: 'a { @media print { DISPLAY: BLOCK; COLUMN-WRAP: /* rows */ NOWRAP; ROW-GAP: 1rem !important; } }',
			errors: [{messageId: 'no-ineffective-properties/multicol-gap'}],
		},
		{
			code: 'a { display: grid; > .item { display: block; column-wrap: nowrap; row-gap: 1rem; } }',
			errors: [{messageId: 'no-ineffective-properties/multicol-gap'}],
		},
	],
});

test({
	valid: [
		'a { column-rule-style: solid; column-rule-color: red; }',
		'a { column-rule-style: hidden; column-rule-width: 3px; }',
		'a { column-rule-style: hidden; column-rule-style: solid; column-rule-color: red; }',
		'a { column-rule-style: hidden; column-rule: 3px solid; column-rule-color: red; }',
		'a { column-rule-style: hidden; column-rule-color: inherit; }',
	],
	invalid: [
		{
			code: 'a { column-rule-style: hidden; column-rule-color: red; }',
			errors: [{messageId: 'no-ineffective-properties/column-rule-color'}],
		},
		{
			code: '@supports (column-count: 2) { a { COLUMN-RULE-STYLE: /* invisible */ HIDDEN; COLUMN-RULE-COLOR: RED !important; } }',
			errors: [{messageId: 'no-ineffective-properties/column-rule-color'}],
		},
	],
});

test({
	valid: [
		...backgroundRepeatProperties.map(property => `a { background-image: url("image.svg"); ${property}: no-repeat; }`),
		...backgroundRepeatProperties.map(property => `a { ${property}: no-repeat; }`),
		...['background-position-inline', 'background-position-block'].map(property => `a { background-image: url("image.svg"); ${property}: 20%; }`),
		'a { background-image: none; background: url("image.svg"); background-repeat-x: no-repeat; }',
		'a { background-image: none; background-tbd: url("image.svg"); background-size: cover; background-repeat-inline: no-repeat; }',
		'a { background-image: none; background-repeat-y: inherit; background-repeat-inline: var(--repeat); }',
		'a { background-image: var(--image); background-repeat-block: no-repeat; }',
		'a { all: unset; background-image: none; background-repeat-inline: no-repeat; }',
	],
	invalid: [
		...backgroundRepeatProperties.map(property => ({
			code: `a { background-image: none; ${property}: no-repeat; }`,
			errors: [{messageId: 'no-ineffective-properties/background-image', data: {property}}],
		})),
		...['background-position-inline', 'background-position-block'].map(property => ({
			code: `a { background-image: none; ${property}: 20%; }`,
			errors: [{messageId: 'no-ineffective-properties/background-image', data: {property}}],
		})),
		{
			code: '@media (width > 1px) { a { BACKGROUND-IMAGE: /* disabled */ NONE; BACKGROUND-REPEAT-INLINE: SPACE !important; } }',
			errors: [{messageId: 'no-ineffective-properties/background-image'}],
		},
	],
});

test({
	valid: [
		...animationDelayProperties.map(property => `a { animation-name: fade; ${property}: 1s; }`),
		...animationDelayProperties.map(property => `a { ${property}: 1s; }`),
		'a { animation-name: fade; animation-range-center: target 50%; }',
		'a { animation-name: none; animation: fade 1s; animation-delay-end: 1s; }',
		'a { animation-name: none; -webkit-animation-name: fade; animation-delay-start: 1s; }',
		'a { animation-name: none; animation-delay-start: inherit; animation-delay-end: var(--delay); }',
		'a { animation-name: var(--name); animation-delay-end: 1s; }',
		'a { all: unset; animation-name: none; animation-delay-start: 1s; }',
	],
	invalid: [
		...animationDelayProperties.map(property => ({
			code: `a { animation-name: none; ${property}: 1s; }`,
			errors: [{messageId: 'no-ineffective-properties/animation', data: {property}}],
		})),
		{
			code: 'a { animation-name: none; animation-range-center: target 50%; }',
			errors: [{messageId: 'no-ineffective-properties/animation', data: {property: 'animation-range-center'}}],
		},
		{
			code: 'a { @supports (display: grid) { ANIMATION-NAME: /* disabled */ NONE; ANIMATION-DELAY-START: -1s !important; } }',
			errors: [{messageId: 'no-ineffective-properties/animation'}],
		},
	],
});

test({
	valid: [
		'a { position: absolute; position-try-order: most-height; }',
		'a { position: fixed; position-try-fallbacks: flip-block; position-try-order: most-height; }',
		'a { position-try-fallbacks: --below, --above; position-try-order: most-width; }',
		...['inherit', 'var(--fallbacks)', 'none none', 'imaginary'].map(fallbacks => `a { position-try-fallbacks: ${fallbacks}; position-try-order: most-height; }`),
		'a { position-try-fallbacks: none; position-try-fallbacks: flip-block; position-try-order: most-height; }',
		'a { position-try-fallbacks: none; position-try: flip-block; position-try-order: most-height; }',
		'a { position-try: most-height none; }',
		'a { position-try: none; position-try-order: most-height; }',
		'a { position-try-fallbacks: none; position-try-order: inherit; }',
		'a { position-try-fallbacks: none; position-try-order: var(--order); }',
		'a { position-try-fallbacks: none; > .item { position-try-order: most-height; } }',
		'a { all: unset; position-try-fallbacks: none; position-try-order: most-height; }',
		'@keyframes tooltip { to { position-try-fallbacks: none; position-try-order: most-height; } }',
		':export { position-try-fallbacks: none; position-try-order: most-height; }',
	],
	invalid: [
		...['normal', 'most-width', 'most-height', 'most-block-size', 'most-inline-size'].map(order => ({
			code: `a { position: absolute; position-try-fallbacks: none; position-try-order: ${order}; }`,
			errors: [{messageId: 'no-ineffective-properties/position-try-order'}],
		})),
		{
			code: 'a { position-try-fallbacks: none; position-try-order: most-height; }',
			errors: [{messageId: 'no-ineffective-properties/position-try-order'}],
		},
		{
			code: '@supports (position-area: top) { a { @media (width > 1px) { POSITION: FIXED; POSITION-TRY-FALLBACKS: /* disabled */ NONE; POSITION-TRY-ORDER: MOST-HEIGHT !important; } } }',
			errors: [{messageId: 'no-ineffective-properties/position-try-order'}],
		},
	],
});

test({
	valid: [
		...breakProperties.map(([property, value]) => `a { ${property}: ${value}; }`),
		...['static', 'relative', 'sticky'].map(position => `a { position: ${position}; break-before: page; break-after: column; break-inside: avoid; }`),
		'a { position: absolute; position: relative; break-before: page; }',
		'a { position: var(--position); page-break-inside: avoid; }',
		'a { position: inherit; break-after: page; }',
		'a { position: fixed; break-before: inherit; break-after: var(--break); }',
		'a { position: absolute; break-inside: revert-layer; }',
		'a { position: absolute; > .item { break-before: page; break-inside: avoid; } }',
		'a { position: absolute; widows: 3; orphans: 3; }',
		'a { all: unset; position: absolute; break-after: page; }',
		'@keyframes layout { to { position: fixed; break-inside: avoid; } }',
		':export { position: absolute; page-break-before: always; }',
	],
	invalid: [
		...breakProperties.flatMap(([property, value]) => ['absolute', 'fixed'].map(position => ({
			code: `a { position: ${position}; ${property}: ${value}; }`,
			errors: [{messageId: 'no-ineffective-properties/position', data: {property, position}}],
		}))),
		{
			code: 'a { @media print { POSITION: ABSOLUTE; BREAK-BEFORE: /* page */ PAGE !important; } }',
			errors: [{messageId: 'no-ineffective-properties/position', data: {property: 'break-before', position: 'absolute'}}],
		},
		{
			code: 'a { display: grid; > .item { position: fixed; page-break-after: always; } }',
			errors: [{messageId: 'no-ineffective-properties/position'}],
		},
		{
			code: 'a { position: absolute; break-inside: auto; }',
			errors: [{messageId: 'no-ineffective-properties/position'}],
		},
	],
});

test({
	valid: [
		...decorationProperties.map(([property, value]) => `a { text-decoration-line: underline; ${property}: ${value}; }`),
		...['inherit', 'var(--line)', 'spelling-error underline', 'grammar-error spelling-error'].map(line => `a { text-decoration-line: ${line}; text-decoration-color: blue; }`),
		...[
			'text-decoration-line: underline',
			'text-decoration: underline',
			'-webkit-text-decoration-line: underline',
			'-webkit-text-decoration: underline',
		].map(control => `a { text-decoration-line: spelling-error; ${control}; text-decoration-color: blue; }`),
		'a { text-decoration-line: spelling-error; color: blue; fill: blue; stroke: blue; text-underline-position: under; text-underline-offset: 3px; text-decoration-skip-ink: none; }',
		'a { text-decoration-line: grammar-error; text-decoration-color: inherit; text-decoration-style: var(--style); }',
		'a { text-decoration-line: spelling-error; > .item { text-decoration-color: blue; } }',
		'a { all: unset; text-decoration-line: grammar-error; text-decoration-color: blue; }',
		'@keyframes spell { to { text-decoration-line: spelling-error; text-decoration-color: blue; } }',
		':export { text-decoration-line: grammar-error; text-decoration-color: blue; }',
	],
	invalid: [
		...decorationProperties.flatMap(([property, value]) => ['spelling-error', 'grammar-error'].map(line => ({
			code: `a { text-decoration-line: ${line}; ${property}: ${value}; }`,
			errors: [{messageId: 'no-ineffective-properties/error-decoration', data: {property}}],
		}))),
		{
			code: '@supports (text-decoration-line: spelling-error) { a { TEXT-DECORATION-LINE: /* error */ SPELLING-ERROR; TEXT-DECORATION-THICKNESS: 3px !important; } }',
			errors: [{messageId: 'no-ineffective-properties/error-decoration'}],
		},
	],
});

test({
	valid: [
		...shapeProperties.map(([property, value]) => `a { ${property}: ${value}; }`),
		...shapeProperties.map(([property, value]) => `a { display: block; > .item { float: left; ${property}: ${value}; } }`),
		'a { display: block; > .item { display: flex; float: left; shape-outside: circle(); shape-margin: 8px; } }',
		'a { display: block; > .item { initial-letter: 2; shape-outside: circle(); shape-margin: 8px; } }',
		'a { display: flex; > .item::first-letter { initial-letter: 2; shape-outside: circle(); shape-margin: 8px; } }',
		...['absolute', 'fixed', 'var(--position)'].map(position => `a { display: flex; > .item { position: ${position}; shape-outside: circle(); shape-margin: 8px; } }`),
		...['none', 'contents', 'var(--display)'].map(display => `a { display: grid; > .item { display: ${display}; shape-margin: 8px; } }`),
		'a { display: flex; display: block; > .item { shape-margin: 8px; } }',
		'a { display: var(--layout); > .item { shape-margin: 8px; } }',
		'a { display: grid; .item { shape-margin: 8px; } }',
		'a { display: grid; @media (width > 1px) { > .item { shape-margin: 8px; } } }',
		'a { display: grid; > .item { all: unset; shape-margin: 8px; } }',
		...shapeProperties.map(([property]) => `a { display: grid; > .item { ${property}: inherit; } }`),
		...shapeProperties.map(([property]) => `a { display: flex; > .item { ${property}: var(--shape); } }`),
	],
	invalid: [
		...shapeProperties.flatMap(([property, value]) => ['flex', 'grid', 'inline-flex', 'inline-grid'].map(display => ({
			code: `a { display: ${display}; > .item { ${property}: ${value}; } }`,
			errors: [{messageId: `no-ineffective-properties/${display.includes('flex') ? 'flex' : 'grid'}-item`, data: {property}}],
		}))),
		{
			code: 'a { display: grid; & > .item { float: left; shape-outside: url("shape.png"); shape-image-threshold: 0.5; } }',
			errors: Array.from({length: 3}, () => ({messageId: 'no-ineffective-properties/grid-item'})),
		},
		{
			code: 'a { display: grid; > .item { shape-outside: none; shape-margin: 0; shape-image-threshold: 0; } }',
			errors: Array.from({length: 3}, () => ({messageId: 'no-ineffective-properties/grid-item'})),
		},
		{
			code: '@supports (display: flex) { a { DISPLAY: FLEX; &:hover > .item { SHAPE-MARGIN: /* inset */ 8px !important; } } }',
			errors: [{messageId: 'no-ineffective-properties/flex-item', data: {property: 'shape-margin'}}],
		},
	],
});

test({
	valid: [
		...tableMulticolProperties.map(([property, value]) => `a { display: block; ${property}: ${value}; }`),
		...tableMulticolProperties.map(([property, value]) => `a { display: table-cell; ${property}: ${value}; }`),
		'a { display: table-caption; columns: 2; }',
		...['none', 'contents', 'var(--display)'].map(display => `a { display: ${display}; columns: 2; }`),
		'a { display: table; display: block; columns: 2; }',
		...tableMulticolProperties.map(([property]) => `a { display: table; ${property}: inherit; }`),
		...tableMulticolProperties.map(([property]) => `a { display: inline-table; ${property}: var(--columns); }`),
		'a { all: unset; display: table; columns: 2; }',
		'a { display: table; > .item { columns: 2; } }',
		'@keyframes layout { to { display: table; columns: 2; } }',
		':export { display: table; columns: 2; }',
	],
	invalid: [
		...tableMulticolProperties.flatMap(([property, value]) => ['table', 'inline-table', 'block table', 'inline table'].map(display => ({
			code: `a { display: ${display}; ${property}: ${value}; }`,
			errors: [{messageId: 'no-ineffective-properties/multicol', data: {property, display}}],
		}))),
		{
			code: 'a { @media (width > 1px) { DISPLAY: INLINE-TABLE; COLUMN-COUNT: /* count */ 2 !important; } }',
			errors: [{messageId: 'no-ineffective-properties/multicol'}],
		},
		{
			code: 'a { display: flex; > .item { display: table; position: absolute; columns: 2; } }',
			errors: [{messageId: 'no-ineffective-properties/multicol'}],
		},
	],
});

test({
	valid: [
		...['column-height: 20rem', 'column-wrap: wrap'].flatMap(declaration => ['block', 'inline-block', 'table-cell', 'table-caption'].map(display => `a { display: ${display}; ${declaration}; }`)),
		'a { display: flex; column-height: var(--height); column-wrap: inherit; }',
	],
	invalid: [
		...['column-height: 20rem', 'column-wrap: wrap'].flatMap(declaration => ['flex', 'inline-flex', 'grid', 'inline-grid'].map(display => ({
			code: `a { display: ${display}; ${declaration}; }`,
			errors: [{messageId: 'no-ineffective-properties/multicol'}],
		}))),
	],
});

test({
	valid: [
		...['gap', 'row-gap', 'column-gap'].flatMap(property => ['grid', 'block', 'table-cell', 'table-caption', 'none', 'contents'].map(display => `a { display: ${display}; ${property}: 1rem; }`)),
		'a { display: table; display: grid; gap: 1rem; }',
		'a { display: var(--display); gap: 1rem; }',
		'a { display: table; gap: var(--gap); row-gap: inherit; column-gap: revert; }',
		'a { all: unset; display: table; gap: 1rem; }',
		'a { display: table; > .item { gap: 1rem; } }',
		'@keyframes layout { to { display: table; gap: 1rem; } }',
		':export { display: table; gap: 1rem; }',
	],
	invalid: [
		...['gap', 'row-gap', 'column-gap'].flatMap(property => ['table', 'inline-table', 'block table', 'inline table'].map(display => ({
			code: `a { display: ${display}; ${property}: 1rem; }`,
			errors: [{messageId: 'no-ineffective-properties/table-gap', data: {property}}],
		}))),
		{
			code: 'a { @media (width > 1px) { DISPLAY: INLINE-TABLE; GAP: /* cells */ 1rem 2rem !important; } }',
			errors: [{messageId: 'no-ineffective-properties/table-gap', data: {property: 'gap'}}],
		},
	],
});

test({
	valid: [
		...['row', 'row-reverse'].map(direction => `a { display: flex; flex-direction: ${direction}; flex-wrap: nowrap; column-gap: 1rem; gap: 2rem; }`),
		...['column', 'column-reverse'].map(direction => `a { display: flex; flex-direction: ${direction}; flex-wrap: nowrap; row-gap: 1rem; gap: 2rem; }`),
		...['wrap', 'wrap-reverse'].map(wrapping => `a { display: flex; flex-flow: row ${wrapping}; row-gap: 1rem; }`),
		'a { display: flex; flex-wrap: nowrap; row-gap: 1rem; column-gap: 2rem; }',
		'a { display: flex; flex-direction: row; row-gap: 1rem; }',
		'a { display: flex; flex-flow: row; flex-direction: column; row-gap: 1rem; }',
		'a { display: flex; flex-flow: column; flex-wrap: wrap; column-gap: 1rem; }',
		'a { display: flex; flex-direction: row; flex-direction: column; flex-wrap: nowrap; row-gap: 1rem; }',
		...['-webkit-flex-direction: column', '-webkit-flex-flow: column wrap'].map(declaration => `a { display: flex; flex-direction: row; flex-wrap: nowrap; ${declaration}; row-gap: 1rem; }`),
		'a { display: flex; flex-direction: row; flex-wrap: nowrap; -webkit-flex-wrap: wrap; row-gap: 1rem; }',
		...['inherit', 'var(--direction)', 'row column'].map(direction => `a { display: flex; flex-direction: ${direction}; flex-wrap: nowrap; row-gap: 1rem; }`),
		...['inherit', 'var(--wrap)'].map(wrapping => `a { display: flex; flex-direction: row; flex-wrap: ${wrapping}; row-gap: 1rem; }`),
		'a { display: flex; flex-flow: row; row-gap: var(--gap); column-gap: 1rem; }',
		'a { display: flex; flex-flow: column; column-gap: inherit; }',
		'a { all: unset; display: flex; flex-flow: row; row-gap: 1rem; }',
		'a { display: flex; flex-flow: row; > .item { row-gap: 1rem; } }',
	],
	invalid: [
		...['row', 'row-reverse', 'column', 'column-reverse'].flatMap(direction => ['flex', 'inline-flex'].map(display => ({
			code: `a { display: ${display}; flex-direction: ${direction}; flex-wrap: nowrap; ${direction.startsWith('row') ? 'row-gap' : 'column-gap'}: 1rem; }`,
			errors: [{messageId: 'no-ineffective-properties/flex-gap', data: {property: direction.startsWith('row') ? 'row-gap' : 'column-gap'}}],
		}))),
		...['row', 'row-reverse nowrap', 'nowrap', 'nowrap row'].map(flow => ({
			code: `a { display: flex; flex-flow: ${flow}; row-gap: 1rem; }`,
			errors: [{messageId: 'no-ineffective-properties/flex-gap', data: {property: 'row-gap'}}],
		})),
		...['column', 'nowrap column-reverse'].map(flow => ({
			code: `a { display: flex; flex-flow: ${flow}; column-gap: 1rem; }`,
			errors: [{messageId: 'no-ineffective-properties/flex-gap', data: {property: 'column-gap'}}],
		})),
		{
			code: '@supports (display: flex) { a { DISPLAY: FLEX; FLEX-FLOW: COLUMN; COLUMN-GAP: /* lines */ 2rem !important; } }',
			errors: [{messageId: 'no-ineffective-properties/flex-gap'}],
		},
	],
});

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

test({
	valid: [
		...['flex', 'grid', 'block', 'table-cell', 'table-caption'].map(display => `a { display: ${display}; justify-content: center; }`),
		'a { display: table-cell; columns: 2; justify-content: center; }',
		'a { display: table; align-content: baseline; place-content: baseline; }',
		'a { display: table; justify-items: center; }',
		'a { display: table; justify-content: inherit; }',
		'a { display: table; justify-content: var(--alignment); }',
		'a { display: table; display: flex; justify-content: center; }',
		'a { display: var(--display); justify-content: center; }',
		'a { all: unset; display: table; justify-content: center; }',
		'a { display: table; > .item { justify-content: center; } }',
	],
	invalid: [
		...['table', 'inline-table', 'block table', 'inline table'].map(display => ({
			code: `a { display: ${display}; justify-content: space-between; }`,
			errors: [{messageId: 'no-ineffective-properties/table-justify-content'}],
		})),
		{
			code: '@supports (display: table) { a { DISPLAY: TABLE; JUSTIFY-CONTENT: /* alignment */ CENTER !important; } }',
			errors: [{messageId: 'no-ineffective-properties/table-justify-content'}],
		},
	],
});

test({
	valid: [
		...['justify-self', 'place-self'].flatMap(property => ['block', 'flex', 'grid', 'table'].map(display => `a { display: block; > .item { display: ${display}; ${property}: center; } }`)),
		'a { display: grid; > .item { display: inline-flex; justify-self: center; place-self: center; } }',
		'a { display: flex; > .item { display: inline-flex; place-self: center; } }',
		...['absolute', 'fixed', 'var(--position)'].map(position => `a { display: block; > .item { display: inline-flex; position: ${position}; justify-self: center; place-self: center; } }`),
		'a { display: block; > .item { display: var(--display); justify-self: center; } }',
		'a { display: block; > .item { display: inline; display: block; justify-self: center; } }',
		'a { display: block; > .item { display: inline-flex; justify-self: inherit; place-self: var(--alignment); } }',
		'a { display: block; > .item { all: unset; display: inline; justify-self: center; } }',
		'a { display: block; .item { display: inline; justify-self: center; } }',
		'a { display: block; @media (width > 1px) { > .item { display: inline; justify-self: center; } } }',
		'a { display: inline; justify-self: center; }',
	],
	invalid: [
		...['justify-self', 'place-self'].flatMap(property => ['inline', 'inline-block', 'inline-flex', 'inline-grid', 'inline-table', 'flow inline', 'inline list-item'].map(display => ({
			code: `a { display: block; > .item { display: ${display}; ${property}: center; } }`,
			errors: [{messageId: 'no-ineffective-properties/inline-flow-item', data: {property}}],
		}))),
		{
			code: '@media (width > 1px) { a { DISPLAY: FLOW-ROOT; &:hover > .item { DISPLAY: INLINE-FLEX; PLACE-SELF: /* alignment */ CENTER !important; } } }',
			errors: [{messageId: 'no-ineffective-properties/inline-flow-item', data: {property: 'place-self'}}],
		},
	],
});

test({
	valid: [
		...maskBorderProperties.map(([property, value]) => `a { ${property}: ${value}; }`),
		...maskBorderProperties.map(([property, value]) => `a { mask-border-source: url("mask.png"); ${property}: ${value}; }`),
		...[
			'mask-border-source: url("mask.png")',
			'mask-border: url("mask.png") 25 fill',
			'mask: url("mask.png")',
			'-webkit-mask-box-image-source: url("mask.png")',
			'-webkit-mask-box-image: url("mask.png")',
			'-webkit-mask: url("mask.png")',
		].map(control => `a { mask-border-source: none; ${control}; mask-border-width: 2; }`),
		'a { -webkit-mask-box-image-source: none; mask-border-width: 2; }',
		...['inherit', 'var(--image)', 'none none'].map(source => `a { mask-border-source: ${source}; mask-border-repeat: round; }`),
		...maskBorderProperties.map(([property]) => `a { mask-border-source: none; ${property}: inherit; }`),
		...maskBorderProperties.map(([property]) => `a { mask-border-source: none; ${property}: var(--value); }`),
		'a { all: unset; mask-border-source: none; mask-border-width: 2; }',
		'a { mask-border-source: none; > .item { mask-border-width: 2; } }',
		'@keyframes mask { to { mask-border-source: none; mask-border-width: 2; } }',
		':export { mask-border-source: none; mask-border-width: 2; }',
	],
	invalid: [
		...maskBorderProperties.map(([property, value]) => ({
			code: `a { mask-border-source: none; ${property}: ${value}; }`,
			errors: [{messageId: 'no-ineffective-properties/mask-border', data: {property}}],
		})),
		{
			code: 'a { MASK-BORDER-SOURCE: /* disabled */ NONE; MASK-BORDER-SLICE: 25 FILL !important; }',
			errors: [{messageId: 'no-ineffective-properties/mask-border'}],
		},
		{
			code: 'a { @supports (mask-border-source: none) { mask-border-source: none; mask-image: url("mask.png"); mask-border-repeat: round; } }',
			errors: [{messageId: 'no-ineffective-properties/mask-border'}],
		},
	],
});

test({
	valid: [
		'a { view-transition-group: contain; }',
		...['card', 'match-element', 'auto'].map(name => `a { view-transition-name: ${name}; view-transition-group: contain; }`),
		'a { view-transition-name: none; view-transition-name: card; view-transition-group: nearest; }',
		...['inherit', 'var(--name)', 'none none'].map(name => `a { view-transition-name: ${name}; view-transition-group: contain; }`),
		...['inherit', 'var(--group)'].map(value => `a { view-transition-name: none; view-transition-group: ${value}; }`),
		'a { view-transition-name: none; view-transition-scope: all; }',
		'a { all: unset; view-transition-name: none; view-transition-group: contain; }',
		'a { view-transition-name: none; > .item { view-transition-name: card; view-transition-group: nearest; } }',
		'@keyframes transition { to { view-transition-name: none; view-transition-group: contain; } }',
		':export { view-transition-name: none; view-transition-group: contain; }',
	],
	invalid: [
		...['normal', 'contain', 'nearest', 'card'].map(value => ({
			code: `a { view-transition-name: none; view-transition-group: ${value}; }`,
			errors: [{messageId: 'no-ineffective-properties/view-transition', data: {property: 'view-transition-group'}}],
		})),
		{
			code: 'a { @supports (view-transition-group: contain) { VIEW-TRANSITION-NAME: /* disabled */ NONE; VIEW-TRANSITION-GROUP: CONTAIN !important; } }',
			errors: [{messageId: 'no-ineffective-properties/view-transition', data: {property: 'view-transition-group'}}],
		},
		{
			code: 'a { view-transition-name: none; view-transition-group: contain; > .item { view-transition-name: card; view-transition-group: nearest; } }',
			errors: [{messageId: 'no-ineffective-properties/view-transition', data: {property: 'view-transition-group'}}],
		},
	],
});

test({
	valid: [
		'a { view-transition-class: card; }',
		...['card', 'match-element', 'auto'].map(name => `a { view-transition-name: ${name}; view-transition-class: card; }`),
		'a { view-transition-name: none; view-transition-name: card; view-transition-class: card; }',
		...['inherit', 'var(--name)', 'none none'].map(name => `a { view-transition-name: ${name}; view-transition-class: card; }`),
		...['inherit', 'var(--class)'].map(value => `a { view-transition-name: none; view-transition-class: ${value}; }`),
		'a { all: unset; view-transition-name: none; view-transition-class: card; }',
		'a { view-transition-name: none; > .item { view-transition-class: card; } }',
		'@keyframes transition { to { view-transition-name: none; view-transition-class: card; } }',
		':export { view-transition-name: none; view-transition-class: card; }',
	],
	invalid: [
		...['card', 'card selected', 'none'].map(value => ({
			code: `a { view-transition-name: none; view-transition-class: ${value}; }`,
			errors: [{messageId: 'no-ineffective-properties/view-transition'}],
		})),
		{
			code: 'a { @media (width > 1px) { VIEW-TRANSITION-NAME: /* disabled */ NONE; VIEW-TRANSITION-CLASS: card !important; } }',
			errors: [{messageId: 'no-ineffective-properties/view-transition'}],
		},
	],
});

test({
	valid: [
		...['block', 'flex', 'grid', 'table'].map(display => `a { display: block; > .item { display: ${display}; column-span: all; } }`),
		'a { display: block; > .item { display: inline-flex; column-span: none; } }',
		'a { display: block; > .item { display: inline-flex; column-span: var(--span); } }',
		'a { display: block; > .item { display: inline-flex; column-span: inherit; } }',
		'a { display: block; > .item { display: var(--display); column-span: all; } }',
		'a { display: block; > .item { display: inline; display: block; column-span: all; } }',
		'a { display: block; > .item { display: inline-flex; position: var(--position); column-span: all; } }',
		'a { display: inline-flex; column-span: all; }',
	],
	invalid: [
		...['inline', 'inline-block', 'inline-flex', 'inline-grid', 'inline-table', 'flow inline'].map(display => ({
			code: `a { display: block; > .item { display: ${display}; column-span: all; } }`,
			errors: [{messageId: 'no-ineffective-properties/inline-flow-item', data: {property: 'column-span'}}],
		})),
		{
			code: '@supports (columns: 2) { a { display: flow-root; columns: 2; & > .heading { DISPLAY: INLINE-FLEX; COLUMN-SPAN: /* heading */ ALL !important; } } }',
			errors: [{messageId: 'no-ineffective-properties/inline-flow-item'}],
		},
	],
});

test({
	valid: [
		...['table-cell', 'table-caption', 'block'].map(display => `a { display: ${display}; overflow: hidden; text-overflow: ellipsis; }`),
		'a { display: table; text-overflow: clip; }',
		'a { display: table; text-overflow: "…"; }',
		'a { display: table; text-overflow: var(--overflow); }',
		'a { display: table; text-overflow: inherit; }',
		'a { display: table; display: block; text-overflow: ellipsis; }',
		'a { display: var(--display); text-overflow: ellipsis; }',
		'a { all: unset; display: table; text-overflow: ellipsis; }',
		'a { display: table; > .item { text-overflow: ellipsis; } }',
	],
	invalid: [
		...['table', 'inline-table', 'block table', 'inline table'].map(display => ({
			code: `a { display: ${display}; overflow: hidden; text-overflow: ellipsis; }`,
			errors: [{messageId: 'no-ineffective-properties/text-overflow-display', data: {value: 'ellipsis', display}}],
		})),
		{
			code: 'a { @media (width > 1px) { DISPLAY: INLINE-TABLE; TEXT-OVERFLOW: /* edges */ CLIP ELLIPSIS !important; } }',
			errors: [{messageId: 'no-ineffective-properties/text-overflow-display', data: {value: 'clip ellipsis', display: 'inline-table'}}],
		},
	],
});

test({
	valid: [
		'a { animation-trigger: --reveal play; }',
		'a { animation-name: reveal; animation-trigger: --reveal play; }',
		'a { animation-name: none, reveal; animation-trigger: --reveal play; }',
		...[
			'animation-name: reveal',
			'animation: reveal 1s',
			'-webkit-animation-name: reveal',
			'-webkit-animation: reveal 1s',
		].map(control => `a { animation-name: none; ${control}; animation-trigger: --reveal play; }`),
		...['inherit', 'var(--name)'].map(name => `a { animation-name: ${name}; animation-trigger: --reveal play; }`),
		...['inherit', 'var(--trigger)'].map(trigger => `a { animation-name: none; animation-trigger: ${trigger}; }`),
		'a { all: unset; animation-name: none; animation-trigger: --reveal play; }',
		'a { animation-name: none; > .item { animation-trigger: --reveal play; } }',
	],
	invalid: [
		...['--reveal play', '--reveal play pause', '--enter play, --exit play'].map(value => ({
			code: `a { animation-name: none; animation-trigger: ${value}; }`,
			errors: [{messageId: 'no-ineffective-properties/animation', data: {property: 'animation-trigger'}}],
		})),
		{
			code: 'a { @media (width > 1px) { ANIMATION-NAME: /* disabled */ NONE; ANIMATION-TRIGGER: --reveal PLAY !important; } }',
			errors: [{messageId: 'no-ineffective-properties/animation'}],
		},
	],
});

test({
	valid: [
		'a { text-decoration-inset: 2px; }',
		'a { text-decoration-line: underline; text-decoration-inset: 2px; }',
		...[
			'text-decoration-line: underline',
			'text-decoration: underline',
			'-webkit-text-decoration: underline',
		].map(control => `a { text-decoration-line: none; ${control}; text-decoration-inset: 2px; }`),
		'a { text-decoration-line: var(--line); text-decoration-inset: 2px; }',
		...['inherit', 'var(--inset)'].map(value => `a { text-decoration-line: none; text-decoration-inset: ${value}; }`),
		'a { all: unset; text-decoration-line: none; text-decoration-inset: 2px; }',
		'a { text-decoration-line: none; > .item { text-decoration-inset: 2px; } }',
	],
	invalid: [
		...['2px', '-2px 4px', 'auto'].map(value => ({
			code: `a { text-decoration-line: none; text-decoration-inset: ${value}; }`,
			errors: [{messageId: 'no-ineffective-properties/decoration', data: {property: 'text-decoration-inset'}}],
		})),
		{
			code: 'a { text-decoration-line: underline; > .item { TEXT-DECORATION-LINE: /* disabled */ NONE; TEXT-DECORATION-INSET: 2px !important; } }',
			errors: [{messageId: 'no-ineffective-properties/decoration'}],
		},
	],
});

test({
	valid: [
		...['grid-gap', 'grid-row-gap', 'grid-column-gap'].flatMap(property => ['grid', 'table-cell', 'table-caption'].map(display => `a { display: ${display}; ${property}: 1rem; }`)),
		'a { display: flex; flex-flow: row nowrap; grid-gap: 1rem; grid-column-gap: 2rem; }',
		'a { display: inline-flex; flex-flow: column nowrap; grid-row-gap: 1rem; }',
		'a { display: flex; flex-flow: row wrap; grid-row-gap: 1rem; }',
		'a { display: flex; flex-wrap: nowrap; grid-row-gap: 1rem; }',
		'a { display: table; grid-gap: inherit; grid-row-gap: var(--gap); }',
		'a { display: var(--display); grid-gap: 1rem; }',
		'a { display: table; display: grid; grid-gap: 1rem; }',
	],
	invalid: [
		...['grid-gap', 'grid-row-gap', 'grid-column-gap'].flatMap(property => ['table', 'inline-table', 'block table', 'inline table'].map(display => ({
			code: `a { display: ${display}; ${property}: 1rem; }`,
			errors: [{messageId: 'no-ineffective-properties/table-gap', data: {property}}],
		}))),
		...['row', 'row-reverse', 'column', 'column-reverse'].map(direction => ({
			code: `a { display: flex; flex-flow: ${direction} nowrap; grid-${direction.startsWith('row') ? 'row' : 'column'}-gap: 1rem; }`,
			errors: [{messageId: 'no-ineffective-properties/flex-gap'}],
		})),
		{
			code: '@media (width > 1px) { a { DISPLAY: INLINE-TABLE; GRID-GAP: /* cells */ 1rem 2rem !important; } }',
			errors: [{messageId: 'no-ineffective-properties/table-gap', data: {property: 'grid-gap'}}],
		},
		{
			code: 'a { display: flex; flex-flow: row; row-gap: 1rem; grid-row-gap: 2rem; }',
			errors: [{messageId: 'no-ineffective-properties/flex-gap'}, {messageId: 'no-ineffective-properties/flex-gap'}],
		},
	],
});

const timelineTriggerProperties = [
	['timeline-trigger-source', 'view()'],
	['timeline-trigger-activation-range', '10% 80%'],
	['timeline-trigger-activation-range-start', 'entry 10%'],
	['timeline-trigger-activation-range-end', 'exit 80%'],
	['timeline-trigger-active-range', '0% 100%'],
	['timeline-trigger-active-range-start', 'entry 0%'],
	['timeline-trigger-active-range-end', 'exit 100%'],
	['timeline-trigger-range', 'entry 10% exit 80% / entry 0% exit 100%'],
];
const timelineTriggerRangeProperties = timelineTriggerProperties.slice(1);

test({
	valid: [
		...timelineTriggerRangeProperties.map(([property, value]) => `a { timeline-trigger-source: view(); ${property}: ${value}; }`),
		'a { timeline-trigger-source: none; timeline-trigger-name: --reveal; trigger-scope: --reveal; }',
		...['inherit', 'var(--source)', 'none, view()'].map(source => `a { timeline-trigger-source: ${source}; timeline-trigger-active-range: 10% 80%; }`),
		'a { timeline-trigger-source: none; timeline-trigger-source: view(); timeline-trigger-active-range: 10% 80%; }',
		'a { timeline-trigger-source: none; timeline-trigger: --reveal view(); timeline-trigger-active-range: 10% 80%; }',
		'a { timeline-trigger: --reveal none; timeline-trigger-active-range: 10% 80%; }',
		'a { timeline-trigger-source: none; timeline-trigger-active-range: inherit; timeline-trigger-activation-range: var(--range); }',
		'a { timeline-trigger-source: none; > .item { timeline-trigger-active-range: 10% 80%; } }',
		'a { all: unset; timeline-trigger-source: none; timeline-trigger-active-range: 10% 80%; }',
		'@keyframes reveal { to { timeline-trigger-source: none; timeline-trigger-active-range: 10% 80%; } }',
		':export { timeline-trigger-source: none; timeline-trigger-active-range: 10% 80%; }',
	],
	invalid: [
		...timelineTriggerRangeProperties.map(([property, value]) => ({
			code: `a { timeline-trigger-name: --reveal; timeline-trigger-source: none; ${property}: ${value}; }`,
			errors: [{messageId: 'no-ineffective-properties/timeline-trigger-source', data: {property}}],
		})),
		{
			code: 'a { @supports (timeline-trigger-source: view()) { TIMELINE-TRIGGER-SOURCE: /* disabled */ NONE; TIMELINE-TRIGGER-ACTIVE-RANGE: 10% 80% !important; } }',
			errors: [{messageId: 'no-ineffective-properties/timeline-trigger-source'}],
		},
		{
			code: 'a { timeline-trigger-name: none; timeline-trigger-source: none; timeline-trigger-active-range: 10% 80%; }',
			errors: [{messageId: 'no-ineffective-properties/timeline-trigger'}, {messageId: 'no-ineffective-properties/timeline-trigger'}],
		},
	],
});

test({
	valid: [
		...timelineTriggerProperties.map(([property, value]) => `a { ${property}: ${value}; }`),
		...timelineTriggerProperties.map(([property, value]) => `a { timeline-trigger-name: --reveal; ${property}: ${value}; }`),
		...['timeline-trigger-name: --reveal', 'timeline-trigger: --reveal view()'].map(control => `a { timeline-trigger-name: none; ${control}; timeline-trigger-source: view(); }`),
		...['inherit', 'var(--name)', '--first, --second'].map(name => `a { timeline-trigger-name: ${name}; timeline-trigger-source: view(); }`),
		...timelineTriggerProperties.map(([property]) => `a { timeline-trigger-name: none; ${property}: inherit; }`),
		...timelineTriggerProperties.map(([property]) => `a { timeline-trigger-name: none; ${property}: var(--value); }`),
		'a { animation-name: none; timeline-trigger-name: --reveal; timeline-trigger-source: view(); }',
		'a { timeline-trigger-name: none; trigger-scope: --reveal; }',
		'a { all: unset; timeline-trigger-name: none; timeline-trigger-source: view(); }',
		'a { timeline-trigger-name: none; > .item { timeline-trigger-source: view(); } }',
		'@keyframes reveal { to { timeline-trigger-name: none; timeline-trigger-source: view(); } }',
		':export { timeline-trigger-name: none; timeline-trigger-source: view(); }',
	],
	invalid: [
		...timelineTriggerProperties.map(([property, value]) => ({
			code: `a { timeline-trigger-name: none; ${property}: ${value}; }`,
			errors: [{messageId: 'no-ineffective-properties/timeline-trigger', data: {property}}],
		})),
		{
			code: 'a { @supports (timeline-trigger-source: view()) { TIMELINE-TRIGGER-NAME: /* disabled */ NONE; TIMELINE-TRIGGER-ACTIVATION-RANGE: 10% 80% !important; } }',
			errors: [{messageId: 'no-ineffective-properties/timeline-trigger'}],
		},
		{
			code: 'a { timeline-trigger-name: none; animation-name: reveal; animation-trigger: --reveal play; timeline-trigger-source: --scroll; }',
			errors: [{messageId: 'no-ineffective-properties/timeline-trigger'}],
		},
	],
});

test({
	valid: [
		'a { display: flex; flex-flow: row balance; grid-row-gap: 1rem; }',
		...['balance', 'wrap balance', 'wrap-reverse balance'].map(wrapping => `a { display: flex; flex-direction: row; flex-wrap: ${wrapping}; align-content: center; row-gap: 1rem; }`),
		...[
			'balance',
			'row balance',
			'column balance',
			'balance row-reverse',
			'column-reverse wrap balance',
		].map(flow => `a { display: inline-flex; flex-flow: ${flow}; align-content: center; row-gap: 1rem; column-gap: 2rem; }`),
	],
	invalid: [],
});

test({
	valid: [
		'a { flex-line-count: 3; }',
		...['inline-flex', 'block flex', 'inline flex'].map(display => `a { display: ${display}; flex-wrap: wrap; flex-line-count: 3; }`),
		...['wrap', 'wrap-reverse', 'balance', 'wrap balance'].map(wrapping => `a { display: flex; flex-wrap: ${wrapping}; flex-line-count: 3; }`),
		'a { display: flex; flex-flow: column balance; flex-line-count: 3; }',
		'a { display: flex; flex-wrap: var(--wrap); flex-line-count: 3; }',
		'a { display: flex; flex-wrap: nowrap; flex-wrap: wrap; flex-line-count: 3; }',
		'a { display: flex; flex-flow: row; flex-wrap: wrap; flex-line-count: 3; }',
		'a { display: flex; flex-wrap: nowrap; -webkit-flex-wrap: wrap; flex-line-count: 3; }',
		'a { display: block; flex-line-count: var(--lines); }',
		'a { display: flex; flex-wrap: nowrap; flex-line-count: inherit; }',
		'a { all: unset; display: block; flex-line-count: 3; }',
		'a { display: var(--display); flex-line-count: 3; }',
		'a { display: block; display: flex; flex-line-count: 3; }',
	],
	invalid: [
		...['block', 'grid', 'inline-grid', 'table', 'inline'].map(display => ({
			code: `a { display: ${display}; flex-line-count: 3; }`,
			errors: [{messageId: 'no-ineffective-properties/display', data: {property: 'flex-line-count', display, layout: 'flex'}}],
		})),
		...['nowrap', 'row', 'column', 'row-reverse nowrap'].map(flow => ({
			code: `a { display: flex; flex-flow: ${flow}; flex-line-count: 3; }`,
			errors: [{messageId: 'no-ineffective-properties/flex-line-count'}],
		})),
		{
			code: '@supports (display: flex) { a { DISPLAY: INLINE-FLEX; FLEX-WRAP: /* lines */ NOWRAP; FLEX-LINE-COUNT: 3 !important; } }',
			errors: [{messageId: 'no-ineffective-properties/flex-line-count'}],
		},
	],
});
