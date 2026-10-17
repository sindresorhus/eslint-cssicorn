import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const extendedRelatedRuleCases = [
	{
		code: '.card {} .theme .card.active .title {}',
		output: '.card { .theme &.active .title {} }',
	},
	{
		code: '.card.active {} .theme > .card.active:hover { color: blue; }',
		output: '.card.active { .theme > &:hover { color: blue; } }',
	},
	{
		code: '.card {} .card .title, .card {}',
		output: '.card { .title, & {} }',
	},
	{
		code: '.card {} @layer theme { .card .title {} @media (color) { .card .body {} } }',
		output: '.card { @layer theme { .title {} @media (color) { .body {} } } }',
	},
	{
		code: '.card { color: red; } .card .title, .card { color: blue; }',
		output: '.card { color: red; .title, & { color: blue; } }',
	},
	...['layer theme\u00A0', 'media screen\u00A0'].map(atRule => ({
		code: `.card { color: red; } @${atRule} { .card { color: blue; } }`,
		output: `.card { color: red; @${atRule} { color: blue; } }`,
	})),
	...['\u00A0', '\u00A0 .title'].map(selector => ({
		code: `.card {} @media (color) { .card ${selector} { color: red; } @layer theme { .card { color: blue; } } }`,
		output: `.card { @media (color) { ${selector} { color: red; } @layer theme { color: blue; } } }`,
	})),
	{
		code: [
			'.card {',
			'  color: red;',
			'}',
			'@media screen\u00A0 {',
			'  .card \u00A0 .title {',
			'    color: blue;',
			'  }',
			'  @layer theme\u00A0 {',
			'    .card {',
			'      color: green;',
			'    }',
			'  }',
			'}',
		].join('\r\n'),
		output: [
			'.card {',
			'  color: red;',
			'  @media screen\u00A0 {',
			'    \u00A0 .title {',
			'      color: blue;',
			'    }',
			'    @layer theme\u00A0 {',
			'      color: green;',
			'    }',
			'  }',
			'}',
		].join('\r\n'),
	},
];

test({
	valid: [
		'.card.active {} .card.active .title, .card {}',
		'.card, .card.active { color: blue; /* keep */ }',
		'@media (color) { .card { color: red; } } /* keep */ @layer theme { .card { color: blue; } }',
		'.card, .card {}',
		'.card.active {} .card {}',
		'.card {} .card, .card {}',
		'.page .card {} .page .card:hover, .theme .page .card {}',
		'.outer { .card {} .card:hover, .theme .card {} }',
		'.outer { .card {} .theme .card.active {} }',
		'.outer { .card {} @media (color) { .theme .card {} } }',
		'.card {} @supports (display: grid) { .theme .card.active {} }',
		'.card {} @container (width > 0px) { .theme .card.active {} }',
		'.card {} @starting-style { .theme .card.active {} }',
		'@media (color) { .card {} } @media (width > 0px) { .other {} }',
		'@media (color) { .card {} } .card {}',
		'@media (color) { .card {} .other {} } @media (width > 0px) { .card {} }',
		'@scope (.outer) { @media (color) { .card {} } @media (width > 0px) { .card {} } }',
		'@namespace url("https://example.com"); @media (color) { .card {} } @media (width > 0px) { .card {} }',
	],
	invalid: [
		...extendedRelatedRuleCases.map(({code, output}) => ({code, output, errors: 1})),
		...[
			'.card {} .card:hover, .theme /* keep */ .card { color: blue; }',
			'.card { color: red; } .card:hover { color: blue; /* keep */ }',
			'.card { color: red } .card:hover { color: blue; }',
			'.card { color: red; } @layer theme { .card { color: blue; /* keep */ } }',
			'.card { color: red; } @layer theme {\n\t.card { color: blue; }\n}',
		].map(code => ({code, errors: 1})),
	],
});

nodeTest('extended related fixes reparse and converge with the nesting rules', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: {
			'cssicorn/prefer-nesting': 'error',
			'cssicorn/no-redundant-nested-style-rules': 'error',
			'cssicorn/no-declarations-after-nested-rules': 'error',
			'cssicorn/no-unscoped-nesting-selector': 'error',
		},
	};
	for (const {code, output} of extendedRelatedRuleCases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.fixed, true, code);
		assert.deepEqual(result.messages, [], code);
		const repeated = linter.verifyAndFix(result.output, config, {filename: 'test.css'});
		assert.equal(repeated.fixed, false, code);
		assert.deepEqual(repeated.messages, [], code);
		// Existing parents keep their declarations before the merged nested rules.
		assert.equal(result.output, output, code);
	}
});
