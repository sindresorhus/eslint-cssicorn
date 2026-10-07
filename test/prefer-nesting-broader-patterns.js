import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	{
		code: 'input:not([type=submit]):focus, textarea:not([readonly]):focus { color: blue; }',
		output: ':focus { input&:not([type=submit]), textarea&:not([readonly]) { color: blue; } }',
	},
	{
		code: '.card {} body .card { color: blue; }',
		output: '.card { body & { color: blue; } }',
	},
	{
		code: '.card {} input:not([type=submit]).active.card { color: blue; }',
		output: '.card { input&:not([type=submit]).active { color: blue; } }',
	},
	{
		code: '.card {} TEXTAREA:NOT([readonly]).active.card { color: blue; }',
		output: '.card { TEXTAREA&:NOT([readonly]).active { color: blue; } }',
	},
	{
		code: String.raw`.card {} in\70 ut:not([type=submit]).card { color: blue; }`,
		output: String.raw`.card { in\70 ut&:not([type=submit]) { color: blue; } }`,
	},
	{
		code: '.page .a, .theme .b {} .theme .b .title, .page .a .title { color: blue; }',
		output: '.page .a, .theme .b { & .title { color: blue; } }',
	},
	{
		code: ':where(.a), :where(.b) {} :where(.a).active, :where(.b).active { color: blue; }',
		output: ':where(.a), :where(.b) { &.active { color: blue; } }',
	},
	{
		code: '.card {} @media (color) { @layer first { .card .title { color: blue; } } @layer second { .card:hover { color: green; } } }',
		output: '.card { @media (color) { @layer first { & .title { color: blue; } } @layer second { &:hover { color: green; } } } }',
	},
	{
		code: '.card {} @media (color) { .card .title { color: blue; } @layer theme { .card:hover { color: green; } } }',
		output: '.card { @media (color) { & .title { color: blue; } @layer theme { &:hover { color: green; } } } }',
	},
	{
		code: '.card {} @supports (display: grid) { @media (color) { .card { color: blue; } } @layer theme { .card { color: green; } } }',
		output: '.card { @supports (display: grid) { @media (color) { color: blue; } @layer theme { color: green; } } }',
	},
	{
		code: '.card {} @media (color) { @layer { @media (width > 0px) { .card .title { color: blue; & .body { color: green; } } } } }',
		output: '.card { @media (color) { @layer { @media (width > 0px) { & .title { color: blue; & .body { color: green; } } } } } }',
	},
	{
		code: '.card {} @media (width > 0px) { @supports (display: grid) { .card {} } }',
		output: '.card { @media (width > 0px) { @supports (display: grid) {} } }',
	},
	{
		code: '.card .title, .other .title {} .card .body {}',
		output: '.title { .card &, .other & {} } .card .body {}',
	},
	{
		code: '.outer { & .card .title {} & .card .body {} }',
		output: '.outer { & .card { & .title {} & .body {} } }',
	},
	{
		code: '.page .card {} .theme .page .card {}',
		output: '.card { .page & {} .theme .page & {} }',
	},
	{
		code: '.card {} .theme.card {}',
		output: '.card { .theme& {} }',
	},
	{
		code: '.card {} .theme .active.card {}',
		output: '.card { .theme .active& {} }',
	},
	{
		code: '@supports (display: grid) { .card {} } @media (color) { .card {} }',
		output: '.card { @supports (display: grid) {} @media (color) {} }',
	},
	{
		code: '@container (width > 0px) { .card {} } @media (color) { .card {} }',
		output: '.card { @container (width > 0px) {} @media (color) {} }',
	},
	{
		code: '@starting-style { .card {} } @media (color) { .card {} }',
		output: '.card { @starting-style {} @media (color) {} }',
	},
	{
		code: '@media (color) { .card, .other {} } @media (width > 0px) { .card, .other {} }',
		output: '.card, .other { @media (color) {} @media (width > 0px) {} }',
	},
	{
		code: '@media (color) { .card {} } @media (width > 0px) { @media (color) { .card {} } }',
		output: '.card { @media (color) {} @media (width > 0px) { @media (color) {} } }',
	},
	...[
		['.theme .card, .other .card', '.card', '.theme &, .other &'],
		['.theme > .card, .other + .card', '.card', '.theme > &, .other + &'],
		['.a.card, .b.card', '.card', '.a&, .b&'],
		['a.card, button.card', '.card', 'a&, button&'],
		['.card, .theme .card', '.card', '&, .theme &'],
		['.a.card:hover, .b.card:hover', '.card:hover', '.a&, .b&'],
		[String.raw`.th\65 me .c\61 rd, .other .c\61 rd`, String.raw`.c\61 rd`, String.raw`.th\65 me &, .other &`],
	].map(([selector, parent, inner]) => ({
		code: `${selector} { color: blue !important; & .title { color: green; } }`,
		output: `${parent} { ${inner} { color: blue !important; & .title { color: green; } } }`,
	})),
	{
		code: '.theme .card { color: blue; } .other .card { color: green; }',
		output: '.card { .theme & { color: blue; } .other & { color: green; } }',
	},
	{
		code: '.a.card { color: blue; } .b.card { color: green; }',
		output: '.card { .a& { color: blue; } .b& { color: green; } }',
	},
	...[
		['.a .title, .b .title', '& .title'],
		['.b.active, .a .title, .a.active, .b .title', '&.active, & .title'],
		['.a::before, .b::before, .b:hover, .a:hover', '&::before, &:hover'],
		['.a, .b, .a.active, .b.active', '&, &.active'],
	].map(([selectors, inner]) => ({
		code: `.a, .b { color: red; } ${selectors} { color: blue; & .title { color: green; } }`,
		output: `.a, .b { color: red; ${inner} { color: blue; & .title { color: green; } } }`,
	})),
	{
		code: '.a, .b {} @media (color) { .b .title, .a .title { color: blue; } }',
		output: '.a, .b { @media (color) { & .title { color: blue; } } }',
	},
	{
		code: '.outer, #outer { .a, .b {} .a:hover, .b:hover { color: blue; } }',
		output: '.outer, #outer { .a, .b { &:hover { color: blue; } } }',
	},
	{
		code: '.outer, #outer { &.a, &.b {} &.a:hover, &.b:hover { color: blue; } }',
		output: '.outer, #outer { &.a, &.b { &:hover { color: blue; } } }',
	},
	...[
		['& .card {} & .card .title { color: blue; }', '& .card { & .title { color: blue; } }'],
		['&.active {} &.active .title { color: blue; }', '&.active { & .title { color: blue; } }'],
		['& .card .title, & .card .body { color: blue; }', '& .card { & .title, & .body { color: blue; } }'],
		['&.card:is(.a, #b) { color: blue; }', '&.card { &:is(.a, #b) { color: blue; } }'],
		['& .card :is(.a, .b) { color: blue; }', '& .card { .a, .b { color: blue; } }'],
	].map(([original, output]) => ({code: `.outer, #outer { ${original} }`, output: `.outer, #outer { ${output} }`})),
	...['supports (display: grid)', 'container (width > 0px)', 'starting-style', 'media (color)', 'layer theme'].map(atRule => ({
		code: `.card {} @media (color) { @${atRule} { .card { color: blue; } } }`,
		output: `.card { @media (color) { @${atRule} { color: blue; } } }`,
	})),
	{
		code: '.card {} @supports (display: grid) { @media (color) { .card { color: blue; } } }',
		output: '.card { @supports (display: grid) { @media (color) { color: blue; } } }',
	},
	{
		code: '.card {} @media (color) { @layer theme { .card .title { color: blue; } .card:hover { color: green; } } }',
		output: '.card { @media (color) { @layer theme { & .title { color: blue; } &:hover { color: green; } } } }',
	},
	{
		code: '.card {} @layer theme { @media (color) { .theme .card.active { color: blue; } } }',
		output: '.card { @layer theme { @media (color) { .theme &.active { color: blue; } } } }',
	},
	{
		code: '@media (color) { @layer first { .card { color: blue; } } } @layer second { @media (width > 0px) { .card { color: green; } } }',
		output: '.card { @media (color) { @layer first { color: blue; } } @layer second { @media (width > 0px) { color: green; } } }',
	},
	{
		code: '.card.small { color: red; } @media (color) { @layer theme { .card.large { color: blue; } } }',
		output: '.card { &.small { color: red; } @media (color) { @layer theme { &.large { color: blue; } } } }',
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: [
			'.card {',
			'  color: red;',
			'}',
			'@media (color) {',
			'  @supports (display: grid) {',
			'    .card {',
			'      color: blue;',
			'    }',
			'  }',
			'}',
		].join(lineBreak),
		output: `.card {${lineBreak}  color: red;${lineBreak}  @media (color) {${lineBreak}    @supports (display: grid) {${lineBreak}      color: blue;${lineBreak}    }${lineBreak}  }${lineBreak}}`,
	})),
	...['\n', '\r\n'].flatMap(lineBreak => [
		{
			code: `.theme .card,${lineBreak}.other .card {${lineBreak}  color: blue;${lineBreak}}`,
			output: `.card {${lineBreak}  .theme &,${lineBreak}  .other & {${lineBreak}    color: blue;${lineBreak}  }${lineBreak}}`,
		},
		{
			code: [
				'.card {',
				'  color: red;',
				'}',
				'@media (color) {',
				'  @layer first {',
				'    .card:hover {',
				'      color: blue;',
				'    }',
				'  }',
				'',
				'  @layer second {',
				'    .card.active {',
				'      color: green;',
				'    }',
				'  }',
				'}',
			].join(lineBreak),
			output: [
				'.card {',
				'  color: red;',
				'  @media (color) {',
				'    @layer first {',
				'      &:hover {',
				'        color: blue;',
				'      }',
				'    }',
				'',
				'    @layer second {',
				'      &.active {',
				'        color: green;',
				'      }',
				'    }',
				'  }',
				'}',
			].join(lineBreak),
		},
	]),
	{
		code: '.card {\n\tcolor: red;\n}\n@media (color) {\n\t@layer theme {\n\t\t.card .title {\n\t\t\tcolor: blue;\n\t\t}\n\t}\n}',
		output: '.card {\n\tcolor: red;\n\t@media (color) {\n\t\t@layer theme {\n\t\t\t& .title {\n\t\t\t\tcolor: blue;\n\t\t\t}\n\t\t}\n\t}\n}',
	},
];

