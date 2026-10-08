import assert from 'node:assert/strict';
import test from 'node:test';
import css from '@eslint/css';
import {lexer, parse, walk} from '@eslint/css-tree';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {normalizeCssIdentifier} from '../rules/utils/index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);
const conversions = [
	['translate(10px)', 'translate: 10px'],
	['translate(-50%, 2rem)', 'translate: -50% 2rem'],
	['translateX(10px)', 'translate: 10px'],
	['translateY(-2px)', 'translate: 0 -2px'],
	['translateZ(30px)', 'translate: 0 0 30px'],
	['translate3d(10px, 20%, 30px)', 'translate: 10px 20% 30px'],
	['rotate(45deg)', 'rotate: 45deg'],
	['rotateX(.25turn)', 'rotate: x .25turn'],
	['rotateY(-1rad)', 'rotate: y -1rad'],
	['rotateZ(100grad)', 'rotate: 100grad'],
	['rotate3d(1, -2, 3, 45deg)', 'rotate: 1 -2 3 45deg'],
	['rotate3d(0, 0, 0, 45deg)', 'rotate: 0 0 0 45deg'],
	['scale(1.05)', 'scale: 1.05'],
	['scale(-1, 2)', 'scale: -1 2'],
	['scale(50%, 200%)', 'scale: 50% 200%'],
	['scaleX(2)', 'scale: 2 1'],
	['scaleY(2)', 'scale: 1 2'],
	['scaleZ(2)', 'scale: 1 1 2'],
	['scaleZ(50%)', 'scale: 1 1 50%'],
	['scale3d(2, 3, 4)', 'scale: 2 3 4'],
	['translate3d(0, 0, 0)', 'translate: 0 0 0'],
	['scale3d(1, 1, 1)', 'scale: 1 1 1'],
	['translate(10px) rotate(45deg)', 'translate: 10px; rotate: 45deg'],
	['translate(10px) scale(2)', 'translate: 10px; scale: 2'],
	['rotate(45deg) scale(2)', 'rotate: 45deg; scale: 2'],
	['translate(10px, 20px) rotate(45deg) scale(2, 3)', 'translate: 10px 20px; rotate: 45deg; scale: 2 3'],
	['translateZ(30px) rotateX(45deg) scale3d(2, 3, 4)', 'translate: 0 0 30px; rotate: x 45deg; scale: 2 3 4'],
	['translate(0)rotate(0deg)scale(1)', 'translate: 0; rotate: 0deg; scale: 1'],
	['translate(calc(1px + 2px), min(10%, 20%))', 'translate: calc(1px + 2px) min(10%, 20%)'],
	['translate3d(calc(1px + 2px), max(10%, 20%), 0)', 'translate: calc(1px + 2px) max(10%, 20%) 0'],
	['rotate(calc(1turn / 2))', 'rotate: calc(1turn / 2)'],
	['rotate3d(calc(1 + 2), 0, 1, min(45deg, 90deg))', 'rotate: calc(1 + 2) 0 1 min(45deg, 90deg)'],
	['scale(clamp(1, 2, 3), calc(1 + 2))', 'scale: clamp(1, 2, 3) calc(1 + 2)'],
	['TRANSLATEY(-2PX) ROTATEZ(45DEG) SCALE(2)', 'translate: 0 -2PX; rotate: 45DEG; scale: 2'],
	[String.raw`tr\61 nslateX(1p\78) r\6f tate(45d\65 g)`, String.raw`translate: 1p\78; rotate: 45d\65 g`],
	[String.raw`translate(1p\78, 2px)`, String.raw`translate: 1p\78  2px`],
	[String.raw`translate(1p\000078, 2px)`, String.raw`translate: 1p\000078  2px`],
	[String.raw`translate(1p\78 , 2px)`, String.raw`translate: 1p\78  2px`],
	[String.raw`translate3d(1p\78, 2p\78, 3px)`, String.raw`translate: 1p\78  2p\78  3px`],
	[String.raw`scale(c\61 lc(1 + 1))`, String.raw`scale: c\61 lc(1 + 1)`],
	...['0', '-0', '+0', '.0', '0.00', '0e10', '-0E-2'].map(angle => [`rotate(${angle})`, `rotate: ${angle}deg`]),
	['rotateX(0)', 'rotate: x 0deg'],
	['rotateY(0)', 'rotate: y 0deg'],
	['rotateZ(0)', 'rotate: 0deg'],
	['rotate3d(1, 0, 0, -0)', 'rotate: 1 0 0 -0deg'],
];

