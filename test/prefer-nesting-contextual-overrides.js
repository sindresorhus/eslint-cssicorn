import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	{
		code: '.button, .link { color: red; } .theme .button, .theme .link { color: blue; }',
		output: '.button, .link { color: red; .theme & { color: blue; } }',
	},
	{
		code: '.button, .link { color: red; } .theme .button:hover, .theme .link:hover { color: blue; }',
		output: '.button, .link { color: red; .theme &:hover { color: blue; } }',
	},
	{
		code: '.button, .link { color: red; } .button:hover, .link:hover, .theme .button, .theme .link { color: blue; }',
		output: '.button, .link { color: red; &:hover, .theme & { color: blue; } }',
	},
	{
		code: '.button, .link { color: red; } @media (color) { .theme .link, .theme .button { color: blue; } }',
		output: '.button, .link { color: red; @media (color) { .theme & { color: blue; } } }',
	},
	{
		code: ':where(.a), :where(.b) {} .theme :where(.b) .title, .theme :where(.a) .title { color: blue; }',
		output: ':where(.a), :where(.b) { .theme & .title { color: blue; } }',
	},
	{
		code: 'th, td { padding: 1rem; } tfoot th, tfoot td { border-top: 1px solid; } table.striped tbody tr:nth-child(odd) th, table.striped tbody tr:nth-child(odd) td { background: gray; }',
		output: 'th, td { padding: 1rem; tfoot & { border-top: 1px solid; } table.striped tbody tr:nth-child(odd) & { background: gray; } }',
	},
	{
		code: '.button { color: black; } [data-theme=dark] .button { color: white; }',
		output: '.button { color: black; [data-theme=dark] & { color: white; } }',
	},
	{
		code: 'a { color: green; } .under a { color: red; } .upper a { color: blue; }',
		output: 'a { color: green; .under & { color: red; } .upper & { color: blue; } }',
	},
	{
		code: '.button { color: black; } .button:hover { color: red; } .dark .button, .light .button { color: blue; }',
		output: '.button { color: black; &:hover { color: red; } .dark &, .light & { color: blue; } }',
	},
	{
		code: '.button.active { color: red; } .theme .button.active:hover .icon { color: blue; }',
		output: '.button.active { color: red; .theme &:hover .icon { color: blue; } }',
	},
	...[' ', ' > ', ' + ', ' ~ '].map(combinator => ({
		code: `.button { color: red; } .theme${combinator}.button:hover { color: blue; }`,
		output: `.button { color: red; .theme${combinator}&:hover { color: blue; } }`,
	})),
	{
		code: '.button { color: red; } html[data-theme=dark] .button { color: blue; }',
		output: '.button { color: red; html[data-theme=dark] & { color: blue; } }',
	},
	{
		code: '.x { color: red; } *|a .x { color: blue; }',
		output: '.x { color: red; *|a & { color: blue; } }',
	},
	{
		code: '.card { color: red; } body .theme .card { color: blue; }',
		output: '.card { color: red; body .theme & { color: blue; } }',
	},
	{
		code: String.raw`.b\75 tton { color: red; } .th\65 me .b\75 tton:HOVER { COLOR: BLUE !important; }`,
		output: String.raw`.b\75 tton { color: red; .th\65 me &:HOVER { COLOR: BLUE !important; } }`,
	},
	{
		code: '.button { color: red; } @media (color) { .theme .button { color: blue; } }',
		output: '.button { color: red; @media (color) { .theme & { color: blue; } } }',
	},
	{
		code: '@layer theme { .button { color: red; } .dark .button { color: blue; } }',
		output: '@layer theme { .button { color: red; .dark & { color: blue; } } }',
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: ['.button {', '  color: black;', '}', '[data-theme=dark] .button {', '  color: white;', '}'].join(lineBreak),
		output: ['.button {', '  color: black;', '  [data-theme=dark] & {', '    color: white;', '  }', '}'].join(lineBreak),
	})),
];

test({
	valid: [
		'.theme .button { color: blue; } .button { color: red; }',
		'.button { color: red; } .other { color: green; } .theme .button { color: blue; }',
		'.button { color: red; } .theme .buttonish { color: blue; }',
		'.button.active { color: red; } .theme .active.button { color: blue; }',
		'.page .button { color: red; } .theme .page .button { color: blue; }',
		'.button, .link { color: red; } .theme .button { color: blue; }',
		'.button, .link { color: red; } .theme .button, .other .link { color: blue; }',
		'.button, #link { color: red; } .theme .button, .theme #link { color: blue; }',
		'.page .button, .page .link { color: red; } .theme .page .button, .theme .page .link { color: blue; }',
		'.outer { .button, .link { color: red; } .theme .button, .theme .link { color: blue; } }',
		'.button, .link { color: red; } .theme .button:where(&), .theme .link:where(&) { color: blue; }',
		'.button { color: red; } .theme& .button { color: blue; }',
		'.button { color: red; } .theme .button:where(&) { color: blue; }',
		'.button { color: red; } .theme .button:unknown(&) { color: blue; }',
		'.button { color: red; } > .theme .button { color: blue; }',
		'.outer { .button { color: red; } .theme .button { color: blue; } }',
		'.button::before { color: red; } .theme .button::before { color: blue; }',
		'.button { color: red; } @supports (display: grid) { .theme .button { color: blue; } }',
		'@scope (.outer) { .button { color: red; } .theme .button { color: blue; } }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
		{
			code: '.button { color: red; } .theme /* keep */ .button { color: blue; }',
			errors: [{messageId: 'prefer-nesting/related-rules'}],
		},
	],
});

nodeTest('contextual overrides preserve source order and converge', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/prefer-nesting': ['error', {checkSharedPrefixes: false}]}};
	for (const {code, output} of cases) {
		assert.deepEqual(linter.verifyAndFix(code, config, {filename: 'test.css'}), {fixed: true, output, messages: []}, code);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