test({
	valid: [
		'.card {} input:not([type=submit]) .card { color: blue; }',
		'input:not([type=submit]) .card, textarea:not([readonly]) .card { color: blue; }',
		'.outer { .theme .card, .other .card {} }',
		'.outer { .a.card {} .b.card {} }',
		'& .theme .card, & .other .card {}',
		'.theme .card::before, .other .card::before {}',
		'.outer { .a, #b {} .a .title, #b .title {} }',
		'.a, .b {} .a .title {}',
		'.a, .b {} .a .title, .b .title, .a.active {}',
		'.outer { &.a, &.b {} &.a:is(&.active, .a), &.b:is(&.active, .a) {} }',
		'.card {} @media (color) { @layer theme { .other {} } @media (width > 0px) { .card .title {} } }',
		'.card {} @supports (display: grid) { @media (color) { .card .title {} } @layer theme { .card .body {} } }',
		'.a, .b {} .a .title, .b .other {}',
		'.outer { &.a, &.b {} }',
		'.outer { & {} & .title {} }',
		'.outer { & :is(.a, .b) {} }',
		'.outer { & .card {} & .card & .title {} }',
		'.outer { & .card {} & .card:is(&.active, .a) {} }',
		'.outer { .theme & .card {} .theme & .card .title {} }',
		'.card {} @supports (display: grid) { @media (color) { .card .title {} } }',
		'.card {} @media (color) { @supports (display: grid) { .card { & .title {} } } }',
		'.card {} @media (color) { @scope (.theme) { .card {} } }',
		'.card {} @media (color) { @font-face { font-family: example; src: url(example); } }',
		'@scope (.page) { .theme .card, .other .card {} }',
		'@namespace url("https://example.com"); .theme .card, .other .card {}',
	],
	invalid: [
		{
			code: '.a, .a * {} .a * .title, .a .title {}',
			output: '.a { &, & * {} } .a { & * .title, & .title {} }',
			errors: 2,
		},
		...cases.map(({code, output}) => ({code, output, errors: 1})),
		...[
			'.theme .card, /* keep */ .other .card { color: blue; }',
			'.a, .b {} .a .title, .b /* keep */ .title { color: blue; }',
			'.card {} @media (color) { @supports (display: grid) { .card { /* keep */ color: blue; } } }',
			'.card {} @media (color) { @layer first { .card:hover {} } /* keep */ @layer second { .card.active {} } }',
			'.card {} @media (color) { @supports (display: grid) { .card {\n\tcolor: blue;\n} } }',
		].map(code => ({code, errors: 1})),
	],
});

nodeTest('broader nesting fixes preserve syntax and reach stable output', () => {
	const linter = new Linter();
	const config = {...plugin.configs.all, rules: {'cssicorn/prefer-nesting': 'error', 'cssicorn/no-useless-is': 'error'}};
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		assert.deepEqual(result.messages, [], code);
		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: []}, code);
	}
});

nodeTest('broader nesting fixes converge with the nesting rules', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: {
			'cssicorn/prefer-nesting': 'error',
			'cssicorn/no-useless-is': 'error',
			'cssicorn/no-redundant-nested-style-rules': 'error',
			'cssicorn/no-declarations-after-nested-rules': 'error',
			'cssicorn/no-unscoped-nesting-selector': 'error',
		},
	};
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.deepEqual(result.messages, [], code);
		assert.equal(linter.verifyAndFix(result.output, config, {filename: 'test.css'}).fixed, false, code);
		assert.equal(result.output, linter.verifyAndFix(output, config, {filename: 'test.css'}).output, code);
	}
});
