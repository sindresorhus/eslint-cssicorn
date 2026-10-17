import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	{
		code: '.card {} .theme .card .title { color: blue !important; & .body { color: green; } }',
		output: '.card { .theme & .title { color: blue !important; & .body { color: green; } } }',
	},
	...['link', 'defined', 'fullscreen', 'autofill', 'modal', 'popover-open'].map(pseudoClass => ({
		code: `.card:${pseudoClass} { color: red; } .card:${pseudoClass} .title { color: blue; }`,
		output: `.card:${pseudoClass} { color: red; .title { color: blue; } }`,
	})),
	{
		code: 'a:LINK {} a:LINK:hover { color: blue; }',
		output: 'a:LINK { &:hover { color: blue; } }',
	},
	{
		code: String.raw`.card:\44 EFINED {} .card:\44 EFINED .title { color: blue; }`,
		output: String.raw`.card:\44 EFINED { .title { color: blue; } }`,
	},
	{
		code: String.raw`.card:\50 OPOVER-OPEN {} .card:\50 OPOVER-OPEN:hover { color: blue; }`,
		output: String.raw`.card:\50 OPOVER-OPEN { &:hover { color: blue; } }`,
	},
	{
		code: '.outer { .card:modal {} .card:modal:hover { color: blue; } }',
		output: '.outer { .card:modal { &:hover { color: blue; } } }',
	},
];

test({
	valid: [
		'.card { color: red; } .theme .active.card:hover { color: blue; }',
		'.card {} .theme .active.card:hover, .other > .card .title { color: blue; }',
		'.a, .b { color: red; } .theme .a:hover, .theme .b:hover { color: blue; }',
		':where(.a), :where(.b) {} .theme :where(.b) .title, .theme :where(.a) .title { color: blue; }',
		'.outer { .card {} .theme .active.card:hover {} }',
		'.outer { .card {} .theme .card .title {} }',
		'.outer { .a, .b {} .theme .a:hover, .other .b:focus {} }',
		'.card {} .theme :not(.card).title {}',
		'.card {} .theme :has(.card) .title {}',
		'.card {} .theme .active.card:not(:unknown) {}',
		'.card {} .theme .activecard:hover {}',
		'.card:scope {} .theme .active.card:scope:hover {}',
		'.card:visited {} .card:visited:hover {}',
		'.card:unknown {} .card:unknown .title {}',
		'@scope (.outer) { .card {} .theme .active.card:hover {} }',
		'@namespace url("https://example.com"); .card {} .theme .active.card:hover {}',
		'.a, .b {} .theme .a.b:hover {}',
		'.a, .b {} .theme .a:hover, .other > .b.active {}',
		'.a, .b {} .theme .a .title, .theme .b .title, .other > .a.active {}',
		'.a, #b {} .theme .active.a:hover, .other .active#b:focus {}',
		'.card {} input:not([type=submit], [type=button], [type=reset]) .active.card:hover {}',
		'.card {} @supports (display: grid) { .theme .active.card:hover {} }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
	],
});

nodeTest('existing pseudo-class parent fixes preserve syntax and converge with nesting rules', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: {
			'cssicorn/prefer-nesting': 'error',
			'cssicorn/no-nesting-with-mixed-specificity': 'error',
			'cssicorn/no-redundant-nested-style-rules': 'error',
			'cssicorn/no-declarations-after-nested-rules': 'error',
			'cssicorn/no-unscoped-nesting-selector': 'error',
		},
	};
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});
