import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import css from '@eslint/css';
import {Linter} from 'eslint';
import {getTester} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test.snapshot({
	valid: [
		'@layer reset, base, theme; @layer reset, base, theme;',
		'@layer reset, base, theme; @layer reset, theme;',
		'@layer reset, base, theme; @layer theme;',
		'@layer reset, theme; @layer reset, theme, reset;',
		'@layer theme.buttons, reset, theme.forms; @layer theme.buttons, reset, theme.forms;',
		'@layer reset, theme; @layer theme {} @layer reset {}',
		'@layer reset, theme; @import "theme.css" layer(theme); @import "reset.css" layer(reset);',
		'@layer reset, theme; @layer other {} @layer other, theme;',
		'@layer reset, theme; @layer extra, other; @layer other, extra;',
		'@layer theme {} @layer reset {}',
		'@layer theme {} @layer reset, theme; @layer theme, reset;',
		'@import "theme.css" layer(theme); @layer reset, theme; @layer theme, reset;',
		'@import "theme.css" layer(theme.base); @layer theme.components, theme.base; @layer theme.base, theme.components;',
		'@import "theme.css" layer; @layer reset, theme; @layer theme, reset;',
		'@import "theme.css"; @layer reset, theme; @layer theme, reset;',
		'@layer {} @layer reset, theme; @layer theme, reset;',
		'@media screen { @layer theme {} } @layer reset, theme; @layer theme, reset;',
		'@media screen { @layer reset, theme; @layer theme, reset; }',
		'@supports (display: grid) { @layer reset, theme; } @layer theme, reset; @layer reset, theme;',
		'@layer theme { @layer components {} @layer base, components; @layer components, base; }',
		'@layer theme { @media screen { @layer base {} } } @layer theme { @layer components, base; @layer base, components; }',
		'@layer theme { @layer base, components; } @layer other { @layer components, base; }',
		'@layer theme.base, theme.components, reset.components, reset.base; @layer theme { @layer base, components; } @layer reset { @layer components, base; }',
		'@layer { @layer base, components; } @layer { @layer components, base; }',
		'@layer theme.base, theme.components; @layer theme { @layer base, components; }',
		'@layer theme.base, reset, theme.components; @layer theme.base, theme, reset, theme.components;',
		'@layer reset; @layer theme; @layer theme, reset;',
		'@layer Base, base; @layer Base, base;',
		'@layer __proto__, constructor; @layer __proto__, constructor;',
		'@-vendor-layer theme, reset; @layer reset, theme;',
		'a { --example: "@layer theme, reset"; content: "@layer theme, reset"; }',
		// The parser does not expose these escaped at-rule names as LayerList nodes.
		String.raw`@\6c ayer reset, theme; @layer theme, reset; @layer reset, theme;`,
		'@LAYER base, theme; @layer base, theme;',
		String.raw`@lay\65 r base, theme; @layer theme, base;`,
		'@layer base, theme; @layer theme.components, theme.buttons;',
		'@layer base, theme; @layer theme.components; @layer theme.buttons;',
		'@layer theme.base, theme.components; @layer theme.components {} @layer theme.base {}',
		'@layer theme; @layer theme.base; @layer theme.base, theme;',
		'@layer theme; @layer theme.components {} @layer theme.buttons {}',
		'@layer theme { @layer base, components; } @layer theme { @layer base, components; }',
		'@layer theme { @layer {} @layer base, components; }',
		'@layer theme {} @layer theme { @layer base, components; }',
		'@layer base, theme; a { color: red; } @layer base, theme;',
		'@media screen { @layer theme; } @layer base, theme; @layer theme, base;',
		'@media screen { @layer a, b; } @media screen { @layer b, a; }',
		'@supports (display: grid) { @layer a, b; @layer b, a; }',
		'@scope (.card) { @layer a, b; } @scope (.card) { @layer b, a; }',
	],
	invalid: [
		'@layer reset, base, theme; @layer theme, base, reset;',
		'@layer reset, base, theme; @layer theme, reset;',
		'@layer reset, base, theme; @layer base, theme, reset;',
		'@layer reset, theme; @layer theme, reset, theme;',
		'@layer reset, theme; @layer theme, reset; @layer theme, reset;',
		'@LAYER reset, theme; @LaYeR theme, reset;',
		String.raw`@layer base, theme; @layer theme, \62 ase;`,
		String.raw`@layer \62 ase, theme; @layer theme, base;`,
		'@layer Base, base; @layer base, Base;',
		'@layer __proto__, constructor; @layer constructor, __proto__;',
		String.raw`@layer foo\.bar, foo.bar; @layer foo.bar, foo\.bar;`,
		String.raw`@layer foo\2e bar, foo.bar; @layer foo.bar, foo\.bar;`,
		'@layer theme { @layer base, components; @layer components, base; }',
		'@layer theme { @layer base, components; } @layer theme { @layer components, base; }',
		'@layer theme.base, theme.components; @layer theme.components, theme.base;',
		'@layer theme.base, theme.components; @layer theme { @layer components, base; }',
		'@layer theme { @layer base, components; } @layer theme.components, theme.base;',
		'@layer theme.base, reset, theme.components; @layer reset, theme.components, theme.base;',
		'@layer theme.base, reset, theme.components; @layer theme.components, reset, theme.base;',
		'@layer theme.base.widgets, theme.base.buttons; @layer theme.base.buttons, theme.base.widgets;',
		'@layer theme {} @layer theme.base, theme.components; @layer theme.components, theme.base;',
		'@layer reset, theme; @layer theme { @layer reset, theme; @layer theme, reset; }',
		'@layer { @layer base, components; @layer components, base; }',
		'@layer base, theme; @media screen { @layer theme, base; }',
		'@layer base, theme; @supports (display: grid) { @layer theme, base; }',
		'@layer base, theme; @container (width > 1px) { @layer theme, base; }',
		'@layer base, theme; @scope (.card) { @layer theme, base; }',
		'@layer base, theme; @layer theme, /* preserve */ base;',
		'@layer base, theme; @layer /* preserve */ theme, base;',
		'@layer base, theme; @layer theme, extra, base;',
		'@layer base, theme; @layer theme.widgets, base;',
		'@layer base, theme; @layer theme.widgets.first, theme.widgets.second, base;',
		'@layer base, theme;\r\n@media screen {\r\n    @layer theme, base;\r\n}',
		'@layer a.x, a.y; @layer a.y, a.x;',
		'@layer a.x, a.y, a.z; @layer a.z, a.y, a.x;',
		'@layer a, b, c; @layer c, b, c, a;',
		'@layer a, b, c; @layer c, b;',
		'@layer a, b; @layer b.x, a;',
		'@layer a, b; @import "x.css"; @layer b, a;',
		'@layer base, theme; /* keep */ @layer theme, base;',
		'@layer /* keep */ base, theme; @layer theme, base;',
		'@layer base, theme; @layer theme, base; /*x*/ @layer base, theme;',
		'@layer base, theme;\n@layer theme,\n\tbase;',
		'  @layer base, theme;\n\n\t@layer theme, base;',
		String.raw`@layer \31 a, \32 b; @layer \32 b, \31 a;`,
		'@layer base, theme, extra; @layer extra, theme, base;',
		'@layer base, theme; @layer base, theme, extra; @layer extra, theme, base;',
		'@layer outer { @layer a, b; @layer b, a; }',
		'@layer outer, inner; @layer outer { @layer x, y; @layer y, x; }',
		'@layer theme.base, theme.components;\n@layer theme {\n\t@layer components, base;\n}',
		'@layer base, theme; @layer theme.base, theme.components; @layer theme.components, theme.base;',
	],
});

