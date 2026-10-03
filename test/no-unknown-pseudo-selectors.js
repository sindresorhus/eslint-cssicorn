import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			:hover, :focus-visible, :is(.foo, :not(.bar)), ::before, :before, :after, :first-line, :first-letter {}
			::view-transition-group(example), ::highlight(example), :active-view-transition-type(example), :heading(1) {}
		`,
		':hover(), :is, ::before() {}',
		':HOVER, ::BEFORE {}',
		String.raw`:h\6f ver, ::b\65 fore {}`,
		String.raw`:--custom, :--custom(value), :\2d \2d custom {}`,
		'@page :first {}',
		'@page :recto, :verso {}',
		'::first-letter::prefix, ::first-letter::suffix {}',
		// Vendor-prefixed pseudo-selectors are ignored
		'::-webkit-scrollbar, ::-webkit-inner-spin-button, ::-moz-focus-inner, ::-ms-clear {}',
		':-webkit-autofill, :-moz-focusring, ::-webkit-slider-thumb, :-webkit-any(.foo) {}',
		':-WEBKIT-AUTOFILL, ::-Moz-Focus-Inner {}',
		String.raw`:\2d webkit-autofill, ::\2d moz-focus-inner, ::-w\65 bkit-scrollbar {}`,
		'.foo:is(:hover, :-moz-focusring)::-webkit-scrollbar {}',
		// Framework pseudo-selectors are allowed by default
		':global(.foo) {} :global {} :local(.foo) {} :export {} :import("./other.css") {}',
		'.foo :deep(.bar) {} :slotted(div) {} .foo ::v-deep(.bar) {} ::v-slotted(div) {} ::v-global(.foo) {}',
		':host ::ng-deep .foo {}',
		':GLOBAL(.foo), ::NG-DEEP {}',
		{
			code: ':tooltip, :TOOLTIP(.foo), ::theme-part {}',
			options: [{allow: [':tooltip', '::theme-part']}],
		},
		{
			code: String.raw`:\3A theme {}`,
			options: [{allow: [String.raw`:\3A theme`]}],
		},
		{
			code: String.raw`:\:theme, :foo\( {}`,
			options: [{allow: [String.raw`:\:theme`, String.raw`:foo\(`]}],
		},
		{
			code: ':foo {}',
			options: [{allow: [String.raw`:\66 oo`]}],
		},
	],
	invalid: [
		':foucs {}',
		':hovr::befor {}',
		':is(.foo:foucs, :not(.bar:hovr)) {}',
		':has(> .foo:foucs), :nth-child(2n of :hovr), ::slotted(.bar:foucs) {}',
		'.foo { &:hovr {} }',
		'@supports selector(:foucs) {} @scope (:hovr) to (:foucs) {}',
		'::hover {}',
		':backdrop {}',
		':-hovr, ::_befor {}',
		// The framework names only count in the kind they are written in
		'::global(.foo) {} :ng-deep .foo {}',
		'::theme-part(.foo) {}',
		'::--custom {}',
		String.raw`:\3A backdrop {}`,
		':linK {}',
		{
			code: '::foo {}',
			options: [{allow: [':foo']}],
		},
	],
});
