import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const detailsSelector = 'details summary[role=button].contrast:not(.outline)::after';
const busyTypes = ['button', '[type=submit]', '[type=button]', '[type=reset]', '[role=button]'].join(', ');
const busySelector = `[aria-busy=true]:not(input, select, textarea).contrast:is(${busyTypes}):not(.outline)::before`;

const cases = [
	...[':host', ':host(.active)', ':host-context(.theme)', 'slot:has-slotted'].map(parent => ({
		code: `${parent} { color: red; } ${parent} .title { color: blue; }`,
		output: `${parent} { color: red; .title { color: blue; } }`,
	})),
	{
		code: ':host { box-sizing: border-box; } :host *, :host *::before, :host *::after { box-sizing: inherit; }',
		output: ':host { box-sizing: border-box; *, *::before, *::after { box-sizing: inherit; } }',
	},
	{
		code: '.label { :host(:not(:last-of-type)) & { color: blue; } :host(:not(:last-of-type)) &:hover { color: red; } :host(:not(:last-of-type)) &:active { color: green; } }',
		output: '.label { :host(:not(:last-of-type)) & { color: blue; &:hover { color: red; } &:active { color: green; } } }',
	},
	{
		code: ':HOST(.active) {} :HOST(.active):hover { color: blue; }',
		output: ':HOST(.active) { &:hover { color: blue; } }',
	},
	{
		code: String.raw`:h\6f st {} :h\6f st .t\69 tle { color: blue; }`,
		output: String.raw`:h\6f st { .t\69 tle { color: blue; } }`,
	},
	{
		code: 'slot:HAS-SLOTTED {} slot:HAS-SLOTTED::before { content: "test"; }',
		output: 'slot:HAS-SLOTTED { &::before { content: "test"; } }',
	},
	{
		code: String.raw`slot:has-\73 lotted {} slot:has-\73 lotted::before { content: "test"; }`,
		output: String.raw`slot:has-\73 lotted { &::before { content: "test"; } }`,
	},
	{
		code: ':host-context(.theme) {} @media (color) { :host-context(.theme) > .title { color: blue !important; & .body { color: green; } } }',
		output: ':host-context(.theme) { @media (color) { > .title { color: blue !important; & .body { color: green; } } } }',
	},
	{
		code: '[data-kind="CARD" i]:host {} [data-kind="CARD" i]:host .title { color: blue; }',
		output: '[data-kind="CARD" i]:host { .title { color: blue; } }',
	},
	...['\n', '\r\n'].flatMap(lineBreak => ['  ', '\t'].map(indentation => ({
		code: `:host {${lineBreak}${indentation}color: red;${lineBreak}}${lineBreak}:host .title {${lineBreak}${indentation}color: blue;${lineBreak}}`,
		output: `:host {${lineBreak}${indentation}color: red;${lineBreak}${indentation}.title {${lineBreak}${indentation.repeat(2)}color: blue;${lineBreak}${indentation}}${lineBreak}}`,
	}))),
];

test({
	valid: [
		// A type followed by a pseudo-class does not justify contextual nesting.
		'.card {} body:has(.theme) .card {}',
		'.card {} fieldset:disabled .card {}',
		':host(.active) .title, :host(.active) .body { color: blue; }',
		'code { color: red; } a > code { color: blue; }',
		'.switch-paddle {} input + .switch-paddle { color: blue; }',
		'.button {} .button[disabled], fieldset[disabled] .button { opacity: 0.5; }',
		'.card {} input:not([type=submit], [type=button], [type=reset]).card { color: blue; }',
		'.outer { &.card {} body .theme &.card .title { color: blue; } }',
		`:root:not([data-theme]) ${detailsSelector}, :host(:not([data-theme])) ${detailsSelector} { filter: brightness(0); }`,
		`:root:not([data-theme]) ${busySelector}, :host(:not([data-theme])) ${busySelector} { filter: brightness(0); }`,
		'.outer { :host(&.active) {} :host(&.active) .title { color: blue; } }',
		'.card:scope {} .card:scope .title {}',
		'.card:visited {} .card:visited:hover {}',
		'.card:state(active) {} .card:state(active) .title {}',
		String.raw`:h\6f st(.active) {} :h\6f st(.active) .title {}`,
		':host(:unknown) {} :host(:unknown) .title {}',
		':host(.a .b) {} :host(.a .b) .title {}',
		':host-context(.a .b) {} :host-context(.a .b) .title {}',
		'.card:unknown {} .card:unknown .title {}',
		'#123:host {} #123:host .title {}',
		'[data-kind=x z]:host {} [data-kind=x z]:host .title {}',
		'[svg|data-kind]:host {} [svg|data-kind]:host .title {}',
		':host::before {} :host::before:hover {}',
		':host .title, .card.active .title, :host .body, .card.active .body {}',
		'.outer { :host(&.a), :host(&.b) {} :host(&.a) .title, :host(&.b) .title {} }',
		'.outer { :host(.active) {} :host(.active) & .title {} }',
		'.card {} input:not([type=submit], [type=button], [type=reset]) .card {}',
		'.card {} input:not([type=submit], [type=button], [type=reset]) + .card {}',
		'.page .card {} body .page .card:hover {}',
		'.outer { .card {} body .theme .card {} }',
		'.outer { &.card {} body .theme & &.card {} }',
		'.outer { &.card {} body .theme &.card:has(> &) {} }',
		'@scope (.outer) { :host {} :host .title {} }',
		'@scope (.outer) { .card {} body .theme .card {} }',
		'@namespace url("http://www.w3.org/1999/xhtml"); :host {} :host .title {}',
		'@namespace svg url("http://www.w3.org/2000/svg"); .card {} body .theme .card {}',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
		...[
			':host {} /* keep */ :host .title {}',
			':host(.active) {} :host(.active) .title { /* keep */ color: blue; }',
			':host { color: red } :host .title {}',
			':host {\n  color: red;\n}\n:host .title {\n\tcolor: blue;\n}',
		].map(code => ({code, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
	],
});

nodeTest('standard parent pseudos reparse and converge with nesting rules', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: Object.fromEntries([
			'prefer-nesting',
			'no-useless-is',
			'no-redundant-nested-style-rules',
			'no-declarations-after-nested-rules',
			'no-unscoped-nesting-selector',
		].map(name => [`cssicorn/${name}`, 'error'])),
	};
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
