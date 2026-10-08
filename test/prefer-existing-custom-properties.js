import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import css from '@eslint/css';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const customProperties = {
	'--brand-color': '#6750a4',
	'--space-small': '8px',
	'--radius-medium': '12px',
	'--duration-fast': '200ms',
	'--shadow-card': '0 2px 8px #0003',
};
const options = [{customProperties}];

test.snapshot({
	valid: [
		'a { color: #6750a4; margin: 8px; }',
		{code: 'a { color: #6750a4; }', options: [{customProperties: {}}]},
	],
	invalid: [],
});

test.snapshot({
	valid: [
		'a { color: #6750a5; margin: 9px; }',
		'a { color: var(--brand-color); }',
		':root { --other: #6750a4; }',
		'@property --other { syntax: "<color>"; inherits: true; initial-value: #6750a4; }',
		'@font-face { ascent-override: 8px; }',
		'@supports (color: #6750a4) {}',
		'@container style(color: #6750a4) {}',
		'@media (width: 8px) {}',
		':export { color: #6750a4; }',
		':import("./tokens.css") { spacing: 8px; }',
		'a { content: "#6750a4 8px"; background: url(#6750a4); }',
		'a { background: element(#6750a4); }',
		'a { background: -moz-element(#6750a4); }',
		'a { color: var(--other, #6750a4); width: env(foo, 8px); }',
		'a { width: attr(data-width, 8px); }',
		'a { width: random(8px, 12px); }',
		'a { width: --custom(8px); }',
		'a { color: rgb(8 12 0); filter: contrast-color(rgb(8 12 0)); }',
		'a { margin: 8em; animation-duration: 201ms; }',
	].map(code => ({code, options})),
	invalid: [
		':root { --brand-color: #6750a4; } .button { background: #6750a4; }',
		'a { color: #6750A4 !important; margin: +08.0PX; border-radius: 12px; transition-duration: .2s; }',
		'a { box-shadow: 0 2px 8px #0003; }',
		'a { box-shadow: +0 2.0PX 8px rgba(0 0 0 / .2); }',
		'a { border: 8px solid #6750a4; margin: 8px 12px; }',
		'a { background: linear-gradient(#6750a4, black); }',
		'a { width: calc(100% - 8px); filter: blur(8px); }',
		'a { border: var(--width) solid #6750a4; margin: var(--gap) 8px; }',
		'a { margin: 8px /* gap */ 8px; }',
		'a { color: /* before */ #6750a4 /* after */ !important; }',
		'a { & .b { color: #6750a4; } @media (width > 1px) { margin: 8px; } }',
		'@media screen { @supports (display: grid) { @container (width > 1px) { @layer theme { @scope (.card) { a { margin: 8px; } } } } } }',
		'@keyframes fade { from { color: #6750a4; } }',
		'@-webkit-keyframes fade { from { color: #6750a4; } }',
		'a { -webkit-transition: opacity 200ms; }',
		String.raw`a { c\6f lor: #6750\61 4; margin: 8p\78; }`,
		'a {\r\n  color: #6750a4;\r\n}',
	].map(code => ({code, options})),
});

const withTokens = (code, customProperties) => ({code, options: [{customProperties}]});

