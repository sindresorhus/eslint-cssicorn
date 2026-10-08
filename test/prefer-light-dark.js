import assert from 'node:assert/strict';
import {test as nodeTest} from 'node:test';
import {parse} from '@eslint/css-tree';
import css from '@eslint/css';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);
const root = ':root { color-scheme: light dark; } ';
const pair = (base, override, mode = 'dark') => root + 'a { ' + base + ' } @media (prefers-color-scheme: ' + mode + ') { a { ' + override + ' } }';

test.snapshot({
	valid: [
		'a { color: white; } @media (prefers-color-scheme: dark) { a { color: black; } }',
		...['normal', 'light', 'dark', 'only light', 'var(--scheme)', 'light dark custom'].map(scheme => 'a { color-scheme: ' + scheme + '; color: white; @media (prefers-color-scheme: dark) { color: black; } }'),
		...[
			['red', '#ff0000'],
			['ReD', '#f00'],
			['white', 'rgb(255 255 255)'],
			['black', 'rgba(0%, 0%, 0%, 100%)'],
			['#abcd', '#aabbccdd'],
			['transparent', '#0000'],
			['gray', 'grey'],
			['rebeccapurple', '#663399'],
			['rgb(100% 0% 0%)', 'rgba(255, 0, 0, 1)'],
			['rgb(0 0 0 / 50%)', 'rgba(0, 0, 0, .5)'],
			['rgb(300 -10 0 / 2)', 'red'],
			['hsl(0 0% 0%)', 'hsla(0 0% 0%)'],
			['color(xyz 0 0 0)', 'color(xyz-d65 0 0 0)'],
		].map(([first, second]) => pair('color: ' + first + ';', 'color: ' + second + ';')),
		...['var(--color)', 'currentColor', 'Canvas', 'inherit', 'light-dark(red, blue)', 'color-mix(in srgb, red, blue)', 'rgb(from red r g b)', 'rgb(calc(1 + 2) 0 0)', 'color(--profile 0 0 0)'].map(value => pair('color: white;', 'color: ' + value + ';')),
		...[
			['--Color: white;', '--color: black;'],
			[String.raw`c\5c 00006flor: white;`, 'color: black;'],
			[String.raw`--color: r\5c 000065d;`, '--color: blue;'],
			['column-rule: 1px solid white; -webkit-column-rule-color: red;', 'column-rule: 1px solid black;'],
			['-webkit-text-stroke: 1px white; -webkit-text-stroke-color: red;', '-webkit-text-stroke: 1px black;'],
			['border-color: white;', 'border-color: black; -webkit-border-top-color: red;'],
			[String.raw`\2d -Color: white;`, '--color: black;'],
			['border-image: linear-gradient(white, red); border: 1px solid white;', 'border: 1px solid black;'],
			['color: white;', 'color: black; color: blue; color: red;'],
			['color: white;', 'color-scheme: var(--scheme); color: black;'],
			['--color: white blue;', '--color: black red;'],
			['color: white;', 'color: black !important;'],
			['color: white; color: red;', 'color: black;'],
			['color: white;', 'color: black; COLOR: blue;'],
			['border: 1px solid white; border-color: red;', 'border: 1px solid black;'],
			['background: white;', 'background: black; background-color: red;'],
			['border-left-color: white;', 'border-left-color: black; border-inline-color: red;'],
			['all: initial; color: white;', 'color: black;'],
			['all: initial; --color: white;', '--color: black;'],
			['--color: white;', 'all: initial; --color: black;'],
			['color: white;', 'all: unset; color: black;'],
			['color-scheme: light; color: white;', 'color: black;'],
			['color: white;', 'color-scheme: dark; color: black;'],
			['color-scheme: light dark; color-scheme: light dark; color: white;', 'color: black;'],
			['border: 1px solid white;', 'border: 2px solid black;'],
			['background: linear-gradient(white, red);', 'background: linear-gradient(black, blue);'],
			['font-family: red;', 'font-family: blue;'],
			['content: "red";', 'content: "blue";'],
			['background-image: url(red);', 'background-image: url(blue);'],
		].map(([base, override]) => pair(base, override)),
		root + 'a { color: white; } b {} @media (prefers-color-scheme: dark) { a { color: black; } }',
		root + 'a { color: white; } @media (prefers-color-scheme: dark) { b { color: black; } }',
		root + 'a,b { color: white; } @media (prefers-color-scheme: dark) { b,a { color: black; } }',
		root + 'a { color: white; } @media (prefers-color-scheme: dark) { a { color: black; } b {} }',
		root + '@media (prefers-color-scheme: light) { a { color: white; } } @media (prefers-color-scheme: dark) { a { color: black; } }',
		...['screen and (prefers-color-scheme: dark)', 'not (prefers-color-scheme: dark)', '(prefers-color-scheme: dark) and (width > 1px)', '(prefers-color-scheme: dark), (prefers-color-scheme: light)'].map(query => root + 'a { color: white; } @media ' + query + ' { a { color: black; } }'),
		root + 'a { color: white; @media (prefers-color-scheme: dark) { & { color: black; } } }',
		root + 'a { color: white; @media (prefers-color-scheme: dark) { color: black; } margin: 0; }',
		root + 'a { color: white; b {} @media (prefers-color-scheme: dark) { color: black; } }',
		'@media (width > 1px) { ' + root + '} a { color: white; @media (prefers-color-scheme: dark) { color: black; } }',
		'body { color-scheme: light dark; } a { color: white; @media (prefers-color-scheme: dark) { color: black; } }',
		':root,html { color-scheme: light dark; } a { color: white; @media (prefers-color-scheme: dark) { color: black; } }',
		root + ':root { color-scheme: light; } a { color: white; @media (prefers-color-scheme: dark) { color: black; } }',
		root + ':export { color: white; } @media (prefers-color-scheme: dark) { :export { color: black; } }',
		root + '@keyframes foo { from { color: white; @media (prefers-color-scheme: dark) { color: black; } } }',
	],
	invalid: [
		pair('color: white;', 'color: black;'),
		pair('color: black;', 'color: white;', 'light'),
		'a { color-scheme: light dark; color: white; @media (prefers-color-scheme: dark) { color: black; } }',
		'a { color-scheme: only dark light; border: 1px solid black; @media (prefers-color-scheme: light) { border: 1px solid white; } }',
		pair('color: white; background-color: red;', 'color: black; padding: 0;'),
		pair('--Color: white;', '--Color: black;'),
		pair(String.raw`\2d -Color: white;`, '--Color: black;'),
		pair('color: white; background-color: red;', 'color: black; background-color: blue;'),
		pair('border-color: white #f00;', 'border-color: black red;'),
		pair(String.raw`color: r\67 b(255 0 0);`, 'color: blue;'),
		pair('color: white;', 'color-scheme: dark light; color: black;'),
		'HTML { COLOR-SCHEME: LIGHT DARK ONLY; } a,b { color: white; } @MEDIA (PREFERS-COLOR-SCHEME: DARK) { a, b { color: black; } }',
		String.raw`:r\6f ot { c\6f lor-scheme: l\69 ght dark; } a { color: white; } @media (prefers-color-\73 cheme: d\61 rk) { a { color: black; } }`,
		root + 'a {\n\tcolor: white;\n\t@media (prefers-color-scheme: dark) {\n\t\tcolor: black;\n\t}\n}',
		pair('border-color: white red blue yellow;', 'border-color: black red green purple;'),
		pair('background: url(foo.png) center/cover white;', 'background: url(foo.png) center/cover black;'),
		pair('box-shadow: 0 1px white, 0 2px red;', 'box-shadow: 0 1px black, 0 2px blue;'),
		pair('COLOR: WHITE !important;', 'color: BLACK !IMPORTANT;'),
		pair(String.raw`c\6f lor: r\65 d;`, String.raw`color: b\6c ue;`),
		pair('color: RGB(255 0 0 / .5);', 'color: rgb(0 0 0 / 50%);'),
		pair('color: rgb(1 0 0);', 'color: rgb(1.00001 0 0);'),
		...['hsl(20deg 30% 40%)', 'hwb(20 30% 40%)', 'lab(30% 20 40)', 'lch(30% 20 40)', 'oklab(30% .2 .4)', 'oklch(30% .2 40)', 'color(display-p3 1 0 0)'].map(value => pair('color: ' + value + ';', 'color: black;')),
		...['media (width > 1px)', 'supports (display: grid)', 'container (width > 1px)', 'layer theme', 'scope (.card)'].map(condition => root + '@' + condition + ' { a { color: white; } @media (prefers-color-scheme: dark) { a { color: black; } } }'),
		'@layer theme { html { color-scheme: dark light only; } } a { color: white; @media (prefers-color-scheme: dark) { color: black; } }',
		'a { color: white; @media (prefers-color-scheme: dark) { color: black; } } ' + root,
		root + '.parent { a { color: white; } @media (prefers-color-scheme: dark) { a { color: black; } } }',
		pair('color: /* light */ white;', 'color: black;'),
		pair('color: white;', 'color: black /* dark */;'),
		root + 'a { color: white; } @media (prefers-color-scheme: dark) { /* keep */ a { color: black; } }',
		root + 'a { color: white; } @media (prefers-color-scheme: dark) { a { /* keep */ color: black; } }',
		':root { color-scheme: light dark; }\r\na {\r\n  border: 1px solid white;\r\n  @media (prefers-color-scheme: dark) {\r\n    border: 1px solid black;\r\n    padding: 0;\r\n  }\r\n}',
		root + 'a { color: white } @media (prefers-color-scheme: dark) { a { color: black } }',
	],
});

