import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { span {} > .child {} + .child {} ~ .child {} }',
		'a { & {} &:hover {} &.active {} &#identifier {} &[data-kind] {} &::before {} }',
		'a { span & {} .child & > span {} }',
		'a { && > .child {} & & > .child {} }',
		'a { & .child & {} & .child& {} }',
		'a { & :is(&, .child) {} }',
		'a { & :where(.child, &) {} }',
		'a { & :not(&) {} }',
		'a { & :has(> &) {} }',
		'a { & :nth-child(2n of &) {} }',
		'a { & :unknown(&) {} }',
		'a { & :is(:unknown(&), .child) {} }',
		String.raw`a { & :\69 s(&, .child) {} }`,
		'a { & --element:hover {} }',
		'a { & --element {} }',
		String.raw`a { & \2d \2d element:hover {} }`,
		'& .child {}',
		'@media all { & > .child {} }',
		'@scope (.root) { & .child {} }',
		'@scope (& .root) to (& .limit) {}',
		'@unknown { & .child {} }',
		'a { @unknown { & .child {} } }',
		'@keyframes animation { from {} to {} }',
		'@keyframes animation { & .child {} }',
		'a { @keyframes animation { from { & .child {} } } }',
		'a { --selector: & .child; content: "& .child"; background: url("&.svg"); }',
		{
			code: 'a { @supports (display: grid) { & .child {} } @container (width > 1px) { & .child {} } @scope (.root) { & .child {} } }',
			languageOptions: {tolerant: true},
		},
		'a { & |span {} }',
		'a { & |* {} }',
		'a { & .child & .grandchild {} }',
		'a { & :is(.child) & {} }',
		'a { & :is(&) .child {} }',
		'a { & :is(> &) {} }',
		'a { & :has(&) .child {} }',
		'a { & :unknown(&) .child {} }',
		'a { & [data-x] & {} }',
		'a { span &.child {} }',
		'a { &.child & {} }',
		'a { &:hover > .child {} }',
		'a { &[data-x] > .child {} }',
		'a { && .child {} }',
		String.raw`a { \26  .child {} }`,
		'a { --selector: & .child; }',
		'a { & --x > .child {} }',
		'a { & |span > .child {} }',
		'@-webkit-keyframes animation { & .child {} }',
		'a { @-webkit-keyframes animation { from { & .child {} } } }',
		// The parser rejects a nested selector starting with `+` directly followed by an identifier, like `+span`.
		'a { &+span {} & +svg|span {} &+-x {} }',
		String.raw`a { &+\73 pan {} }`,
		'a { &+SPAN:hover {} @media all { &+span.child {} } }',
		// The parser reads these nested rules without `&` as declarations.
		'a { & span::before {} & SPAN::PART(label) {} }',
		'a { & span:hover .a .b .c .d .e .f .g {} }',
		'a { & span:hover .a .b .c .d {} & span:hover.a.b.c.d.e.f {} }',
		'a { & span:hover, .a .b .c .d .e .f .g {} }',
	],
	invalid: [
		'a { & span {} }',
		'a { & .child {} }',
		'a { & > .child {} }',
		'a { & + .child {} }',
		'a { & ~ .child {} }',
		'a { &>.child {} }',
		'a { & :hover {} }',
		'a { & ::before {} }',
		'a { & * {} }',
		'a { & [data-kind] {} }',
		'a { & .child > span {} }',
		'a { & > .child & {} & + .child & {} & ~ .child & {} }',
		'a { & > :is(&, .child) {} }',
		'a { & .child, & > span, &:hover, span & {} }',
		'a, #identifier { & .child {} }',
		'a { & .child { & span {} } }',
		'a { @media all { & .child {} } }',
		'a { @layer components { & > .child {} } }',
		'a { @MEDIA all { & .CHILD {} } }',
		String.raw`a { @m\65 dia all { & .child {} } }`,
		'@supports (display: grid) { a { & .child {} } }',
		'@container (width > 1px) { a { & .child {} } }',
		'@scope (.root) { a { & .child {} } }',
		'a { /* before */ & /* after */ .child {} }',
		'a { &/* keep */ > .child {} }',
		'a { & > /* keep */ .child {} }',
		'a { & .child /* & */ {} }',
		'a { & [data-value="&"] {} }',
		'a { & :unknown("&") {} }',
		String.raw`a { & .\& {} }`,
		String.raw`a { & s\70 an {} }`,
		'a { & > --element:hover {} }',
		'a { & .child { color: red !important; --value: "&"; } }',
		String.raw`a { & :unknown(.\&) {} }`,
		'a { & :unknown(/* & */ .child) {} }',
		'a { & > |span {} }',
		'a { & *|span {} }',
		'a { & svg|span {} }',
		'a { & + .child ~ .sibling {} }',
		'a { & > .child + .sibling {} }',
		'a { & > .child, & span {} }',
		'a { &  > .child {} }',
		'a { & .child .grandchild {} }',
		'a { & ::-webkit-scrollbar {} }',
		'a { & /* keep */ > .child {} }',
		'a { /* c1 */ & /* c2 */ > .child /* c3 */ {} }',
		'a { & .CHILD {} }',
		'a { & SPAN {} }',
		String.raw`a { & .child\26 {} }`,
		String.raw`a { & .\63 hild {} }`,
		'a { & > .child { color: red !important; } }',
		'a { & > .child { & .grandchild {} } }',
		'a { & .child { & .grandchild { & span {} } } }',
		'a { & > .child { & span {} } & span {} }',
		'a { & + & {} }',
		'a { & ~ && {} }',
		'a { & { & .child {} } }',
		'a { & > :has(&) {} }',
		'a { & :is(.child) {} }',
		'a { & [href^="http://&"] {} }',
		'a { @media all { & .child { & span {} } } }',
		'a { @layer a { & .child {} } @layer b { & > .child {} } }',
		'@media all { @supports (display: grid) { a { & .child {} } } }',
		'a {\n\t& > .child {\n\t\t& span {}\n\t}\n}',
		'a { &+ span {} &+/* keep */span {} }',
		'a { &+*|span {} &+|span {} &+.child {} &+#identifier {} &+[data-x] {} &+:hover {} }',
		'a { &~span {} &>span {} }',
		'a { & span.child::before {} & > span::before {} & + span::before {} }',
		'a { & span:hover {} & span:not(.a, .b) {} }',
		// Only the start of the selector list decides whether the parser reads a rule.
		'a { .child, & span::after {} .child, &+span {} .child, & |span {} }',
		'a { & .child, & span::before {} }',
		'a { & span:hover /* a long comment */ /* before the block */ {} }',
		'a { & > span:before {} & .child:after {} & span:hover {} }',
		'a { .child, & span:before {} }',
		'a { & .child, & span:before {} }',
		// The parser reads these legacy pseudo-elements without `&` as rules.
		'a { & span:before {} & SPAN:AFTER {} & span:first-line {} & span:first-letter {} }',
		'a { & span:before, .child {} }',
		String.raw`a { & span:b\65 fore {} }`,
	],
});

