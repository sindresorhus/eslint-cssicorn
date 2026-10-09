import assert from 'node:assert/strict';
import {test as nodeTest} from 'node:test';
import {ESLint} from 'eslint';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { transition: opacity 200ms; transition-property: transform; will-change: background; }',
		'a { transition: margin 1s, display 1s allow-discrete; will-change: color, width; }',
		'a { transition-property: border, margin-inline, transform-origin; will-change: transition, transition-property; }',
		'a { transition: 200ms; }',
		...['all', 'none', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end', 'normal', 'allow-discrete'].map(name => `a { transition: ${name} 200ms; }`),
		'a { transition-property: all; }',
		'a { transition-property: none; }',
		'a { will-change: auto; }',
		'a { will-change: scroll-position, contents; }',
		...['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'revert-rule'].map(name => `a { transition: ${name}; transition-property: ${name}; will-change: ${name}; }`),
		'a { TRANSITION: OPACITY 200MS EASE; TRANSITION-PROPERTY: TRANSFORM; WILL-CHANGE: CONTENTS; }',
		String.raw`a { tr\61 nsition: \6f pacity 200m\73  \65 ase; transition-property: tr\61 nsform; will-change: \63 ontents; }`,
		String.raw`a { transition: \69 nherit; transition-property: \61 ll; will-change: \61 uto; }`,
		'a { transition: /* before */ INHERIT /* after */ !important; will-change: /* before */ revert-layer /* after */; }',
		String.raw`a { transition-property: \00006f pacity; will-change: TRANS\000046 ORM; }`,
		'a { -webkit-transition: opacity 1s; -moz-transition-property: transform; }',
		'a { transition: --progress 1s; transition-property: --progress; will-change: --progress; }',
		String.raw`a { transition: \2d \2d progress 1s; will-change: \2d \2d progress; }`,
		'a { transition: -webkit-transfrom 1s; transition-property: -moz-opactiy; will-change: -webkit-transfrom; }',
		String.raw`a { transition: \2d WEBKIT-transfrom 1s; transition-property: -m\6f z-opactiy; }`,
		String.raw`a { will-change: \2d webkit-transfrom, \2d \2d default, --ALL; }`,
		'a { --transition: opactiy 200ms; color: transfrom; animation: opactiy 1s; }',
		String.raw`a { \2d \2d transition: opactiy 200ms; }`,
		'a { transition: var(--transition, opactiy 1s); transition-property: env(properties, transfrom); will-change: attr(data-properties); }',
		'a { transition: opacity 1s cubic-bezier(0, 0, 1, 1), transform 1s steps(2, jump-start), color 1s linear(0, 1); }',
		'a { transition: opacity calc(1s + var(--delay)) EASE-IN-OUT -200ms; }',
		'a { transition: "opactiy"; transition-property: url("transfrom"); will-change: custom(transfrom); }',
		'a { transition: opacity 1s /* opactiy */; will-change: transform !important; }',
		'@supports (transition: opactiy 1s) {}',
		'@supports (transition-property: transfrom) and (will-change: default) {}',
		'@import "a.css" supports(transition: opactiy 1s);',
		'@container style(will-change: transfrom) {}',
		'@font-face { transition: opactiy 1s; }',
		'@PROPERTY --example { will-change: transfrom; }',
		String.raw`@font-palette-values --palette { transition-property: transfrom; } @pr\6f perty --example { transition: opactiy 1s; }`,
		':export { transition: opactiy 1s; } :import("a.css") { will-change: transfrom; }',
		String.raw`:EXPORT { transition-property: transfrom; } :\69 mport("a.css") { transition: opactiy 1s; }`,
		// Repeated shorthand keywords are intentionally not disambiguated as property names.
		'a { transition: ease ease 1s, normal normal 1s; }',
		// General value grammar is left to css/no-invalid-properties.
		'a { will-change: auto, opacity; transition-property: none, opacity; }',
		{
			code: 'a { transition: future-property 1s; transition-property: future-property; will-change: future-property; }',
			languageOptions: {customSyntax: {properties: {'future-property': '<length>'}}},
		},
		{
			code: String.raw`a { transition: FUTURE-PROPERTY 1s; will-change: future\2d property; }`,
			languageOptions: {customSyntax: {properties: {'future-property': '<length>'}}},
		},
		{
			code: '@custom-descriptors { transition: opactiy 1s; transition-property: transfrom; will-change: default; }',
			languageOptions: {
				customSyntax: {
					atrules: {'custom-descriptors': {descriptors: {transition: '<custom-ident>'}}},
				},
			},
		},
		// Exempt keywords mixed with known property names.
		'a { transition-property: all, none, opacity, transform; }',
		// Only identifiers are checked; times, keywords, and functions are ignored.
		'a { transition: 1s linear, 2s opacity; }',
		'a { transition: opacity; }',
		'a { transition: opacity 1s ease-in-out, transform 1s ease-out; }',
		'a { transition: opacity 1s allow-discrete, transform 1s; }',
		'a { transition: opacity 1s, transform 1s, color 1s; }',
		'a { will-change: transform, opacity, filter; }',
		// Other vendor-prefixed declarations are recognized.
		'a { -o-transition: opacity 1s; -ms-transition-property: transform; }',
		// Known property names are allowed even when the reference is unusual.
		'a { transition: will-change 1s, content-visibility 1s; }',
		'a { transition-property: will-change; }',
		// Custom property references are ignored anywhere in the value.
		'a { transition: --foo, opacity 1s; }',
		'a { will-change: opacity, var(--extra); }',
		// Function arguments are not resolved.
		'a { will-change: foo(transfrom); }',
		'@media (min-width: 1px) { a { transition: opacity 1s; } }',
		'@layer base { a { will-change: transform; } }',
		'@scope (.card) { a { transition: opacity 1s; } }',
	],
	invalid: [
		'a { transition: opactiy 200ms; }',
		'a { transition-property: opactiy; }',
		'a { will-change: transfrom; }',
		'a { transition-property: opacity, transfrom, colr; }',
		'a { will-change: scroll-position, transfrom, contents, opactiy; }',
		'a { transition: 200ms ease opactiy, transfrom 1s steps(2, end) -200ms allow-discrete; }',
		'a { transition: opactiy var(--time); transition-property: var(--name), transfrom; will-change: var(--features), colr; }',
		'a { transition: var(--transition), opactiy 1s; }',
		'a { transition-property: ease, linear, normal, allow-discrete, auto, scroll-position, contents; }',
		...['ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end'].map(name => `a { transition-property: ${name}; }`),
		'a { transition: auto 1s, scroll-position 1s, contents 1s; }',
		'a { will-change: ease, normal, allow-discrete; }',
		...['ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end'].map(name => `a { will-change: ${name}; }`),
		...['none', 'all', 'will-change'].map(name => `a { will-change: ${name}; }`),
		'a { will-change: opacity, all, none, will-change; }',
		'a { transition: default 1s; transition-property: default; will-change: default; }',
		...['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'revert-rule'].map(name => `a { transition: ${name} 1s; transition-property: opacity, ${name}; will-change: ${name}, color; }`),
		'a { TRANSITION: OPACTIY 200ms; WILL-CHANGE: ALL; }',
		String.raw`a { tr\61 nsition: opact\69 y 200ms; will-change: \61 ll; }`,
		String.raw`a { transition-property: opacity, \69 nherit; }`,
		String.raw`a { TRANSITION-PROPERTY: D\45 FAULT; WILL-CHANGE: N\4f NE, WILL\2d CHANGE; }`,
		'a { transition: inherit /* keep */ 1s; transition-property: /* keep */ unset, var(--name); will-change: var(--name), revert-layer; }',
		String.raw`a { -w\65 bkit-transition: opactiy 200ms; -MOZ-transition-property: transfrom; }`,
		String.raw`a { -WEBKIT-WILL-CHANGE: transfrom; will\2d change: opactiy; transition\2d property: colr; }`,
		'a { will-change: İnset; }',
		'a { transition-property: constructor, __proto__; }',
		'a { transition-property: opacityy, opacity-unknown, -transfrom; }',
		'a { transition: /* before */ opactiy /* after */ 1s !important; }',
		'a { transition: "opactiy", transfrom 1s url("colr") custom(default); }',
		'a { will-change: --progress, -webkit-transform, transfrom, --default, default; }',
		'a { transition-property: opacity /* transfrom */, colr; }',
		'a { & > b { transition: opactiy 1s; } }',
		'@media (width > 1px) { a { will-change: transfrom; } }',
		'@supports (transition: opactiy 1s) { a { transition: opactiy 1s; } }',
		'@container (width > 1px) { a { transition-property: opactiy; } }',
		'@layer components { a { will-change: transfrom; } }',
		'@scope (.card) { a { transition: opactiy 1s; } }',
		'a { @starting-style { will-change: transfrom; } }',
		'@supports (will-change: transfrom) { a { will-change: transfrom; } }',
		'@container style(transition-property: opactiy) { a { transition-property: opactiy; } }',
		'@keyframes fade { from { transition-property: opactiy; } to { will-change: transfrom; } }',
		'@-webkit-keyframes fade { 50% { transition: opactiy 1s; } }',
		':root { transition: opactiy 1s; } .card:export { will-change: transfrom; }',
		':export, .card { transition-property: opactiy; }',
		'@media print { :export { transition: opactiy 1s; } a { transition: opactiy 1s; } }',
		{
			code: 'a { transition: future-property 1s, future-proprety 1s; will-change: future-property, future-proprety; }',
			languageOptions: {customSyntax: {properties: {'future-property': '<length>'}}},
		},
		{
			code: 'a { transition: default 1s; will-change: all, none, will-change; }',
			languageOptions: {customSyntax: {properties: {default: '<length>', none: '<length>'}}},
		},
		{
			code: 'a { transition: opacity 1s; transition-property: opacity; will-change: opacity; }',
			languageOptions: {customSyntax: {properties: {opacity: null}}},
		},
		{
			code: '@custom-group example { a { transition-property: opactiy; } }',
			languageOptions: {customSyntax: {atrules: {'custom-group': {prelude: '<custom-ident>'}}}},
		},
		'a { @media print { transition: opactiy 1s; } }',
		'a { @supports (will-change: transfrom) { will-change: transfrom; } }',
		'a { @container style(transition-property: colr) { transition-property: colr; } }',
		'a { transition: opactiy 200ms ease; }',
		'a { transition-property: opacity, transfrom; }',
		'a { transition: 1s opactiy; }',
		'a { transition: ease, opactiy 1s; }',
		'a { will-change: opacity, transfrom, color; }',
		'a { will-change: auto, transfrom; }',
		'a { will-change: contents, opactiy; }',
		'a { transition-property: opacity, none, transfrom; }',
		// Vendor-prefixed declarations are still checked.
		'a { -webkit-transition: opactiy 1s; }',
		// Multiple declarations each report on their own line.
		'a { transition: opactiy 1s; will-change: transfrom; }',
		// CSS-wide keywords are only allowed as the whole value.
		'a { transition-property: inherit, opacity; }',
		'a { transition-property: initial, opacity, unset; }',
		'a { will-change: inherit, initial; }',
		// `default` is reserved even without a companion identifier.
		'a { transition: default; }',
		'a { Transition: Opactiy 1s; }',
		String.raw`a { will-change: transf\72 om; }`,
		'a { will-change: opactiy, opactiy; }',
		// An ICSS `:import()` selector combined with a real selector is still checked.
		':import("a.css") .card { transition: opactiy 1s; }',
		'@layer components { @media (width > 1px) { a { transition: opactiy 1s; } } }',
	],
});