const configuration = rules => ({
	files: ['**'], language: 'css/css', plugins: {css, cssicorn: plugin}, rules,
});

nodeTest('suggestions parse, preserve unrelated declarations, and never autofix', () => {
	const linter = new Linter();
	const code = pair('color: white; margin: 0;', 'color: black; padding: 0;');
	const config = configuration({'cssicorn/prefer-light-dark': 'error'});
	assert.equal(linter.verifyAndFix(code, config, {filename: 'test.css'}).output, code);
	const [message] = linter.verify(code, config, {filename: 'test.css'});
	const [{fix}] = message.suggestions;
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	assert.equal(output, root + 'a { color: light-dark(white, black); margin: 0; } @media (prefers-color-scheme: dark) { a {  padding: 0; } }');
	parse(output);
	assert.deepEqual(linter.verify(output, config, {filename: 'test.css'}), []);
});

nodeTest('prefer-nesting output remains recognizable', () => {
	const linter = new Linter();
	const {output} = linter.verifyAndFix(pair('color: white;', 'color: black;'), configuration({'cssicorn/prefer-nesting': 'error'}), {filename: 'test.css'});
	const messages = linter.verify(output, configuration({'cssicorn/prefer-light-dark': 'error'}), {filename: 'test.css'});
	assert.equal(messages.length, 1);
	assert.equal(messages[0].suggestions.length, 1);
});

nodeTest('suggestions preserve CRLF, indentation, and comments outside paired declarations', () => {
	const linter = new Linter();
	const code = ':root { color-scheme: light dark; }\r\na {\r\n  color: white;\r\n  @media (prefers-color-scheme: dark) {\r\n    /* keep */\r\n    color: black;\r\n  }\r\n}';
	const [message] = linter.verify(code, configuration({'cssicorn/prefer-light-dark': 'error'}), {filename: 'test.css'});
	const [{fix}] = message.suggestions;
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	assert.equal(output, code.replace('color: white;', 'color: light-dark(white, black);').replace('color: black;', ''));
});

nodeTest('recommended and all enable the rule, unopinionated excludes it', () => {
	assert.equal(plugin.configs.recommended.rules['cssicorn/prefer-light-dark'], 'error');
	assert.equal(plugin.configs.all.rules['cssicorn/prefer-light-dark'], 'error');
	assert.equal(plugin.configs.unopinionated.rules['cssicorn/prefer-light-dark'], 'off');
});
