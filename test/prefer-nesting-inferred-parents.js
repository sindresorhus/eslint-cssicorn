import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	{
		code: '.a .title, .b .title, .a .body, .b .body { color: blue; }',
		output: '.a, .b { & .title, & .body { color: blue; } }',
	},
	{
		code: '.b .body, .a .title, .b .title, .a .body { color: blue; }',
		output: '.b, .a { & .body, & .title { color: blue; } }',
	},
	{
		code: '.a .title, .b .title, .c .title, .a .body, .b .body, .c .body { color: blue; }',
		output: '.a, .b, .c { & .title, & .body { color: blue; } }',
	},
	{
		code: '.a.active .title, .b.active .title, .a.active .body, .b.active .body { color: blue; }',
		output: '.a.active, .b.active { & .title, & .body { color: blue; } }',
	},
	{
		code: 'ol ol, ul ul, ol ul, ul ol { margin-bottom: 0; }',
		output: 'ol, ul { & ol, & ul { margin-bottom: 0; } }',
	},
	{
		code: 'thead th, thead td, tfoot th, tfoot td { text-align: left; }',
		output: 'thead, tfoot { & th, & td { text-align: left; } }',
	},
	{
		code: 'ul ul ol, ul ol ol, ol ul ol, ol ol ol { list-style-type: lower-alpha; }',
		output: 'ul, ol { & ul ol, & ol ol { list-style-type: lower-alpha; } }',
	},
	{
		code: '.map_canvas img, .map_canvas embed, .map_canvas object, .mqa-display img, .mqa-display embed, .mqa-display object { max-width: none; }',
		output: '.map_canvas, .mqa-display { & img, & embed, & object { max-width: none; } }',
	},
	{
		code: '[role=search] button, [role=search] [type=submit], [role=group] button, [role=group] [type=submit] { border: 0; }',
		output: '[role=search], [role=group] { & button, & [type=submit] { border: 0; } }',
	},
	{
		code: '.a > .title, .b > .title, .a + .body, .b + .body { color: blue; }',
		output: '.a, .b { & > .title, & + .body { color: blue; } }',
	},
	{
		code: '.a~.title, .b~.title, .a>.body, .b>.body { color: blue; }',
		output: '.a, .b { & ~.title, & >.body { color: blue; } }',
	},
	{
		code: '.a:HOVER .title, .b:FOCUS .title, .a:HOVER .body, .b:FOCUS .body { color: blue; }',
		output: '.a:HOVER, .b:FOCUS { & .title, & .body { color: blue; } }',
	},
	{
		code: String.raw`.a:\48 OVER .t\69 tle, .b:\46 OCUS .t\69 tle, .a:\48 OVER .body, .b:\46 OCUS .body { color: blue; }`,
		output: String.raw`.a:\48 OVER, .b:\46 OCUS { & .t\69 tle, & .body { color: blue; } }`,
	},
	{
		code: ':where(.a) .title, :where(.b) .title, :where(.a) .body, :where(.b) .body { color: blue; }',
		output: ':where(.a), :where(.b) { & .title, & .body { color: blue; } }',
	},
	{
		code: ':where(.a) .title, :where(.a):where(.b) .title, :where(.a) .body, :where(.a):where(.b) .body { color: blue; }',
		output: ':where(.a) { & .title, &:where(.b) .title, & .body, &:where(.b) .body { color: blue; } }',
	},
	{
		code: '.a:not(.disabled) .title, .b:not(.disabled) .title, .a:not(.disabled) .body, .b:not(.disabled) .body { color: blue; }',
		output: '.a:not(.disabled), .b:not(.disabled) { & .title, & .body { color: blue; } }',
	},
	{
		code: '.a .title, .b .title, .a .body, .b .body { --text: "a & b"; color: blue !important; & .nested { color: green; } }',
		output: '.a, .b { & .title, & .body { --text: "a & b"; color: blue !important; & .nested { color: green; } } }',
	},
	{
		code: '.a::before, .b::before { content: "test"; }',
		output: '.a, .b { &::before { content: "test"; } }',
	},
	{
		code: '.a::before, .b::after, .a::after, .b::before { content: "test"; }',
		output: '.a, .b { &::before, &::after { content: "test"; } }',
	},
	{
		code: '.a .title::before, .b .title::before { content: "test"; }',
		output: '.a, .b { & .title::before { content: "test"; } }',
	},
	{
		code: '.a.active::BEFORE, .b.active::BEFORE { content: "test"; }',
		output: '.a.active, .b.active { &::BEFORE { content: "test"; } }',
	},
	{
		code: '.outer { &.a .title, &.b .title, &.a .body, &.b .body { color: blue; } }',
		output: '.outer { &.a, &.b { & .title, & .body { color: blue; } } }',
	},
	{
		code: '.outer, #missing { .a .title, &.b .title, .a .body, &.b .body { color: blue; } }',
		output: '.outer, #missing { .a, &.b { & .title, & .body { color: blue; } } }',
	},
	{
		code: '.outer { &.a::before, &.b::before { content: "test"; } }',
		output: '.outer { &.a, &.b { &::before { content: "test"; } } }',
	},
	{
		code: '.outer { .a& .title, .b& .title, .a& .body, .b& .body { color: blue; } }',
		output: '.outer { .a&, .b& { & .title, & .body { color: blue; } } }',
	},
	{
		code: '.outer { :where(&).a .title, :where(&).b .title, :where(&).a .body, :where(&).b .body { color: blue; } }',
		output: '.outer { :where(&) { &.a .title, &.b .title, &.a .body, &.b .body { color: blue; } } }',
	},
	{
		code: '@media (width > 0px) { @layer theme { .a .title, .b .title, .a .body, .b .body { color: blue; } } }',
		output: '@media (width > 0px) { @layer theme { .a, .b { & .title, & .body { color: blue; } } } }',
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: `.a .title,${lineBreak}.b .title,${lineBreak}.a .body,${lineBreak}.b .body {${lineBreak}  color: blue;${lineBreak}}`,
		output: `.a, .b {${lineBreak}  & .title, & .body {${lineBreak}    color: blue;${lineBreak}  }${lineBreak}}`,
	})),
	{
		code: '.a::before,\n.b::before {\n\tcontent: "test";\n}',
		output: '.a, .b {\n\t&::before {\n\t\tcontent: "test";\n\t}\n}',
	},
];

