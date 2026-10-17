import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-nesting');

test({
	valid: [
		...['is', 'where'].flatMap(name => [
			`:${name}(.a, :unknown) .title { color: blue; }`,
			`.card :${name}(.a, :unknown) { color: blue; }`,
			`.card:${name}(.a, :unknown(#missing)).active { color: blue; }`,
			`.card > :${name}(.a, ::before) { color: blue; }`,
			`:${name}(.a, .invalid*) .title { color: blue; }`,
		]),
		'#chooser img:is(:-moz-broken, :not([src])) { visibility: hidden; }',
		':is(.a, :before).active { color: blue; }',
		'.card :is(.a > :unknown, .b) { color: blue; }',
		String.raw`:IS(.a, :un\6b nown) .title { color: blue; }`,
		'.card :is(.a, :unknown()) { color: blue; }',
		'.card :is(.a, :nth-child()) { color: blue; }',
		'.card :is(.a, :has(:has(.b))) { color: blue; }',
		'.card :where(.a, :unknown("&")) { color: blue; }',
		':is(.a, > .b) .title { color: blue; }',
		'.outer, #missing { :is(.a, :unknown) .title { color: blue !important; & .body { color: green; } } }',
		':is(:unknown, :also-unknown) .title { color: blue; }',
		'.card :where(::before, ::after) { color: blue; }',
		'.card:is(.a, :unknown(&)) { color: blue; }',
		'.outer { :is(.a, :unknown(&)) .title { color: blue; } }',
		'.outer { .card:where(.a, &) { color: blue; } }',
		':is(.a, :unknown) { color: blue; }',
		'@scope (.outer) { .card :is(.a, :unknown) { color: blue; } }',
		'.card :is(.a, /* keep */ :unknown) { color: blue; }',
	],
	invalid: [],
});
