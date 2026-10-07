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
		code: '@media (color) { .card {} } @media (width > 0px) { .card.active {} }',
		output: '.card { @media (color) {} @media (width > 0px) { &.active {} } }',
	},
	{
		code: '.outer, #outer { @media (color) { .card { color: red; & .title { color: blue; } } } @layer theme { .card { color: green; } } }',
		output: '.outer, #outer { .card { @media (color) { color: red; & .title { color: blue; } } @layer theme { color: green; } } }',
	},
	{
		code: '.card {} .card .title, .card {}',
		output: '.card { & .title, & {} }',
	},
	{
		code: '.card.active {} .card.active .title, .card {}',
		output: '.card.active {} .card { &.active .title, & {} }',
	},
	{
		code: '.card {} @layer theme { .card .title {} @media (color) { .card .body {} } }',
		output: '.card { @layer theme { & .title {} @media (color) { & .body {} } } }',
	},
	...[
		['.card, .card.active', '.card', '&, &.active'],
		['.card.active, .card', '.card', '&.active, &'],
		['.card, .card.active, .card::before', '.card', '&, &.active, &::before'],
		['.page > .card, .page > .card .title', '.page > .card', '&, & .title'],
		['[data-kind="CARD" i], [data-kind="CARD" i]:HOVER', '[data-kind="CARD" i]', '&, &:HOVER'],
		[String.raw`.c\61 rd, .c\61 rd.active`, String.raw`.c\61 rd`, '&, &.active'],
	].map(([selector, parent, inner]) => ({
		code: `${selector} { color: blue !important; & .title { color: green; } }`,
		output: `${parent} { ${inner} { color: blue !important; & .title { color: green; } } }`,
	})),
	...[
		['.card.active, .theme .card', '&.active, .theme &'],
		['.theme .card, .card.active', '.theme &, &.active'],
		['.card .title, .theme > .card:hover', '& .title, .theme > &:hover'],
		['.card, .theme .card.active', '&, .theme &.active'],
		['.card .title, .card', '& .title, &'],
		['.theme .card.active, #other + .card::before', '.theme &.active, #other + &::before'],
		['.theme .card:where(.active)', '.theme &:where(.active)'],
	].map(([selector, inner]) => ({
		code: `.card { color: red; } ${selector} { color: blue; }`,
		output: `.card { color: red; ${inner} { color: blue; } }`,
	})),
	{
		code: '.card.active {} .theme > .card.active:hover { color: blue; }',
		output: '.card.active { .theme > &:hover { color: blue; } }',
	},
	{
		code: String.raw`.c\61 rd {} .th\65 me .c\61 rd:HOVER { color: blue; }`,
		output: String.raw`.c\61 rd { .th\65 me &:HOVER { color: blue; } }`,
	},
	{
		code: '.outer, #outer { .card, .card.active { color: blue; } }',
		output: '.outer, #outer { .card { &, &.active { color: blue; } } }',
	},
	...['media (color)', 'layer theme', 'layer', 'MEDIA (color)', String.raw`l\61 yer theme`].map(atRule => ({
		code: `.card { color: red; } @${atRule} { .theme .card.active { color: blue; } }`,
		output: `.card { color: red; @${atRule} { .theme &.active { color: blue; } } }`,
	})),
	{
		code: '.card {} @media (color) { .card.active, .theme .card { color: blue; } .other > .card::before { content: ""; } }',
		output: '.card { @media (color) { &.active, .theme & { color: blue; } .other > &::before { content: ""; } } }',
	},
	...['media (color)', 'layer theme', 'layer', 'MEDIA (color)', String.raw`m\65 dia (color)`].map(atRule => ({
		code: `@${atRule} { .card { color: red; } } @media (width > 0px) { .card { color: blue !important; } }`,
		output: `.card { @${atRule} { color: red; } @media (width > 0px) { color: blue !important; } }`,
	})),
	{
		code: '@media (color) { .page > .card { --value: red; & .title { color: blue; } } } @layer theme { .page > .card { color: green; } }',
		output: '.page > .card { @media (color) { --value: red; & .title { color: blue; } } @layer theme { color: green; } }',
	},
	{
		code: '@media (color) { .card { color: red; } } @layer theme { .card { color: blue; } } @media (width > 0px) { .card { color: green; } }',
		output: '.card { @media (color) { color: red; } @layer theme { color: blue; } @media (width > 0px) { color: green; } }',
	},
	{
		code: '@supports (display: grid) { @media (color) { .card { color: red; } } @layer theme { .card { color: blue; } } }',
		output: '@supports (display: grid) { .card { @media (color) { color: red; } @layer theme { color: blue; } } }',
	},
	...['media (color)', 'layer theme'].map(atRule => ({
		code: `.card.small { color: red; } @${atRule} { .card.large { color: blue; } }`,
		output: `.card { &.small { color: red; } @${atRule} { &.large { color: blue; } } }`,
	})),
	{
		code: '.outer, #outer { .card.small { color: red; } @media (color) { .card.large { color: blue; } } }',
		output: '.outer, #outer { .card { &.small { color: red; } @media (color) { &.large { color: blue; } } } }',
	},
	{
		code: '.card,\r\n.card.active {\r\n  color: blue;\r\n}',
		output: '.card {\r\n  &,\r\n  &.active {\r\n    color: blue;\r\n  }\r\n}',
	},
	{
		code: '.card {\r\n  color: red;\r\n}\r\n.card:hover,\r\n.theme .card::before {\r\n  color: blue;\r\n}',
		output: '.card {\r\n  color: red;\r\n  &:hover,\r\n  .theme &::before {\r\n    color: blue;\r\n  }\r\n}',
	},
	{
		code: '@media (color) {\r\n  .card {\r\n    color: red;\r\n  }\r\n}\r\n@layer theme {\r\n  .card {\r\n    color: blue;\r\n  }\r\n}',
		output: '.card {\r\n  @media (color) {\r\n    color: red;\r\n  }\r\n  @layer theme {\r\n    color: blue;\r\n  }\r\n}',
	},
	{
		code: '.card.small {\n\tcolor: red;\n}\n@media (color) {\n\t.card.large {\n\t\tcolor: blue;\n\t}\n}',
		output: '.card {\n\t&.small {\n\t\tcolor: red;\n\t}\n\t@media (color) {\n\t\t&.large {\n\t\t\tcolor: blue;\n\t\t}\n\t}\n}',
	},
];

test({
	valid: [
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
		'@media (color) { .card::before {} } @media (width > 0px) { .card::before {} }',
		'@scope (.outer) { @media (color) { .card {} } @media (width > 0px) { .card {} } }',
		'@namespace url("https://example.com"); @media (color) { .card {} } @media (width > 0px) { .card {} }',
	],
	invalid: [
		...extendedRelatedRuleCases.map(({code, output}) => ({code, output, errors: 1})),
		...[
			'.card, .card.active { color: blue; /* keep */ }',
			'.card {} .card:hover, .theme /* keep */ .card { color: blue; }',
			'.card { color: red } .card:hover, .theme .card { color: blue; }',
			'@media (color) { .card { color: red; } } /* keep */ @layer theme { .card { color: blue; } }',
			'@media (color) { .card { color: red; } } @layer theme { .card { color: blue; /* keep */ } }',
			'@media (color) { .card { color: red; } } @layer theme {\n\t.card { color: blue; }\n}',
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
		// Redundant nesting can remove a consumed-parent wrapper after prefer-nesting runs.
		assert.equal(linter.verifyAndFix(output, config, {filename: 'test.css'}).output, result.output, code);
	}
});