ruleTest({
	valid: [
		'a { translate: 0 -2px; rotate: 45deg; scale: 1.05; }',
		...[
			'none',
			'initial',
			'inherit',
			'unset',
			'revert',
			'revert-layer',
			'matrix(1, 0, 0, 1, 0, 0)',
			'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)',
			'skew(10deg)',
			'skewX(10deg)',
			'perspective(100px)',
			'scale(2) translateX(10px)',
			'rotate(45deg) translateY(10px)',
			'scale(2) rotate(45deg)',
			'translateX(10px) translateY(20px)',
			'rotateX(45deg) rotateY(45deg)',
			'scaleX(2) scaleY(3)',
			'translate(10px) skew(45deg) scale(2)',
			'var(--transform)',
			'translate(var(--position))',
			'translateX(var(--x, 10px))',
			'rotate(calc(var(--angle) + 45deg))',
			'translate(10px) rotate(calc(var(--angle) + 45deg)) scale(2)',
			'scale(env(safe-area-inset-top))',
			'scale(attr(data-scale))',
			'scale(random(1, 2))',
			'scale(calc(random(1, 2)))',
			String.raw`translate(10px) scale(calc(r\61 ndom(1, 2)))`,
			'scale(--factor())',
			'translate()',
			'translate(10px 20px)',
			'translate(10px,)',
			'translate(10px, 20px, 30px)',
			'translateX(10px, 20px)',
			'translate3d(1px, 2px, 30%)',
			'rotate(2)',
			'rotate(1e-999)',
			'rotate(45px)',
			'rotate3d(1, 2, 3)',
			'scale()',
			'scale(1 2)',
			'scale(1, 2, 3)',
			'scaleX(1, 2)',
			'scale3d(1, 2)',
			'scale(2px)',
		].map(value => `a { transform: ${value}; }`),
		'a { --transform: translateX(10px); }',
		'a { -webkit-transform: translateX(10px); }',
		'a { content: "transform: scale(2)"; background: url("scale(2)"); }',
		...[
			'transform: scale(2)',
			'-webkit-transform: scale(2)',
			'-moz-transform: scale(2)',
			'-WEBKIT-TRANSFORM: scale(2)',
			'translate: none',
			'rotate: 45deg',
			'scale: 1',
			'offset: path("M0 0L10 10")',
			'offset-path: none',
			String.raw`r\6f tate: 45deg`,
			'TRANSLATE: 10px',
		].flatMap(declaration => [`a { transform: translateX(10px); ${declaration}; }`, `a { ${declaration}; transform: translateX(10px); }`]),
		'@supports (transform: scale(2)) { a { color: red; } }',
		'@container style(transform: scale(2)) { a { color: red; } }',
		'@font-face { transform: scale(2); }',
		'@property --scale { syntax: "*"; inherits: false; initial-value: scale(2); }',
		'@keyframes zoom { from { transform: scale(1); } to { transform: scale(2); } }',
		'@-webkit-keyframes zoom { to { transform: scale(2); } }',
		String.raw`@\6b eyframes zoom { to { transform: scale(2); } }`,
		':export { transform: scale(2); }',
		':import("./theme.css") { transform: scale(2); }',
		{code: 'a { transform: #; }', languageOptions: {tolerant: true}},
	],
	invalid: conversions.map(([value, replacement]) => ({
		code: `a { transform: ${value}; }`,
		errors: [{messageId: 'prefer-individual-transform-properties/error', suggestions: [{messageId: 'prefer-individual-transform-properties/suggestion', output: `a { ${replacement}; }`}]}],
	})),
});

