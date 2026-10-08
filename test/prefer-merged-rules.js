import assert from 'node:assert/strict';
import {test as nodeTest} from 'node:test';
import {Linter} from 'eslint';
import css from '@eslint/css';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		String.raw`.a { \2d\2d foo: a  b; } .b { \2d\2d foo: a b; }`,
		String.raw`.a { \2d\2d foo:  red; } .b { \2d\2d foo: red; }`,
		'.a{color:red}.b:dir(){color:red}',
		'.a{color:red}.b::dir(rtl){color:red}',
		'.a{color:red}.b:slotted(.item){color:red}',
		'.a{color:red}.b::slotted(){color:red}',
		'.a{color:red}.b::slotted(.item > .child){color:red}',
		'.a{color:red}.b::slotted(.item)::before{color:red}',
		'.a{color:red}.b::slotted(:unknown){color:red}',
		'@container style(--mode: a b){.a{color:red}}@container style(--mode:ab){.b{color:blue}}',
		'@container style(--mode: a  b){.a{color:red}}@container style(--mode: a b){.b{color:blue}}',
	],
	invalid: [{
		code: '.button { padding: 1rem; border-radius: 0.5rem; }\n.badge { padding: 1rem; border-radius: 0.5rem; }',
		output: '.button,\n.badge { padding: 1rem; border-radius: 0.5rem; }',
		errors: [{messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: '*|a{color:red}|b{color:red}',
		output: '*|a,|b{color:red}',
		errors: [{messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: '[|name]{color:red}[name]{color:red}',
		output: '[|name],[name]{color:red}',
		errors: [{messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: '&{color:red}.a{color:red}',
		output: '&,.a{color:red}',
		errors: [{messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: '@media (width > 1px) {\r\n  .a { color: red; }\r\n}\r\n@media (width > 1px) {\r\n  .b { color: blue; }\r\n}',
		output: '@media (width > 1px) {\r\n  .a { color: red; }\r\n  .b { color: blue; }\r\n}',
		errors: [{messageId: 'prefer-merged-rules/conditions'}],
	}, {
		code: '.a {\r\n\tcolor: red;\r\n}\r\n.b {\r\n\tcolor: red;\r\n}',
		output: '.a,\r\n.b {\r\n\tcolor: red;\r\n}',
		errors: [{messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: '.parent{@media (width>1px){color:red;&.a{color:blue}background:red}@media (width>1px){color:green;&.b{color:purple}border:0}}',
		output: '.parent{@media (width>1px){color:red;&.a{color:blue}background:red;color:green;&.b{color:purple}border:0}}',
		errors: [{messageId: 'prefer-merged-rules/conditions'}],
	}, {
		code: '@media all{@layer first;}@media all{@layer second;}',
		output: '@media all{@layer first;@layer second;}',
		errors: [{messageId: 'prefer-merged-rules/conditions'}],
	}, {
		code: '.a{color:red}.b{color:red}.c:unknown{color:red}.d{color:red}.e{color:red}',
		output: '.a,.b{color:red}.c:unknown{color:red}.d,.e{color:red}',
		errors: [{messageId: 'prefer-merged-rules/selectors'}, {messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: String.raw`.parent{@media all{--text: \;}@media all{color:red}}`,
		output: String.raw`.parent{@media all{--text: \;;color:red}}`,
		errors: [{messageId: 'prefer-merged-rules/conditions'}],
	}, {
		code: String.raw`.parent{@media all{--text: \;;}@media all{color:red}}`,
		output: String.raw`.parent{@media all{--text: \;;color:red}}`,
		errors: [{messageId: 'prefer-merged-rules/conditions'}],
	}, {
		code: String.raw`.a { --f\6fo: a  b; } .b { --foo: a  b; }`,
		output: String.raw`.a, .b { --f\6fo: a  b; }`,
		errors: [{messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: '.a:dir(ltr){color:red}.b:dir(rtl){color:red}',
		output: '.a:dir(ltr),.b:dir(rtl){color:red}',
		errors: [{messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: '.a:DIR(RTL){color:red}.b:dir(auto){color:red}',
		output: '.a:DIR(RTL),.b:dir(auto){color:red}',
		errors: [{messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: String.raw`.a:dir(\72tl){color:red}.b:dir(rtl){color:red}`,
		output: String.raw`.a:dir(\72tl),.b:dir(rtl){color:red}`,
		errors: [{messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: '.a::slotted(.item){color:red}.b::slotted(#item){color:red}',
		output: '.a::slotted(.item),.b::slotted(#item){color:red}',
		errors: [{messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: '.a::SLOTTED(:is(.item,#item)){color:red}.b{color:red}',
		output: '.a::SLOTTED(:is(.item,#item)),.b{color:red}',
		errors: [{messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: String.raw`.a::slotted(.\69tem){color:red}.b{color:red}`,
		output: String.raw`.a::slotted(.\69tem),.b{color:red}`,
		errors: [{messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: '.a{color:red}\n.a{color:red}\n.b{color:red}',
		output: '.a,\n.b{color:red}',
		errors: [{messageId: 'prefer-merged-rules/selectors'}],
	}, {
		code: '.parent{@supports (display:grid){--data:{a:b}}@supports (display:grid){color:red}}',
		output: '.parent{@supports (display:grid){--data:{a:b};color:red}}',
		errors: [{messageId: 'prefer-merged-rules/conditions'}],
	}, {
		code: '.parent{@media all{color:red!important}@media all{background:blue}}',
		output: '.parent{@media all{color:red!important;background:blue}}',
		errors: [{messageId: 'prefer-merged-rules/conditions'}],
	}, {
		code: '@media all{@layer{.a{color:red}}}@media all{@layer{.b{color:blue}}}',
		output: '@media all{@layer{.a{color:red}}@layer{.b{color:blue}}}',
		errors: [{messageId: 'prefer-merged-rules/conditions'}],
	}],
});

test.snapshot({
	valid: [
		'.a { color: red; } .b { color: blue; }',
		'.a { color: red; background: blue; } .b { background: blue; color: red; }',
		'.a { color: red; color: blue; } .b { color: blue; color: red; }',
		'.a { color: red !important; } .b { color: red; }',
		'.a { --Color: red; } .b { --color: red; }',
		'.a { --text: a b; } .b { --text: ab; }',
		'.a { content: "a b"; } .b { content: "ab"; }',
		'.a { width: calc(1px + 2px); } .b { width: calc(1px+2px); }',
		'.a { color: red; } .other { color: blue; } .b { color: red; }',
		'.a { color: red; } /* boundary */ .b { color: red; }',
		'.a {} .b {}',
		'.a { & .child { color: red; } } #b { & .child { color: red; } }',
		'@keyframes fade { from { opacity: 0; } 50% { opacity: 0; } }',
		'@-webkit-keyframes fade { from { opacity: 0; } 50% { opacity: 0; } }',
		'@media (width > 1px) {} @media (width > 1px) {}',
		'@media (width > 1px) { a {} } @media (width > 2px) { b {} }',
		'@media (width > 1px) { a {} } @supports (display: grid) { b {} }',
		'@media (width > 1px) { a {} } a { color: red; } @media (width > 1px) { b {} }',
		'@media (width > 1px) { a {} } /* boundary */ @media (width > 1px) { b {} }',
		'@layer theme { a {} } @layer theme { b {} }',
		'@layer { a {} } @layer { b {} }',
		'@scope (.a) { a {} } @scope (.a) { b {} }',
		'@starting-style { a {} } @starting-style { b {} }',
		'.a { color: red; } .b:unknown { color: red; }',
		'.a { color: red; } .b::-moz-placeholder { color: red; }',
		'.a { color: red; } .b:heading { color: red; }',
		'.a { color: red; } .b:state(active) { color: red; }',
		'.a { color: red; } .b:has(:has(.c)) { color: red; }',
		'.a { color: red; } svg|a { color: red; }',
		'.a { color: red; } [svg|fill] { color: red; }',
		'.a { color: red; } [foo="bar" s] { color: red; }',
		'.a { color: red; } [foo i] { color: red; }',
		'.a { color: red; } :lang(en fr) { color: red; }',
		'.a { color: red; } :lang(en,) { color: red; }',
		'.a { color: red; } :lang(,en) { color: red; }',
		'.a { color: red; } :lang(en,,fr) { color: red; }',
		'.a { color: red; } :nth-of-type(2n of .item) { color: red; }',
		'.a { color: red; } :nth-last-of-type(odd of .item) { color: red; }',
		'.a { width: random(1px, 2px); } .b { width: random(1px, 2px); }',
		'.a { --width: RANDOM(1px, 2px); } .b { --width: RANDOM(1px, 2px); }',
		'.a { color: random-item(--key, red, blue); } .b { color: random-item(--key, red, blue); }',
		String.raw`.a { width: r\61ndom(1px, 2px); } .b { width: r\61ndom(1px, 2px); }`,
		{code: '.a { color: ???; } .b { color: ???; }', languageOptions: {tolerant: true}},
		{code: '.a { color: red; } #1foo { color: red; }', languageOptions: {tolerant: true}},
	],
	invalid: [
		'.a{color:red}.b{color:red}.c{color:red}',
		'.a, .b { color: red; } .b, .c { color: red; }',
		'.a { color: red; } .a { color: red; }',
		'.a { color: red; } #b{ COLOR : red }',
		String.raw`.a { \63 olor: red; } .b { color: red; }`,
		String.raw`.\61 { color: red; } .b { color: red; }`,
		'.a { color: RED; } .b { COLOR: RED; }',
		'.a { color: red; color: blue !important; } .b { color: red; color: blue !important; }',
		'.a { --theme: a b; color: var(--theme); } .b { --theme: a b; color: var(--theme); }',
		'.a { content: "random()"; background: url("random()"); } .b { content: "random()"; background: url("random()"); }',
		'.a:hover { color: red; } .b:focus-visible { color: red; }',
		'.a::before { content: ""; } .b::after { content: ""; }',
		'.a:has(> .child) { color: red; } .b:is(.active, #selected) { color: red; }',
		'.a:where(.active) { color: red; } .b:not(.hidden) { color: red; }',
		'.a:nth-child(2n of .item) { color: red; } .b:nth-last-of-type(odd) { color: red; }',
		'.a:lang(en) { color: red; } .b:lang("fr") { color: red; }',
		'.a:lang(en, "fr") { color: red; } .b:nth-of-type(2n) { color: red; }',
		'.a:host(.active) { color: red; } .b { color: red; }',
		'.a,\n  .b { color: red; } .c,\n  .d { color: red; }',
		'.a, .a, .b { color: red; } .a, .c, .c, .d { color: red; }',
		'[foo="bar" i] { color: red; } [foo="baz"] { color: red; }',
		'.a:OPEN { color: red; } .b:popover-open { color: red; }',
		String.raw`.a:h\6fver { color: red; } .b:hover { color: red; }`,
		'.parent { & .a { color: red; } > .b { color: red; } }',
		'@media (width > 1px) { .a { color: red; } .b { color: red; } }',
		'@layer theme { .a { color: red; } .b { color: red; } }',
		'@scope (.parent) { .a { color: red; } .b { color: red; } }',
		'.a { color: red; /* keep */ } .b { color: red; }',
		'.a /* keep */ { color: red; } .b { color: red; }',
		'.a { color: red; } .b { color: /* keep */ red; }',
		'.a {\n  color: red;\n}\n.b {\n  color: red;\n}',
		'.a {\r\n\tcolor: red;\r\n}\r\n.b {\r\n\tcolor: red;\r\n}',
		'@media (width > 1px) { .a { color: red; } } @media (width > 1px) { .b { color: blue; } }',
		'@supports (display: grid) { .a { color: red; } } @supports (display:grid) { .b { color: blue; } }',
		'@container card (width > 1px) { .a { color: red; } } @container card (width>1px) { .b { color: blue; } }',
		'@MEDIA (width > 1px) { .a {} } @media (width > 1px) { .b {} }',
		'@media (width > 1px) { a {} } @media (width > 1px) { b {} } @media (width > 1px) { c {} }',
		'.parent { @media (width > 1px) { color: red } @media (width > 1px) { background: blue } }',
		'.parent { @supports (display: grid) { --text: a b } @supports (display: grid) { color: var(--text) } }',
		'@media (width > 1px) {\n  .a { color: red; }\n}\n@media (width > 1px) {\n  .b { color: blue; }\n}',
		'@media (width > 1px) {\r\n\t.a { color: red; }\r\n}\r\n@media (width > 1px) {\r\n\t.b { color: blue; }\r\n}',
		'@media (width > 1px) { /* keep */ .a {} } @media (width > 1px) { .b {} }',
		'@media /* keep */ (width > 1px) { .a {} } @media (width > 1px) { .b {} }',
		'.parent { @media (width > 1px) { & .a { color: red; } } @media (width > 1px) { & .b { color: red; } } }',
		'.parent { @container card (width > 1px) { color: red; } @container card (width > 1px) { background: blue; } }',
	],
});

const configuration = {
	files: ['**/*.css'],
	plugins: {css, cssicorn: plugin},
	language: 'css/css',
	rules: {'cssicorn/prefer-merged-rules': 'error'},
};

nodeTest('merges a long run in one fix', () => {
	const linter = new Linter();
	const selectors = Array.from({length: 30}, (_, index) => `.item-${index}`);
	const code = selectors.map(selector => `${selector} { color: red; }`).join('\n');
	const messages = linter.verify(code, configuration, {filename: 'test.css'});
	assert.equal(messages.length, 1);
	const {range, text} = messages[0].fix;
	const output = code.slice(0, range[0]) + text + code.slice(range[1]);
	assert.equal(output, `${selectors.join(',\n')} { color: red; }`);
	assert.deepEqual(linter.verify(output, configuration, {filename: 'test.css'}), []);
});

nodeTest('fixes converge with nesting and duplicate-selector rules', () => {
	const linter = new Linter();
	const combinedConfiguration = {
		...configuration,
		rules: {
			...configuration.rules,
			'cssicorn/prefer-nesting': 'error',
			'cssicorn/no-duplicate-selectors': 'error',
		},
	};
	const code = '@media (width > 1px) { .parent .a { color: red; } } @media (width > 1px) { .parent .b { color: red; } }';
	const result = linter.verifyAndFix(code, combinedConfiguration, {filename: 'test.css'});
	assert.equal(result.fixed, true);
	assert.deepEqual(result.messages, []);
	const secondResult = linter.verifyAndFix(result.output, combinedConfiguration, {filename: 'test.css'});
	assert.equal(secondResult.fixed, false);
	assert.equal(secondResult.output, result.output);
});