test.snapshot({
	valid: [
		{code: '@layer base, theme; @layer unknown {}', options: [{checkUndeclaredLayers: false}]},
		{code: '@layer base, theme; @layer theme {} @layer base {}', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @layer theme.components {}', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer theme.base, theme.components; @layer theme {}', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @layer {} @import "anonymous.css" layer;', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer theme { @layer base, components; } @layer theme { @layer base {} }', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer unknown {}', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @import "theme.css" layer(theme); @import "other.css";', options: [{checkUndeclaredLayers: true}]},
		{code: String.raw`@layer base, theme; @layer \62 ase {}`, options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @layer theme.components, theme.buttons;', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer theme.base, theme.components; @layer theme { @layer base.bar {} }', options: [{checkUndeclaredLayers: true}]},
		{code: String.raw`@layer base, theme; @layer base, \62 ase;`, options: [{checkUndeclaredLayers: true}]},
	],
	invalid: [
		{code: '@layer base, theme; @layer themes {}', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @layer themes, base;', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @import "theme.css" layer(themes);', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @IMPORT url("theme.css") LAYER(themes);', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @layer Base {}', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @layer themes.components.buttons {}', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer theme.base, theme.components; @layer theme.buttons {}', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer theme { @layer base, components; } @layer theme { @layer buttons {} }', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer theme.base, theme.components; @layer theme { @layer buttons, base; }', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @media screen { @layer themes {} }', options: [{checkUndeclaredLayers: true}]},
		{code: String.raw`@layer foo\.bar, foo.bar; @layer foo.baz {}`, options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @layer theme, unknown, base;', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer theme.base, theme.components; @import "theme.css" layer(theme.buttons.icons) supports(display: grid) screen;', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @layer foo.bar {}', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @layer themes.base, base;', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @layer theme, themes.base;', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer theme.base, theme.components; @import "x.css" layer(theme.extra);', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer theme.base, theme.components; @layer theme.extra;', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @import "x.css" layer(themes.theme);', options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @import "x.css" layer(foo.bar);', options: [{checkUndeclaredLayers: true}]},
		{code: String.raw`@layer base, theme; @layer theme, \62 ase;`, options: [{checkUndeclaredLayers: true}]},
		{code: '@layer base, theme; @layer theme.components, theme.base, themes;', options: [{checkUndeclaredLayers: true}]},
	],
});

// Assert the central behavior independently of generated snapshots.
test({
	valid: [],
	invalid: [{
		code: '@layer reset, base, theme; @layer theme, base;',
		errors: [{messageId: 'consistent-layer-order', data: {earlier: 'base', later: 'theme'}}],
		output: '@layer reset, base, theme; @layer base, theme;',
	}, {
		code: '@layer theme.base, theme.components, reset.base, reset.components; @layer reset.components, theme.components, reset.base, theme.base;',
		errors: [{messageId: 'consistent-layer-order', data: {earlier: 'theme.components', later: 'reset.components'}}],
		output: '@layer theme.base, theme.components, reset.base, reset.components; @layer theme.base, theme.components, reset.base, reset.components;',
	}, {
		code: '@layer theme.base, theme.components; @layer theme.components, theme, theme.base, theme.components;',
		errors: [{messageId: 'consistent-layer-order', data: {earlier: 'theme.base', later: 'theme.components'}}],
		output: '@layer theme.base, theme.components; @layer theme, theme.base, theme.components, theme.components;',
	}, {
		code: String.raw`@layer base, theme; @layer theme, \62 ase, base, \000062ase;`,
		errors: [{messageId: 'consistent-layer-order', data: {earlier: String.raw`\62 ase`, later: 'theme'}}],
		output: String.raw`@layer base, theme; @layer \62 ase, base, \000062ase, theme;`,
	}, {
		code: '@layer base, theme;\r\n@media screen {\r\n    @layer theme,\r\n        \\62 ase;\r\n}',
		errors: [{messageId: 'consistent-layer-order', data: {earlier: String.raw`\62 ase`, later: 'theme'}}],
		output: '@layer base, theme;\r\n@media screen {\r\n    @layer \\62 ase,\r\n        theme;\r\n}',
	}, {
		// This statement establishes the child order, so it is reported without a fix.
		code: '@layer base, theme; @layer theme.components, theme.base, base;',
		errors: [{messageId: 'consistent-layer-order', data: {earlier: 'base', later: 'theme.components'}}],
	}, {
		code: '@layer base, theme; @layer extra; @layer extra {}',
		options: [{checkUndeclaredLayers: true}],
		errors: [
			{messageId: 'consistent-layer-order/undeclared', data: {name: 'extra'}},
			{messageId: 'consistent-layer-order/undeclared', data: {name: 'extra'}},
		],
	}],
});

nodeTest('an unfixable parent inversion still establishes the child contract', () => {
	const linter = new Linter();
	const config = {
		language: 'css/css',
		plugins: {css, test: {rules: {order: rule}}},
		rules: {'test/order': 'error'},
	};
	const code = '@layer base, theme; @layer theme.components, theme.base, base; @layer theme { @layer base, components; }';
	const output = '@layer base, theme; @layer theme.components, theme.base, base; @layer theme { @layer components, base; }';
	const messages = linter.verify(code, config);
	assert.equal(messages.length, 2);
	assert.equal(messages[0].messageId, 'consistent-layer-order');
	assert.equal(messages[0].fix, undefined);
	assert.equal(messages[1].messageId, 'consistent-layer-order');
	assert.ok(messages[1].fix);

	const result = linter.verifyAndFix(code, config);
	assert.equal(result.output, output);
	assert.equal(result.fixed, true);
	assert.deepEqual(result.messages, [messages[0]]);
	assert.deepEqual(linter.verifyAndFix(output, config), {...result, fixed: false});
});

test.snapshot({
	testerOptions: {languageOptions: {tolerant: true}},
	valid: [
		'@layer base, theme; @layer ???;',
		'@layer base, theme; @layer ??? { @layer theme, base; }',
		'@layer base, theme; @import "other.css" layer();',
	],
	invalid: [],
});
