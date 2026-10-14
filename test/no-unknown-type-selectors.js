import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import css from '@eslint/css';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);
const MESSAGE_ID = 'no-unknown-type-selectors';

test.snapshot({
	valid: [
		'input {} ul li {} DIV {}',
		'geolocation {} camera {} microphone {} usermedia {} fencedframe {} model {}',
		'svg {} circle {} foreignObject {} linearGradient {} feDropShadow {} discard {}',
		'math {} mrow {} mi {} annotation-xml {} mfrac {} mprescripts {} semantics {}',
		'mfenced {} menclose {} mglyph {} mlabeledtr {} maligngroup {} malignmark {} mstack {} mlongdiv {} msgroup {} msrow {} mscarries {} mscarry {} msline {}',
		'acronym {} MARQUEE {} font-face {} altGlyph {} hatchPath {}',
		'my-element {} app-widget {} x-foo {}',
		// Custom elements are in the HTML namespace, so they match ASCII case-insensitively.
		'MY-WIDGET {} x-Foo {} X-foo {}',
		String.raw`x-\41 {}`,
		'math-α {} emotion-😍 {} x-É {}',
		String.raw`d\69 v {} foreign\4f bject {} my-\65 lement {}`,
		'* {} svg|* {} *|* {} |* {}',
		'html|DIV {} svg|foreignObject {} *|mi {} |button {}',
		'.unknown {} #buton {} [unknown="lable"] {}',
		'@keyframes fade { from {} to {} 50% {} } @-webkit-keyframes fade { FROM {} TO {} }',
		'@keyframes fade { entry 0% {} exit 100% {} }',
		'@page invoice:left {} @page unknown {}',
		'@page invoice { @top-left { content: "buton"; } }',
		// WebVTT cue arguments remain opaque and have their own element vocabulary.
		'::cue(buton) {} ::cue-region(unknown) {}',
		':deep(:state(buton), ::part(lable), ::cue(unknown), :lang(buton)) {}',
		':lang(buton) {} :dir(lable) {} :state(unknown) {} ::part(unknown) {} ::highlight(unknown) {} ::view-transition-group(unknown) {} :active-view-transition-type(unknown) {}',
		':is(div, :where(button)) {} :has(> input) {} :nth-child(2n of li) {} ::slotted(span) {}',
		':deep(button) {} :global(div) {} :local(input) {} :slotted(span) {} ::v-deep(button) {} ::v-slotted(span) {} ::v-global(div) {}',
		{
			code: 'my-element {} app-widget {}',
			options: [{checkCustomElements: true, allow: ['my-element', 'app-widget']}],
		},
		{
			code: 'widget {} app|widget {} *|widget {} |widget {}',
			options: [{allow: ['widget']}],
		},
		{
			code: String.raw`w\69 dget {}`,
			options: [{allow: ['widget']}],
		},
		{
			code: 'app-widget {} APP-OTHER {} legacy {}',
			options: [{checkCustomElements: true, allow: [/^app-/iv, /^legacy$/v]}],
		},
		{
			code: 'widget {} widget {} app|widget {} :deep(widget, widget) {}',
			options: [{allow: [/^widget$/gv]}],
		},
		{
			code: 'widget {} widget {} :is(widget, widget) {}',
			options: [{allow: [/widget/vy]}],
		},
		{
			code: String.raw`app|w\69 dget {}`,
			options: [{allow: [/^widget$/v]}],
		},
		{
			code: 'div {} font-face {} annotation-xml {}',
			options: [{checkCustomElements: true}],
		},
		{
			code: '_:-ms-fullscreen, :root .x {}',
			options: [{allow: ['_']}],
		},
	],
	invalid: [
		'unknown {}',
		'buton {} .list > lable {}',
		'foreignobject {} lineargradient {} FEDROPSHADOW {}',
		'-my-element {} _my-element {}',
		String.raw`x-\20 foo {} x-\/foo {} x-\a {}`,
		'from {} to {}',
		'unknown, input, buton:hover {}',
		'ns|unknown {} *|buton {} |lable {}',
		String.raw`ns\|prefix|buton {} ns|bu\74 on {} unknown\|tag {}`,
		':is(buton, :where(lable)) {} :has(> unknown) {} :not(buton) {}',
		':nth-child(2n of buton) {} :nth-last-child(odd of lable) {} ::slotted(unknown) {} :host(buton) {} :host-context(lable) {}',
		':deep(buton) {} :slotted(lable) {} :global(unknown) {} :local(buton) {}',
		'::v-deep(buton) {} ::v-slotted(lable) {} ::v-global(unknown) {}',
		':deep(:is(buton, :deep(lable))) {}',
		String.raw`:\64 eep(buton) {} :\69 s(lable) {} ::\73 lotted(unknown) {}`,
		'/* 🌈 */\r\n:deep(\r\n  buton,\r\n  :global(lable)\r\n) {}',
		'div { & > buton {} @media (width > 0px) { lable {} } }',
		'@media (width > 0px) { buton {} } @supports (display: grid) { lable {} } @container card (width > 0px) { unknown {} } @layer theme { buton {} }',
		'@scope (buton) to (lable) { unknown {} } @supports selector(buton) {}',
		'buton /* keep */ > lable {}',
		{
			code: 'my-element {} :deep(app-widget) {}',
			options: [{checkCustomElements: true}],
		},
		{
			code: 'MY-WIDGET {}',
			options: [{checkCustomElements: true}],
		},
		{
			code: 'WIDGET {} other {}',
			options: [{allow: ['widget']}],
		},
		{
			code: 'app-widget {}',
			options: [{checkCustomElements: true, allow: ['/^app-/']}],
		},
		// MathML Content Markup is not rendered by browsers, and is a likely missing `.` before a class name.
		'card {} list {} root {} min {} max {} true {} apply {} condition {}',
		'piecewise {} fn {} mfraction {} piecewice {}',
		// MathML and SVG names are case-sensitive, including the `math` and `svg` root elements.
		'MI {} MATH {} Mrow {} SVG {}',
		// `<none/>` is not a MathML Core or MathML 4 element.
		'none {}',
		// Browser hacks are reported. Add `_` to `allow` to permit them.
		'_:-ms-fullscreen, :root .x {}',
		':deep(:nth-child(2n of lable), :global(:not(buton))) {}',
		':is(:deep(buton)) {} @supports selector(:deep(lable)) {}',
		'encoding {} function {}',
	],
});

