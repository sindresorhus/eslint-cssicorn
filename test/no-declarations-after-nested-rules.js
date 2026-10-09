import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { color: red; }',
		'a { color: red; b {} }',
		'a { color: red; @media (width > 0px) {} }',
		'a { b {} }',
		'a { b {} & { color: red; } }',
		'a { @layer theme; color: red; }',
		'a { @unknown; color: red; }',
		'a { @media (width > 0px) { color: red; } }',
		'a { b { color: red; c {} } }',
		'a { b {} /* comment */ }',
		'@page { margin: 1cm; @top-left { content: "Page"; } }',
		// A statement at-rule without a block is not a nested rule.
		'a { color: red; @layer theme; }',
		'a { color: red; @unknown; }',
		'a { color: red; @media (width > 0px) { @layer theme; color: blue; } }',
		'a { color: red !important; b {} }',
		'a { --custom-property: value; b {} }',
		'@media (width > 0px) { a { color: red; b {} } }',
		'@supports (display: grid) { a { color: red; b {} } }',
		'@container (width > 0px) { a { color: red; b {} } }',
		'@scope (.card) { a { color: red; b {} } }',
		'@page { margin: 1cm; @top-left { content: "Page"; } @bottom-right { content: "Page"; } }',
	],
	invalid: [
		'a { b {} color: red; }',
		'a { & {} color: red; }',
		'a { @media (width > 0px) {} color: red; }',
		'a { @starting-style {} color: red; }',
		'a { @unknown {} color: red; }',
		'a { b {} --custom-property: value; }',
		'a { b {} @layer theme; color: red; }',
		'@page { @top-left { content: "Page"; } margin: 1cm; }',
		'a { color: red; b {} background: blue; border: 0; c {} opacity: 1; }',
		outdent`
			a {
				@media (width > 0px) {
					b {}
					color: red;
				}
			}
		`,
		outdent`
			.message {
				@media (width >= 600px) {
					padding: 16px;
				}

				/* Keep this comment. */
				padding: 8px;
			}
		`,
		'a { b {} color: red; background: blue; }',
		'a { b {} c {} color: red; display: block; }',
		'a { b {} COLOR: RED; }',
		'a { b {} color: red !important; }',
		'a { b {} /* comment */ color: red; }',
		'a { b {} color: /* keep */ red; }',
		'a { b {} @media (width > 0px) {} color: red; }',
		'a { &:hover {} color: red; }',
		'a { color: red; b {} background: blue; }',
		'@media (width > 0px) { a { b {} color: red; } }',
		'@supports (display: grid) { a { b {} color: red; } }',
		'@container (width > 0px) { a { b {} color: red; } }',
		'@layer theme { a { b {} color: red; } }',
		'@scope (.card) { a { b {} color: red; } }',
	],
});
