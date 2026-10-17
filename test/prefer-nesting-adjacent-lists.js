import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

test({
	valid: [
		'.card .title, .card .subtitle { color: blue; } .card .body, .card .footer { color: green; }',
		'.card:hover { color: blue; } .card:focus, .card:active { color: green; }',
		'.a .title, .b .title { color: blue; } .b .body, .a .body { color: green; }',
		'thead > th, tfoot > th { text-align: left; } thead > td, tfoot > td { text-align: right; }',
		'.outer { &.a .title, &.b .title { color: blue; } &.a .body, &.b .body { color: green; } }',
		'.card .title, .card .subtitle {} /* keep */ .card .body {}',
	],
	invalid: [
		{
			code: '.card { color: red; } .card .title, .card .subtitle { color: blue; } .card .body, .card .footer { color: green; }',
			output: '.card { color: red; .title, .subtitle { color: blue; } .body, .footer { color: green; } }',
			errors: [{messageId: 'prefer-nesting/related-rules'}],
		},
	],
});
