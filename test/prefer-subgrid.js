import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import css from '@eslint/css';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);
const columns = 'display: grid; grid-template-columns: 20ch 1fr;';
const childColumns = 'display: grid; grid-column: 1 / -1; grid-template-columns: 20ch 1fr;';
const getPair = (parent = columns, child = childColumns) => `.parent { ${parent} } .parent > .child { ${child} }`;
const childContextDeclarations = [
	['position: absolute;', 'position: relative;'],
	['contain: layout;', 'contain: none;'],
	['content-visibility: hidden;', 'content-visibility: visible;'],
	['container: card / inline-size;', 'container: none;'],
	['container-type: inline-size;', 'container-type: normal;'],
];

test.snapshot({
	valid: [
		'a { color: red; }',
		getPair('', childColumns),
		getPair(columns, 'grid-column: 1 / -1; grid-template-columns: 20ch 1fr;'),
		getPair(columns, childColumns.replace('20ch', '30ch')),
		...['1 / 3', 'span 2'].map(placement => getPair(columns, childColumns.replace('1 / -1', () => placement))),
		getPair(columns, childColumns.replace('grid-column: 1 / -1;', '')),
		...[
			'.parent .child',
			'.parent + .child',
			'.parent > .child::before',
			'.parent > .child:before',
			'.other > .child',
			'.parent > .child, .other',
		].map(selector => getPair().replace('.parent > .child', () => selector)),
		getPair().replace('.parent {', '.parent, .other {'),
		...['.child', '&.child', '> .wrapper > .child'].map(selector => `.parent { ${columns} ${selector} { ${childColumns} } }`),
		...['.parent > &', '.parent > :is(&)'].map(selector => `.ancestor { .parent { ${columns} } ${selector} { ${childColumns} } }`),
		`.parent { ${columns} & > :is(&) { ${childColumns} } }`,
		`.parent { ${columns} @media (width > 1px) { > .child { ${childColumns} } } }`,
		`${getPair()} .parent { color: red; }`,
		`${getPair()} .parent { ${columns} } .parent { ${columns} }`,
		`@media (width > 1px) { .parent { ${columns} } } @media (width > 1px) { .parent > .child { ${childColumns} } }`,
		`.parent { ${columns} } @layer other { .parent > .child { ${childColumns} } }`,
		...['none', 'flex', 'contents', 'var(--display)'].map(display => getPair(columns.replace('display: grid', () => `display: ${display}`))),
		...[
			'none',
			'subgrid',
			'inherit',
			'initial',
			'revert',
			'masonry',
			'var(--tracks)',
			'repeat(auto-fit, minmax(10rem, 1fr))',
			'repeat(auto-fill, 10rem)',
			'random() 1fr',
			'20unknown 1fr',
		].map(value => getPair(`display: grid; grid-template-columns: ${value};`, `display: grid; grid-column: 1 / -1; grid-template-columns: ${value};`)),
		...[
			'all: initial;',
			'grid: none;',
			'grid-template: none;',
			'grid-template-areas: "a b";',
			'writing-mode: horizontal-tb;',
			'display: grid;',
			'grid-template-columns: 20ch 1fr;',
		].flatMap(declaration => [
			getPair(`${columns} ${declaration}`),
			getPair(columns, `${childColumns} ${declaration}`),
		]),
		...[
			'grid-column: 1 / -1;',
			'grid-column-start: 1;',
			'grid-column-end: -1;',
			'grid-area: 1 / 1 / -1 / -1;',
		].map(declaration => getPair(columns, `${childColumns} ${declaration}`)),
		...childContextDeclarations.flatMap(declarations => declarations.map(declaration => getPair(columns, `${childColumns} ${declaration}`))),
		getPair(columns, childColumns.replace('grid-column: 1 / -1;', 'grid-column-start: 1;')),
		getPair(columns, childColumns.replace('grid-column: 1 / -1;', 'grid-column-start: 1; grid-column-end: -1; grid-column-end: -1;')),
		getPair('display: grid; grid-template-columns: [Start] 20ch 1fr;', 'display: grid; grid-column: 1 / -1; grid-template-columns: [start] 20ch 1fr;'),
		getPair('display: grid; grid-template-columns: repeat(2, [Start] minmax(0, 1fr));', 'display: grid; grid-column: 1 / -1; grid-template-columns: repeat(2, [start] minmax(0, 1fr));'),
		getPair(
			'display: grid; grid-template-columns: calc(container-progress(width of Main, 10px, 100px) * 10px) 1fr;',
			'display: grid; grid-column: 1 / -1; grid-template-columns: calc(container-progress(width of main, 10px, 100px) * 10px) 1fr;',
		),
		getPair('display: grid; grid-template-columns: calc(unknown(10px)) 1fr;', 'display: grid; grid-column: 1 / -1; grid-template-columns: calc(unknown(10px)) 1fr;'),
		getPair(columns, childColumns.replace('1fr', '1.0fr')),
		...[
			'(grid-template-columns: subgrid)',
			'not (grid-template-rows: subgrid)',
			'(display: grid) and (grid-template-columns: subgrid)',
		].map(condition => `@supports ${condition} { ${getPair()} }`),
		`@font-face { ${columns} } .parent > .child { ${childColumns} }`,
		`@keyframes example { from { ${columns} } to { ${childColumns} } }`,
		`:export { ${columns} > .child { ${childColumns} } }`,
		`:import("tokens.css") { ${columns} > .child { ${childColumns} } }`,
	],
	invalid: [
		getPair(),
		`.parent > .child { ${childColumns} } .parent { ${columns} }`,
		...['> .child', '& > .child'].map(selector => `.parent { ${columns} ${selector} { ${childColumns} } }`),
		`.page .parent { ${columns} } .page .parent > [data-child] { ${childColumns} }`,
		getPair().replaceAll('.parent', String.raw`.grid\:parent`),
		getPair().replaceAll('columns', 'rows').replaceAll('grid-column:', 'grid-row:'),
		getPair(`${columns} grid-template-rows: 100px 1fr;`, `${childColumns} grid-row: 1 / -1; grid-template-rows: 100px 1fr;`),
		getPair(columns, childColumns.replace('grid-column: 1 / -1;', 'grid-column-start: 1; grid-column-end: -1;')),
		...['inline-grid', 'block grid', 'inline grid'].map(display => getPair().replaceAll('display: grid', () => `display: ${display}`)),
		...['grid block', 'grid inline'].flatMap(display => [
			getPair(columns.replace('display: grid', () => `display: ${display}`)),
			getPair(columns, childColumns.replace('display: grid', () => `display: ${display}`)),
		]),
		...[
			'[start] 20ch [middle] 1fr [end]',
			'repeat(3, minmax(0, 1fr))',
			'fit-content(30ch) 2fr',
			'calc(10px + 2rem) 1fr',
			'min(20ch, 30rem) max(0px, 1rem)',
			'repeat(2, [Start] minmax(0, 1fr))',
			'1fr',
		].map(value => getPair(`display: grid; grid-template-columns: ${value};`, `display: grid; grid-column: 1 / -1; grid-template-columns: ${value};`)),
		getPair('DISPLAY: GRID; GRID-TEMPLATE-COLUMNS: MINMAX(0, 1FR) 20CH;', 'display: grid; grid-column: 1 / -1; grid-template-columns: minmax(0, 1fr) 20ch;'),
		getPair(String.raw`display: grid; grid-template-columns: [\73 tart] 20ch 1fr;`, 'display: grid; grid-column: 1 / -1; grid-template-columns: [start] 20ch 1fr;'),
		getPair(`${columns} grid-template-rows: 100px 1fr;`, `${childColumns.replace('20ch', '30ch')} grid-row: 1 / -1; grid-template-rows: 100px 1fr;`),
		getPair(`${columns} column-gap: 1rem;`, `${childColumns} column-gap: 2rem; width: 10rem; padding: 1rem;`),
		getPair(columns, childColumns.replace('1fr;', '1fr !important;')),
		getPair(columns.replace('20ch 1fr', '20ch /* parent */ 1fr')),
		getPair(columns, childColumns.replace('20ch 1fr', '20ch /* keep */ 1fr')),
		...['media (width > 1px)', 'supports (display: grid)', 'container (width > 1px)', 'layer example', 'scope (.example)'].map(wrapper => `@${wrapper} { ${getPair()} }`),
		'.parent {\r\n  display: grid;\r\n  grid-template-columns: 20ch 1fr;\r\n}\r\n.parent > .child {\r\n  display: grid;\r\n  grid-column: 1 / -1;\r\n  grid-template-columns: 20ch 1fr;\r\n}',
		getPair('display: grid; grid-template-columns: AUTO minmax(MIN-CONTENT, MAX-CONTENT);', 'display: grid; grid-column: 1 / -1; grid-template-columns: auto minmax(min-content, max-content);'),
		getPair(String.raw`display: grid; grid-template-columns: [A\:B] \6d inmax(0, 1\66 r);`, String.raw`display: grid; grid-column: 1 / -1; grid-template-columns: [A\:B] minmax(0, 1fr);`),
		`.parent { ${columns} > .child { ${childColumns} > .grandchild { ${childColumns} } } }`,
		`.wrapper { ${getPair()} }`,
		getPair().replace('.parent > .child', '.parent > .child[data-kind]:not(.disabled)'),
		...childContextDeclarations.map(([declaration]) => getPair(`${columns} ${declaration}`)),
		getPair().replaceAll('grid-template-columns', 'GRID-TEMPLATE-COLUMNS'),
	],
});

