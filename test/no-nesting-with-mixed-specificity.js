import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'#dialog, .dialog {}',
		'#dialog, > .dialog { .close {} }',
		'#dialog, .dialog* { & .close {} }',
		'#dialog, .dialog { @media (width > 40rem) { color: red; } }',
		'#dialog { & .close {} }',
		'#dialog, #modal { & .close {} }',
		'.dialog, [open] { & .close {} }',
		'dialog, ::before { & .close {} }',
		'#dialog::before, .dialog { & .close {} }',
		'#dialog::before, .dialog { .close {} }',
		'::before { .dialog, #dialog { .close {} } }',
		'.root { &::before { .dialog, #dialog { .close {} } } }',
		'.root { &::before { @media (width > 40rem) { .dialog, #dialog { .close {} } } } }',
		'.dialog, :hover { & .close {} }',
		'*, :where(#dialog) { & .close {} }',
		':is(> #dialog, *), * { & .close {} }',
		':matches(.dialog, #dialog), #modal { & .close {} }',
		':matches(*), * { & .close {} }',
		'a:unknown, #dialog, .dialog { & .close {} }',
		'a:is(), #dialog, .dialog { & .close {} }',
		'a:hover(value), #dialog, .dialog { & .close {} }',
		'a::before(value), #dialog, .dialog { & .close {} }',
		String.raw`:\62 efore, dialog { & .close {} }`,
		':before, .dialog { & .close {} }',
		':nth-child(2n of #dialog), #modal:hover { & .close {} }',
		':nth-last-child(2n of #dialog), #modal:hover { & .close {} }',
		':host(#dialog), #modal:hover { & .close {} }',
		':host-context(#dialog), #modal:hover { & .close {} }',
		'::slotted(#dialog), #modal { & .close {} }',
		'ns|*, |* { & .close {} }',
		'@scope (#dialog) { #dialog { .close {} } }',
		'@scope (.root) { &, :where(.x) { .child {} } }',
		'.root { :is(&), & { .child {} } }',
		'.root { :has(> &), & { .child {} } }',
		'.root { :is(:unknown(&), .bar), & { .child {} } }',
		String.raw`.root { :is(:unknown("&"), :unknown(\26), :unknown(foo /* & */), .bar), &:hover { .child {} } }`,
		'.root { .theme &, &.theme { .child {} } }',
		'.root { :nth-child(2n of &), &:hover { .child {} } }',
		'.root { > &, && { .child {} } }',
		'.button:is(:hover, :focus) {}',
		'.button:not(.disabled, [hidden]) {}',
		'.button:has(> .icon, + [hidden]) {}',
		'.button:nth-child(even of .item, [hidden]) {}',
		'.button:nth-last-child(odd of .item, :hover) {}',
		':is(.item, [hidden], :hover) {}',
		':is(.item > a, b.item) {}',
		':is(:nth-child(2n of .item), .other.active) {}',
		':is(:hover) {}',
		':nth-child(2n) {}',
		':nth-last-child(odd) {}',
		':where(:is(.item, #featured)) {}',
		':WHERE(:not(.item, #featured)) {}',
		':where(:has(> .item, #featured)) {}',
		':where(:nth-child(2n of .item, #featured)) {}',
		':where(:is(:not(.item, #featured), .other)) {}',
		':is(:where(#featured), :where(.item)) {}',
		'.root { :is(&, .item) {} }',
		'.root { .target:is(&, .item) {} }',
		'.root { :not(&, .item) {} }',
		'.root { :has(> &, + .item) {} }',
		'.root { :nth-child(2n of &, .item) {} }',
		'.root { :nth-last-child(odd of &, .item) {} }',
		'.root { .child { :is(&, .item.child) {} } }',
		':is(::before, .item) {}',
		':is(> #featured, .item) {}',
		':is(:unknown, .item) {}',
		':not(::before, .item, #featured) {}',
		':not(> .item, #featured) {}',
		':has(::before, .item, #featured) {}',
		':nth-child(2n of ::before, .item, #featured) {}',
		String.raw`:\69 s(.item, #featured) {}`,
		'@supports selector(:is(.item, #featured)) { .item {} }',
		'@scope (:is(.item, #featured)) to (:not(.item, #featured)) { .item {} }',
		'.item { --selector: :is(.item, #featured); content: ":not(.item, #featured)"; background: url(":has(.item, #featured)"); }',
		':is(#ignored >, .item, :hover) {}',
		':where(.root) { :is(&, *) {} }',
		'.root { > .child { :is(&, .root.child) {} } }',
		'@namespace svg url("http://www.w3.org/2000/svg"); :is(svg|*, *) {}',
		outdent`
			.dialog, .modal {
				&, & {
					.close {}
				}
			}
		`,
		// Equal-specificity parents
		'.dialog, .modal { & .close {} }',
		'.btn:hover, .btn:focus { & .icon {} }',
		'[data-state], :focus-visible { & .close {} }',
		':is(.a, .b) { & .c {} }',
		':HOVER, .dialog { & .close {} }',
		String.raw`.foo\:bar, .other { & .close {} }`,
		// Ordinary selector lists without nesting are allowed
		'#dialog, .dialog, span {}',
		// `:where()` neutralizes a nested selector list
		'.card:where(:is(.active, #id)) {}',
		// Selector-list arguments with equal specificity
		':is(.a.b, .c:hover) {}',
		':is(#a, #b) {}',
		':not([a], [b]) {}',
		'.x:has(> .a, + .b) {}',
		// Ignored pseudo-element argument leaves only one representable selector
		':is(::before, #featured) {}',
		// Comment inside an equal-specificity parent list
		'.dialog, /* keep */ .modal { & .close {} }',
		// Transparent at-rules
		'@supports (display: grid) { .dialog, .modal { & .close {} } }',
		'@layer base { .dialog, .modal { & .close {} } }',
		// `@scope` stops parent resolution
		'@scope (.root) { .dialog, .modal { & .close {} } }',
		// Direct pseudo-element parent branch is ignored
		'::marker { .a, #b { .c {} } }',
		'.root { &::after { .a, #b { .c {} } } }',
		// Non-standard pseudo-class is not representable, so it is ignored
		':-webkit-autofill, #dialog { & .close {} }',
	],
	invalid: [
		'#dialog, .dialog { & .close {} }',
		'#dialog, .dialog { .close {} }',
		'#dialog, .dialog { &::before {} }',
		'#dialog, .dialog { ::before {} }',
		'button, .button { & .icon {} }',
		'[open], dialog { & .close {} }',
		':hover, dialog { & .close {} }',
		':where(#dialog), :is(.dialog, #dialog) { & .close {} }',
		':is(::before, *), div { & .close {} }',
		':nth-child(2n of #dialog), #modal { & .close {} }',
		':host(#dialog), #modal { & .close {} }',
		'&, :hover { .close {} }',
		'*|dialog, |* { & .close {} }',
		'@scope (.root) { #dialog, .dialog { .close {} } }',
		'@scope (.root) { #dialog, > .dialog { .close {} } }',
		'#dialog, .dialog { @MEDIA (width > 40rem) { & .close {} } }',
		'.root { :where(&), & { .child {} } }',
		'.root { :is(:unknown(&), .bar), &:hover { .child {} } }',
		'.root { > &, & { .child {} } }',
		'#root, .root { .child { .grandchild {} } }',
		outdent`
			#dialog,
			.dialog {
				& .close {}
				& .submit {}
			}
		`,
		outdent`
			#dialog,
			.dialog {
				@media (width > 40rem) {
					@layer components {
						& .close {}
					}
				}
			}
		`,
		'.root { #dialog, .dialog { .close {} } }',
		'.root { &&, & { .close {} } }',
		'#dialog::before, .dialog { #inner, .inner { .grandchild {} } }',
		':is(.dialog, #dialog), #modal { & .close {} }',
		':not(.dialog, #dialog), #modal { & .close {} }',
		':has(.dialog, #dialog), #modal { & .close {} }',
		'.button:is(:hover, #featured) { color: blue; }',
		'.button:not(:hover, #featured) {}',
		'.button:has(> .icon, + #featured) {}',
		'.button:nth-child(even of .item, #featured) {}',
		'.button:nth-last-child(odd of .item, #featured) {}',
		':is(a, .item) {}',
		':is(.one.two, #featured) {}',
		':is(.item, /* Keep this comment. */ #featured) {}',
		':IS(.item, #featured) {}',
		':NOT(.item, #featured) {}',
		':HAS(> .item, #featured) {}',
		':NTH-CHILD(2n of .item, #featured) {}',
		':NTH-LAST-CHILD(odd of .item, #featured) {}',
		String.raw`:is(.\69 tem, #\66 eatured) {}`,
		':is(:where(#featured), .item) {}',
		':where(.item):is(.item, #featured) {}',
		':is(:not(.item, #featured), #other) {}',
		':is(.item, #featured):has(.icon, #icon) {}',
		'#root { :is(&, .item) {} }',
		'.root { :is(&&, &) {} }',
		'.root { :has(> &&, + &) {} }',
		'.root { .child { :is(&, .item) {} } }',
		'#root, .root { &:is(.item, #featured) {} }',
		'@media (width > 40rem) { :is(.item, #featured) {} }',
		'@supports (display: grid) { :not(.item, #featured) {} }',
		'@container (width > 40rem) { :has(.item, #featured) {} }',
		'@layer components { :nth-child(2n of .item, #featured) {} }',
		'@scope (.root) { :nth-last-child(odd of .item, #featured) {} }',
		'.root { @media (width > 40rem) { @layer components { :is(&, #featured) {} } } }',
		'.button:is(:hover, #featured)::before { content: ""; }',
		'#root, .root { :is(&, #featured) {} }',
		':is(:unknown, .item, #featured) {}',
		'.root { :nth-last-child(odd of &&, &) {} }',
		':nth-child(2n of :is(.item, #featured), .other) {}',
		'::slotted(:is(.item, #featured)) {}',
		'.root, #root { :is(&, #featured) {} }',
		'@namespace svg url("http://www.w3.org/2000/svg"); :is(svg|*, svg|circle) {}',
		// Nested rules under a mixed-specificity parent list
		'#dialog, .dialog { .close { .icon {} } }',
		':matches(.dialog, #dialog), .modal { & .close {} }',
		'#dialog, /* keep */ .dialog { & .close {} }',
		':nth-child(2n of .item), #modal { & .close {} }',
		':HOVER, #dialog { & .close {} }',
		String.raw`.foo\:bar, #baz { & .close {} }`,
		// Transparent at-rules resolve the parent
		'@supports (display: grid) { #dialog, .dialog { & .close {} } }',
		'@container (width > 40rem) { #dialog, .dialog { & .close {} } }',
		'@layer components { #dialog, .dialog { & .close {} } }',
		'@media (width > 40rem) { @supports (display: grid) { #dialog, .dialog { & .close {} } } }',
		// Selector-list pseudo-classes with mixed-specificity arguments
		':is(:where(#featured), .button) {}',
		':is(.a, #b, .c) {}',
		':is(.a, .b.c) {}',
		':is(#a, [b]) {}',
		':not(:where(.a, #b), #c) {}',
		':is(.a, ::before, #b) {}',
		':is(a b, #c) {}',
		':is(.a, #b):not(.c, #d) {}',
		// A single parent selector is never mixed, only its arguments report
		':is(.a, #b) { & .c {} }',
		// A parent selector list across lines
		outdent`
			#dialog,
			.dialog {
				& .close {}
			}
		`,
	],
});

test({
	valid: [],
	invalid: [{
		code: '.button:is(\r\n\t:hover,\r\n\t#featured\r\n) { color: blue; }',
		errors: [{
			messageId: 'mixed-specificity-arguments',
			data: {name: 'is', specificities: '0-1-0, 1-0-0'},
			column: 8,
			endLine: 4,
			endColumn: 2,
		}],
	}],
});