test({
	valid: [
		'.a .title, .b .title, .a .body { color: blue; }',
		'.a .title, .b .title, .a .body, .b .other { color: blue; }',
		'.a::before, .b::after { content: "test"; }',
		'.a .title, #b .title, .a .body, #b .body { color: blue; }',
		'.a::before, #b::before { content: "test"; }',
		'.a .title, .b .title, .a .body, .b .body, .unrelated { color: blue; }',
		'.outer, #missing { &.a .title, &&.b .title, &.a .body, &&.b .body { color: blue; } }',
		'.outer { &.a .title, &.b .title, &.a & .body, &.b & .body { color: blue; } }',
		'.outer { .a:has(> &) .title, .b:has(> &) .title, .a:has(> &) .body, .b:has(> &) .body { color: blue; } }',
		'.outer { .a:where(&) .title, .b:where(&) .title, .a:where(&) .body, .b:where(&) .body { color: blue; } }',
		'.a:unknown .title, .b:unknown .title, .a:unknown .body, .b:unknown .body { color: blue; }',
		'.a:state(active) .title, .b:state(active) .title, .a:state(active) .body, .b:state(active) .body { color: blue; }',
		[
			'input:not([type=submit], [type=button], [type=reset]) .a .title',
			'textarea:not([readonly]) .b .title',
			'input:not([type=submit], [type=button], [type=reset]) .a .body',
			'textarea:not([readonly]) .b .body',
		].join(', ') + ' { color: blue; }',
		'@namespace url("https://example.com"); .a .title, .b .title, .a .body, .b .body { color: blue; }',
		'@scope (.outer) { .a .title, .b .title, .a .body, .b .body { color: blue; } }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
		...[
			'.a .title, .b /* keep */ .title, .a .body, .b .body { color: blue; }',
			'.a .title, .b .title, .a .body, .b .body { color: blue; /* keep */ }',
			'.a::before, /* keep */ .b::before { content: "test"; }',
			'.a .title, .b .title, .a .body, .b .body {\ncolor: blue;\n}',
			'.a .title, .b .title, .a .body, .b .body { --text: "a\\\nb"; }',
		].map(code => ({code, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
	],
});

nodeTest('inferred parent fixes preserve syntax and converge with nesting rules', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: Object.fromEntries([
			'prefer-nesting',
			'no-useless-is',
			'no-nesting-with-mixed-specificity',
			'no-redundant-nested-style-rules',
			'no-declarations-after-nested-rules',
			'no-unscoped-nesting-selector',
		].map(name => [`cssicorn/${name}`, 'error'])),
	};
	for (const {code, output} of cases) {
		const expected = linter.verifyAndFix(output, config, {filename: 'test.css'});
		assert.deepEqual(expected.messages.filter(message => message.ruleId !== 'cssicorn/no-nesting-with-mixed-specificity'), [], output);
		const originalWarnings = linter.verify(code, config, {filename: 'test.css'}).filter(message => message.ruleId === 'cssicorn/no-nesting-with-mixed-specificity');
		assert.deepEqual(expected.messages.map(message => message.messageId), originalWarnings.map(message => message.messageId), code);
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, expected.output, code);
		assert.deepEqual(result.messages, expected.messages, code);
		assert.deepEqual(linter.verifyAndFix(result.output, config, {filename: 'test.css'}), {fixed: false, output: result.output, messages: expected.messages}, code);
	}
});