test({
	valid: [],
	invalid: [
		{
			code: String.raw`a { & \7c span {} }`,
			output: String.raw`a { \7c span {} }`,
			errors: 1,
		},
		{
			code: 'a {\n  &   .child {}\n}',
			output: 'a {\n  .child {}\n}',
			errors: [{
				messageId: 'no-redundant-nesting-selector', line: 2, column: 3, endColumn: 4,
			}],
		},
		{
			code: 'a {\r\n\t&\t> .child {}\r\n}',
			output: 'a {\r\n\t> .child {}\r\n}',
			errors: 1,
		},
		{
			code: 'a {\r\n  &\r\n    .child {}\r\n}',
			output: 'a {\r\n  \r\n    .child {}\r\n}',
			errors: 1,
		},
	],
});

nodeTest('fixes selector lists and multiple nesting levels completely', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: {'cssicorn/no-redundant-nesting-selector': 'error'},
	};
	const cases = [
		{
			code: 'a { & .child, & > span, &:hover, span & {} }',
			output: 'a { .child, > span, &:hover, span & {} }',
		},
		{
			code: 'a { & .child { & span {} } }',
			output: 'a { .child { span {} } }',
		},
		{
			code: String.raw`a { & .child, & --element:hover, & |span, & \7c span {} }`,
			output: String.raw`a { .child, & --element:hover, |span, \7c span {} }`,
		},
	];
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.fixed, true);
		assert.deepEqual(result.messages, []);
		assert.equal(result.output, output);
	}
});