// Regex options use explicit errors because the snapshot harness serializes options as YAML.
test({
	valid: [],
	invalid: [
		{
			code: 'app-widget {} other {} APP-WIDGET {}',
			options: [{checkCustomElements: true, allow: [/^app-/v]}],
			errors: [
				{messageId: MESSAGE_ID, data: {selector: 'other'}},
				{messageId: MESSAGE_ID, data: {selector: 'APP-WIDGET'}},
			],
		},
		{
			code: 'other-widget {} widget {} other-widget {}',
			options: [{checkCustomElements: true, allow: [/widget/vy]}],
			errors: [
				{messageId: MESSAGE_ID, data: {selector: 'other-widget'}},
				{messageId: MESSAGE_ID, data: {selector: 'other-widget'}},
			],
		},
	],
});

const lint = options => new Linter().verify('widget {}', {
	files: ['**'],
	language: 'css/css',
	plugins: {css, cssicorn: plugin},
	rules: {'cssicorn/no-unknown-type-selectors': ['error', options]},
}, {filename: 'file.css'});

nodeTest('rejects allow entries that are not strings or regular expressions', () => {
	for (const entry of [{}, {source: 'widget'}, new Date()]) {
		assert.throws(() => lint({allow: [entry]}), /allow.*strings or regular expressions/v);
	}
});

nodeTest('rejects invalid option shapes', () => {
	for (const options of [{unknown: true}, {checkCustomElements: 'yes'}, {allow: 'widget'}, {allow: [1]}]) {
		assert.throws(() => lint(options), /Key "rules"/v);
	}
});
