import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

const cases = [
	{
		code: '.outer, #missing { .a:where(#1&, .open), .b:where(&.active) {} .a:where(#1&, .open) .title, .b:where(&.active) .title { color: red; } }',
		output: '.outer, #missing { .a:where(#1&, .open), .b:where(&.active) { & .title { color: red; } } }',
	},
	{
		code: '.outer { .a:where(&), .b:where(&.active) {} .a:where(&) .title, .b:where(&.active) .title { color: red; } }',
		output: '.outer { .a:where(&), .b:where(&.active) { & .title { color: red; } } }',
	},
	{
		code: '.outer, #missing { .a:where(&) .title, .b:where(&.active) .title { color: red; &::before { content: "test"; } } }',
		output: '.outer, #missing { .a:where(&), .b:where(&.active) { & .title { color: red; &::before { content: "test"; } } } }',
	},
	{
		code: '.outer { #a:where(&), #b:where(&.active) {} #b:where(&.active):hover, #a:where(&):hover { color: red; } }',
		output: '.outer { #a:where(&), #b:where(&.active) { &:hover { color: red; } } }',
	},
	...[' ', ' > ', ' + ', ' ~ '].map(combinator => ({
		code: `.outer, #missing { .a:where(&), .b:where(&.active) {} .theme${combinator}.a:where(&) .title, .theme${combinator}.b:where(&.active) .title { color: red; } }`,
		output: `.outer, #missing { .a:where(&), .b:where(&.active) { .theme${combinator}& .title { color: red; } } }`,
	})),
	{
		code: '.outer, #missing { &.a:where(&), &.b:where(&.active) {} &.a:where(&)::before, &.b:where(&.active)::before { content: "test"; } }',
		output: '.outer, #missing { &.a:where(&), &.b:where(&.active) { &::before { content: "test"; } } }',
	},
	{
		code: '.outer { &&.a:where(&), &&.b:where(&.active) {} &&.a:where(&) .title, &&.b:where(&.active) .title { color: red; } }',
		output: '.outer { &&.a:where(&), &&.b:where(&.active) { & .title { color: red; } } }',
	},
	{
		code: '.outer { .a:where(&:not(.disabled)), .b:where(:is(&.active, .open)) {} .a:where(&:not(.disabled)):hover, .b:where(:is(&.active, .open)):hover { color: red; } }',
		output: '.outer { .a:where(&:not(.disabled)), .b:where(:is(&.active, .open)) { &:hover { color: red; } } }',
	},
	{
		code: '.outer { .a:where(&&), .b:where(&.active):where(&) {} .a:where(&&) .title, .b:where(&.active):where(&) .title { color: red; } }',
		output: '.outer { .a:where(&&), .b:where(&.active):where(&) { & .title { color: red; } } }',
	},
	{
		code: '.outer { @media (color) { .a:where(&) .title, .b:where(&.active) .title { color: red; } } @layer theme { .a:where(&) .body, .b:where(&.active) .body { color: blue; } } }',
		output: '.outer { .a:where(&), .b:where(&.active) { @media (color) { & .title { color: red; } } @layer theme { & .body { color: blue; } } } }',
	},
	{
		code: '.outer { .a:WHERE(&), .b:WHERE(&.active) {} .a:WHERE(&) .title, .b:WHERE(&.active) .title { COLOR: RED !important; } }',
		output: '.outer { .a:WHERE(&), .b:WHERE(&.active) { & .title { COLOR: RED !important; } } }',
	},
	{
		code: String.raw`.outer { .\61:where(&), .\62:where(&.active) {} .\61:where(&) .title, .\62:where(&.active) .title { color: red; } }`,
		output: String.raw`.outer { .\61:where(&), .\62:where(&.active) { & .title { color: red; } } }`,
	},
	...['\n', '\r\n'].map(lineBreak => ({
		code: ['.outer {', '  .a:where(&), .b:where(&.active) {', '    color: blue;', '  }', '  .a:where(&) .title, .b:where(&.active) .title {', '    color: red;', '  }', '}'].join(lineBreak),
		output: ['.outer {', '  .a:where(&), .b:where(&.active) {', '    color: blue;', '    & .title {', '      color: red;', '    }', '  }', '}'].join(lineBreak),
	})),
];

test({
	valid: [
		'.outer, #missing { .a:where(&), .b {} .a:where(&) .title, .b .title { color: red; } }',
		'.outer { .a:where(&), &.b:where(&.active) {} .a:where(&) .title, &.b:where(&.active) .title { color: red; } }',
		'.outer { &.a:where(&), &&.b:where(&.active) {} &.a:where(&) .title, &&.b:where(&.active) .title { color: red; } }',
		'.outer { .a:where(&), #b:where(&.active) {} .a:where(&) .title, #b:where(&.active) .title { color: red; } }',
		'.outer { .a:where(&) .title, .b .title { color: red; } }',
		'.outer { .a:where(&), .b:where(&.active) {} .a:where(&) .title { color: red; } }',
		'.outer { .a:where(&), .b:where(&.active) {} .a:where(&) .title, .b:where(&.active) .body { color: red; } }',
		'.outer { .a:where(&), .b:is(&.active) {} .a:where(&) .title, .b:is(&.active) .title { color: red; } }',
		'.outer { .a:not(:where(&)), .b:not(:where(&.active)) {} .a:not(:where(&)) .title, .b:not(:where(&.active)) .title { color: red; } }',
		'.outer { .a:where(:unknown(&)), .b:where(&.active) {} .a:where(:unknown(&)) .title, .b:where(&.active) .title { color: red; } }',
		':host { .a:where(:host(&)), .b:where(&.active) {} .a:where(:host(&)) .title, .b:where(&.active) .title { color: red; } }',
		'@scope (.page) { .outer { .a:where(&), .b:where(&.active) {} .a:where(&) .title, .b:where(&.active) .title { color: red; } } }',
		'@namespace url("https://example.com"); .outer { .a:where(&), .b:where(&.active) {} .a:where(&) .title, .b:where(&.active) .title { color: red; } }',
	],
	invalid: [
		...cases.map(({code, output}) => ({code, output, errors: [{messageId: 'prefer-nesting/related-rules'}]})),
		{code: '.outer { .a:where(&), .b:where(&.active) {} /* keep */ .a:where(&) .title, .b:where(&.active) .title { color: red; } }', errors: [{messageId: 'prefer-nesting/related-rules'}]},
	],
});

nodeTest('zero-specificity parent references preserve stable fixes with the nesting rules', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: Object.fromEntries([
			'prefer-nesting',
			'no-nesting-with-mixed-specificity',
			'no-redundant-nested-style-rules',
			'no-declarations-after-nested-rules',
			'no-unscoped-nesting-selector',
		].map(name => [`cssicorn/${name}`, 'error'])),
	};
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.output, output, code);
		const originalMessages = linter.verify(code, config, {filename: 'test.css'});
		const originalRuleIds = new Set(originalMessages.map(message => message.ruleId));
		assert.deepEqual(result.messages.filter(message => message.fatal || !originalRuleIds.has(message.ruleId)), [], code);
		for (const ruleId of originalRuleIds) {
			assert.ok(result.messages.filter(message => message.ruleId === ruleId).length <= originalMessages.filter(message => message.ruleId === ruleId).length, code);
		}

		assert.deepEqual(linter.verifyAndFix(output, config, {filename: 'test.css'}), {fixed: false, output, messages: result.messages}, code);
	}
});