// Regression test: every `&` removal in a prelude must apply in the same pass. A fix that replaces the whole prelude removes one `&` per pass, and ESLint stops after 10 passes.
nodeTest('removes every redundant `&` in a long nested selector list in one fix run', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: {'cssicorn/no-redundant-nesting-selector': 'error'},
	};
	const names = Array.from({length: 12}, (_, index) => `.item${index}`);
	const result = linter.verifyAndFix(`.list { ${names.map(name => `& ${name}`).join(', ')} {} }`, config, {filename: 'test.css'});
	assert.deepEqual(result.messages, []);
	assert.equal(result.output, `.list { ${names.join(', ')} {} }`);
});

nodeTest('fixes converge with prefer-nesting', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: {
			'cssicorn/prefer-nesting': 'error',
			'cssicorn/no-redundant-nesting-selector': 'error',
		},
	};
	const cases = [
		{
			code: '.parent {} .parent span { color: red; }',
			output: '.parent { span { color: red; } }',
		},
		{
			code: ':is(.first, .second) span { color: red; }',
			output: '.first, .second { span { color: red; } }',
		},
	];
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.fixed, true);
		assert.deepEqual(result.messages, []);
		assert.equal(result.output, output);
		const repeated = linter.verifyAndFix(result.output, config, {filename: 'test.css'});
		assert.equal(repeated.fixed, false);
		assert.deepEqual(repeated.messages, []);
		assert.equal(repeated.output, output);
	}
});

// The parser reads a nested rule starting like `span::before` as a declaration. Every rule that edits a nested rule prelude replaces the whole prelude, so ESLint applies at most one of these fixes per pass, and each fix checks that its own result still parses. A fix that would only parse with `&` adds it back, so the rules converge.
nodeTest('fixes from different rules in one nested prelude keep the file parsable', () => {
	const linter = new Linter();
	const config = {
		...plugin.configs.all,
		rules: {
			'cssicorn/prefer-nesting': 'error',
			'cssicorn/prefer-modern-syntax': 'error',
			'cssicorn/no-redundant-nesting-selector': 'error',
			'cssicorn/no-useless-is': 'error',
		},
	};
	const cases = [
		{
			code: 'a { & span:before { color: red; } }',
			output: 'a { & span::before { color: red; } }',
		},
		{
			code: 'a { & span:AFTER, .child { color: red; } }',
			output: 'a { & span::AFTER, .child { color: red; } }',
		},
		{
			code: 'a { & > span:before { color: red; } }',
			output: 'a { > span::before { color: red; } }',
		},
		{
			code: 'a { & .child:first-letter { color: red; } }',
			output: 'a { .child::first-letter { color: red; } }',
		},
		{
			code: '.quote {} .quote p:before { content: "x"; }',
			output: '.quote { & p::before { content: "x"; } }',
		},
		{
			code: '.wrap {\n\t:is(a) :before { color: red; }\n}',
			output: '.wrap {\n\t& a ::before { color: red; }\n}',
		},
		{
			code: '.wrap { &\n:is(a)::before {} }',
			output: '.wrap { \n& a::before {} }',
		},
		{
			code: '.card { & :is(a) :is(b):before, & :is(c) :after { color: red; } }',
			output: '.card { a b::before, c ::after { color: red; } }',
		},
	];
	for (const {code, output} of cases) {
		const result = linter.verifyAndFix(code, config, {filename: 'test.css'});
		assert.equal(result.fixed, true);
		assert.deepEqual(result.messages, []);
		assert.equal(result.output, output);
	}
});
