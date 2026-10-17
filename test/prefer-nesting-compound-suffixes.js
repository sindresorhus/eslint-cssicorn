import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

test({
	valid: [
		'.outer { .small.card, .large.card { color: red; } }',
		'.outer { .small.card { color: red; } .large.card { color: blue; } }',
		'.outer { button.card, input.card { color: red; } }',
		'.outer { .theme.small &.card, .theme.large &.card { color: red; & .title { color: blue; } } }',
		'.outer { .card { color: red; } .active.card .title { color: blue; } }',
		'.outer { .card { color: red; } button:not(.disabled).card:hover { color: blue; } }',
		'.outer { .card:not(&) { color: red; } .theme .card:not(&).active { color: blue; } }',
		'.outer { .small.card, /* keep */ .large.card { color: red; } }',
	],
	invalid: [],
});
