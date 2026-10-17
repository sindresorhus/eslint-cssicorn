import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

test({
	valid: [
		'@media (color) { .card::before { color: red; } } @layer theme { .card::before { color: blue; } }',
		'@media (color) { h1, .h1 { font-size: 2rem; } } @layer theme { h1, .h1 { font-size: 3rem; } }',
		'@media (color) { .card.active { color: red; } .card:hover { color: blue; } } .card .title { color: green; }',
		'@media (color) { @layer theme { .card.active { color: red; } .card:hover { color: blue; } } } .card .title { color: green; }',
		'.outer, #outer { @media (color) { &::before { color: red; } } @layer theme { &::before { color: blue; } } }',
		'@media (color) { .card::before { color: red; } } /* keep */ @layer theme { .card::before { color: blue; } }',
	],
	invalid: [],
});
