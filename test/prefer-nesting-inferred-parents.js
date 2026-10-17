import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

test({
	valid: [
		'.a .title, .b .title, .a .body, .b .body { color: blue; }',
		'.a::before, .b::before { content: "test"; }',
		'ol ol, ul ul, ol ul, ul ol { margin-bottom: 0; }',
		'[role=search] button, [role=search] [type=submit], [role=group] button, [role=group] [type=submit] { border: 0; }',
		'.outer { > .card .title, + .panel .title, > .card .body, + .panel .body { color: red; } }',
		'.outer { .a:where(&) .title, .b:where(&) .title, .a:where(&) .body, .b:where(&) .body { color: blue; } }',
		'.outer { &.a .title, &.b .title { color: red; } &.a .body, &.b .body { color: blue; } }',
		'.a .title, .b /* keep */ .title, .a .body, .b .body { color: blue; }',
	],
	invalid: [],
});
