import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

test({
	valid: [
		'@media (color) { .card { color: red; } } .card .title { color: blue; }',
		'@media (color) { .card .title { color: blue; } } @media (width > 900px) { .card .body { color: green; } }',
		'@layer { .card.small { color: red !important; } } @layer { .card.large { color: blue !important; } }',
		'@supports (display: grid) { @media (color) { .card { color: red; } } } .card:hover { color: blue; }',
		'.outer { @media (color) { &.card.small { color: red; } } @layer theme { &.card.large { color: blue; } } }',
		'@media (color) { .card { color: red; /* keep */ } } .card:hover { color: blue; }',
	],
	invalid: [],
});