test.snapshot({
	valid: [
		withTokens('a { color: #fff; }', {'--first': '#fff', '--second': 'rgb(255 255 255)'}),
		withTokens('a { margin: 8px 12px; }', {'--first': '8px 12px', '--second': '8.0PX 12px', '--single': '8px'}),
		withTokens('a { color: #0008; }', {'--black': 'rgba(0 0 0 / .5)'}),
		withTokens('a { color: rgb(128 0 255); }', {'--color': 'rgb(50% 0 100%)'}),
		withTokens('a { color: red; }', {'--color': '#f00'}),
		withTokens('a { color: #fff; }', {'--color': 'hsl(0 0% 100%)'}),
		withTokens('a { width: 0; }', {'--zero': '0px'}),
		withTokens('a { margin: 8px; }', {'--space': '0.5rem'}),
		withTokens('a { z-index: 1; }', {'--index': '1.0'}),
		withTokens('a { animation-timing-function: steps(2, end); }', {'--easing': 'steps(2.0, end)'}),
		withTokens('a { animation-name: Example; }', {'--name': 'example'}),
		withTokens('a { font-family: example\u00a0; }', {'--name': 'example'}),
		withTokens('a { width: calc(1px +/**/2px); }', {'--width': 'calc(1px + 2px)'}),
		withTokens('a { font-family: 1/**/px; }', {'--space': '1px'}),
		withTokens('a { border: 1px solid red; }', {'--border': '1px solid'}),
		withTokens('a { font-family: example, serif; opacity: calc(.5 * 1); }', {'--name': 'example', '--half': '.5'}),
		withTokens('a { color: hsl(0 50% 50%); }', {'--half': '50%'}),
		withTokens('a { color: color-mix(in srgb, red 50%, blue); }', {'--half': '50%'}),
		withTokens('a { color: light-dark(rgb(0 0 0), rgb(255 255 255)); }', {'--black': '#000'}),
		withTokens('a { color: rgb(50%, 0, 100%); }', {'--color': 'rgb(50% 0 100%)'}),
		withTokens('a { color: rgb(300 0 0); }', {'--color': '#f00'}),
		withTokens('a { color: rgb(none 0 0); }', {'--color': '#000'}),
		withTokens('a { color: #010203; }', {'--color': 'rgb(1+2+3)'}),
		withTokens('a { color: #fff; }', {'--color': 'rgb(100%100%100%)'}),
		withTokens('a { color: #010203; }', {'--color': 'rgb(1/* */+2/* */+3)'}),
		withTokens('a { box-shadow: 0 /* keep */ 2px 8px #0003; }', {'--shadow': '0 2px 8px #0003'}),
		withTokens('a { color: red; margin: 8px; }', {
			'--dynamic': 'var(--other)', '--string': '"red"', '--url': 'url(red)', '--reset': 'initial',
		}),
		{code: 'a { width: ???; }', options, languageOptions: {tolerant: true}},
	],
	invalid: [
		withTokens('a { color: #fff; }', {'--white': '#ffffff'}),
		withTokens('a { color: #abcd; }', {'--color': '#aabbccdd'}),
		withTokens('a { color: RGB(255,255,255); }', {'--white': '#fff'}),
		withTokens('a { color: rgb(100% 255 100% / 50%); }', {'--white': 'rgba(255, 255, 255, .5)'}),
		withTokens('a { color: rgb(50% 0 100%); }', {'--color': 'rgb(127.5 0 255)'}),
		withTokens('a { color: rgba(0,0,0,.5333333333333333); }', {'--color': '#0008'}),
		withTokens('a { background: linear-gradient(rgb(255 255 255), black); }', {'--white': '#fff'}),
		withTokens('a { opacity: .50; z-index: +01; animation-name: Example; }', {'--half': '.5', '--index': '1', '--name': 'Example'}),
		withTokens('a { width: calc(1px\n+\t2px); }', {'--width': 'calc(1px + 2px)'}),
		withTokens('a { width: calc((100% - 8px) / 2); }', {'--width': 'calc((100% - 8px) / 2)', '--space': '8px'}),
		withTokens('a { margin: 0.5rem; width: 50%; }', {'--space': '+05e-1REM', '--half': '50.0%'}),
		withTokens('a { transition: opacity 200ms cubic-bezier(0.1, 0.2, 0.3, 1); }', {'--time': '.2s', '--easing': 'cubic-bezier(.1,.2,.3,1)'}),
		withTokens('a { color: red; }', {'--Brand Color': 'red'}),
		withTokens('a { color: red; }', {'--Brand': 'red', '--brand': 'blue'}),
		withTokens('a { color: red; }', {'--constructor': 'red'}),
		withTokens(String.raw`a { color: r\65 d; }`, {'--color': 'red'}),
		withTokens(String.raw`a { color: r\67 b(255 255 255); }`, {'--white': '#fff'}),
	],
});

test({
	valid: [],
	invalid: [{
		code: 'a { margin: 8px 12px !important; }',
		options: [{customProperties: {'--inset': '8px 12px', '--space': '8px'}}],
		errors: [{
			messageId: 'prefer-existing-custom-properties/error',
			data: {replacement: 'var(--inset)'},
			suggestions: [{
				messageId: 'prefer-existing-custom-properties/suggestion',
				data: {replacement: 'var(--inset)'},
				output: 'a { margin: var(--inset) !important; }',
			}],
		}],
	}, {
		code: 'a { width: calc((100% - 8px) / 2); }',
		options: [{customProperties: {'--width': 'calc((100% - 8px) / 2)', '--space': '8px'}}],
		errors: [{
			messageId: 'prefer-existing-custom-properties/error',
			data: {replacement: 'var(--width)'},
			suggestions: [{
				messageId: 'prefer-existing-custom-properties/suggestion',
				data: {replacement: 'var(--width)'},
				output: 'a { width: var(--width); }',
			}],
		}],
	}],
});

const lint = customProperties => new Linter().verify('a { color: red; }', {
	files: ['**'],
	language: 'css/css',
	plugins: {css, cssicorn: plugin},
	rules: {'cssicorn/prefer-existing-custom-properties': ['error', {customProperties}]},
}, {filename: 'test.css'});

for (const value of ['', ' ', 'rgb(1 2 3', '8px)', '1px; color: red', '1px !important']) {
	nodeTest(`reject malformed configured value: ${JSON.stringify(value)}`, () => {
		assert.throws(() => lint({'--token': value}), /Invalid value for custom property/u);
	});
}

for (const name of ['color', '--']) {
	nodeTest(`reject invalid configured name: ${name}`, () => {
		assert.throws(() => lint({[name]: 'red'}), /property name .* is invalid/u);
	});
}