nodeTest('property catalogs are isolated between files', async () => {
	const eslint = new ESLint({
		overrideConfigFile: true,
		overrideConfig: [
			{
				...plugin.configs.unopinionated,
				rules: {'cssicorn/no-invalid-property-references': 'error'},
			},
			{
				files: ['future.css'],
				languageOptions: {customSyntax: {properties: {'future-property': '<length>'}}},
			},
		],
	});
	const code = 'a { transition: future-property 1s; }';
	const [customResult] = await eslint.lintText(code, {filePath: 'future.css'});
	assert.deepEqual(customResult.messages, []);

	const [standardResult] = await eslint.lintText(code, {filePath: 'standard.css'});
	assert.equal(standardResult.messages.length, 1);
	assert.equal(standardResult.messages[0].ruleId, 'cssicorn/no-invalid-property-references');
	assert.equal(standardResult.messages[0].message, 'Unknown property reference \'future-property\' in \'transition\'.');
});

test({
	valid: [],
	invalid: [
		{
			code: 'a {\n\ttransition: opact\\69 y 200ms;\n}',
			errors: [{
				messageId: 'no-invalid-property-references/unknown',
				data: {name: String.raw`opact\69 y`, property: 'transition'},
				line: 2,
				column: 14,
				endLine: 2,
				endColumn: 24,
			}],
		},
		{
			code: 'a {\r\n  will-change: /* keep */ ALL;\r\n}',
			errors: [{
				messageId: 'no-invalid-property-references/forbidden',
				data: {name: 'ALL', property: 'will-change'},
				line: 2,
				column: 27,
				endLine: 2,
				endColumn: 30,
			}],
		},
		{
			code: 'a { will-change: marKer, blocK-size, _opacity; }',
			errors: ['marKer', 'blocK-size', '_opacity'].map(name => ({
				messageId: 'no-invalid-property-references/unknown',
				data: {name, property: 'will-change'},
			})),
		},
	],
});