ruleTest({
	valid: [],
	invalid: [
		['a {transform:scale(2)}', 'a {scale:2}'],
		[String.raw`a { tr\61 nsform : scale(2) !\69 mportant; }`, String.raw`a { scale : 2 !\69 mportant; }`],
		['a { transform: translate(1px) rotate(45deg) scale(2) !IMPORTANT ; }', 'a { translate: 1px !IMPORTANT; rotate: 45deg !IMPORTANT; scale: 2 !IMPORTANT ; }'],
		['a {\n\ttransform: translate(1px) scale(2);\n}', 'a {\n\ttranslate: 1px;\n\tscale: 2;\n}'],
		['a {\r\n  transform: translate(1px) scale(2) !important\r\n}', 'a {\r\n  translate: 1px !important;\r\n  scale: 2 !important\r\n}'],
		['a {\n  transform:\n    translate(1px) scale(2);\n}', 'a {\n  translate:\n    1px;\n  scale:\n    2;\n}'],
		['a { /* before */ transform: scale(2); /* after */ }', 'a { /* before */ scale: 2; /* after */ }'],
		['a {\n  transform: translate(1px) scale(2) \t\n}', 'a {\n  translate: 1px;\n  scale: 2 \t\n}'],
	].map(([code, output]) => ({code, errors: [{messageId: 'prefer-individual-transform-properties/error', suggestions: [{messageId: 'prefer-individual-transform-properties/suggestion', output}]}]})),
});

ruleTest.snapshot({
	valid: [],
	invalid: [
		'a { transform: scale(/* keep */ 2); }',
		'a { transform: translate(1px) /* keep */ scale(2); }',
		'a { transform: /* keep */ scale(2); }',
		'a { transform: scale(2) /* keep */ !important; }',
		'a { transform /* keep */ : scale(2); }',
		'a { transform: scale(2) /* keep */; }',
		'a { &:hover { transform: scale(2); } }',
		'@media (width > 10px) { a { transform: scale(2); } }',
		'@supports (transform: scale(2)) { a { transform: scale(2); } }',
		'@container (width > 10px) { a { transform: scale(2); } }',
		'@layer buttons { a { transform: scale(2); } }',
		'@scope (.buttons) { a { transform: scale(2); } }',
		'a { @media (width > 10px) { transform: scale(2); } }',
		'a { translate: 1px; transform: scale(2); } b { transform: scale(3); }',
	],
});

const config = {
	files: ['**/*.css'],
	language: 'css/css',
	plugins: {css, cssicorn: plugin},
	rules: {'cssicorn/prefer-individual-transform-properties': 'error'},
};

test('suggestions replace whole declarations without automatic fixes', () => {
	const linter = new Linter();
	for (const [value] of conversions) {
		const code = `a { transform: ${value}; }`;
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.fixed, false);
		assert.equal(result.output, code);
		assert.equal(result.messages.length, 1);
		assert.equal(result.messages[0].suggestions.length, 1);
		const {range, text} = result.messages[0].suggestions[0].fix;
		const output = code.slice(0, range[0]) + text + code.slice(range[1]);
		assert.deepEqual(linter.verify(output, config, {filename: 'test.css'}), []);
		// Reparse the actual suggestion to catch token boundaries that change when removing function syntax.
		const stylesheet = parse(output);
		walk(stylesheet, {
			leave(node) {
				switch (node.type) {
					case 'Dimension': {
						node.unit = normalizeCssIdentifier(node.unit);

						break;
					}

					case 'Function':
					case 'Identifier': {
						node.name = normalizeCssIdentifier(node.name);

						break;
					}

					case 'Declaration': {
						assert.ok(lexer.matchProperty(node.property, node.value).matched, `${node.property} has a valid value after converting ${value}`);

						break;
					}
				// No default
				}
			},
		});
	}
});

test('suggestions work after lowercase and redundant function fixes', () => {
	const linter = new Linter();
	const result = linter.verifyAndFix('a { TRANSFORM: TRANSLATE(1PX, 0) SCALE(2, 2); }', {
		...config,
		rules: {...config.rules, 'cssicorn/lowercase': 'error', 'cssicorn/no-redundant-functions': 'error'},
	}, {filename: 'test.css'});
	assert.equal(result.output, 'a { transform: translate(1px ) scale(2 ); }');
	assert.equal(result.messages.length, 1);
	const {range, text} = result.messages[0].suggestions[0].fix;
	const output = result.output.slice(0, range[0]) + text + result.output.slice(range[1]);
	assert.equal(output, 'a { translate: 1px; scale: 2; }');
	assert.deepEqual(linter.verify(output, config, {filename: 'test.css'}), []);
});