nodeTest('suggestions preserve surrounding comments and resolve each reported axis', () => {
	const linter = new Linter();
	const config = {
		files: ['**/*.css'],
		plugins: {css, cssicorn: plugin},
		language: 'css/css',
		rules: {'cssicorn/prefer-subgrid': 'error'},
	};
	const cases = [
		...[
			['20ch 1fr !important', 'subgrid !important'],
			['/* before */ 20ch 1fr', '/* before */ subgrid'],
			['20ch 1fr /* after */', 'subgrid /* after */'],
			['20ch 1fr /* after */ !important', 'subgrid /* after */ !important'],
		].map(([value, replacement]) => ({
			code: getPair(columns, childColumns.replace('20ch 1fr', () => value)),
			expected: getPair(columns, childColumns.replace('20ch 1fr', () => replacement)),
			errors: 1,
		})),
		{
			code: getPair(`${columns} grid-template-rows: 100px 1fr;`, `${childColumns} grid-row: 1 / -1; grid-template-rows: 100px 1fr;`),
			expected: getPair(`${columns} grid-template-rows: 100px 1fr;`, 'display: grid; grid-column: 1 / -1; grid-template-columns: subgrid; grid-row: 1 / -1; grid-template-rows: subgrid;'),
			errors: 2,
		},
	];
	for (const {code, expected, errors} of cases) {
		const messages = linter.verify(code, config, {filename: 'test.css'});
		assert.equal(messages.length, errors);
		const fixes = messages.map(message => {
			assert.equal(message.messageId, 'prefer-subgrid');
			assert.equal(message.fix, undefined);
			assert.equal(message.suggestions.length, 1);
			return message.suggestions[0].fix;
		});
		let output = code;
		for (const fix of fixes.toSorted((first, second) => second.range[0] - first.range[0])) {
			output = output.slice(0, fix.range[0]) + fix.text + output.slice(fix.range[1]);
		}

		assert.equal(output, expected);
		assert.deepEqual(linter.verify(output, config, {filename: 'test.css'}), []);
	}
});
