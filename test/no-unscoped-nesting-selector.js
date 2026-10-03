import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const withScopingRootAtRules = (code, scopingRootAtRules = ['utility']) => ({
	code,
	options: [{scopingRootAtRules}],
});

test.snapshot({
	valid: [
		'a {}',
		'a /* & */ {}',
		'a { & {} && {} & .foo {} .foo & {} :is(&, .foo) {} }',
		outdent`
			a {
				@media all { & { color: red; } }
				@layer components { & { color: red; } }
			}
		`,
		'@scope (.foo) { & {} @media all { & {} } }',
		'@scope { & {} }',
		'@SCOPE (.foo) { & {} }',
		String.raw`@\73 cope { & {} }`,
		'a { @scope (&) to (& .limit) {} }',
		'@scope (.foo) to (& .limit) {}',
		'@scope to (&) {}',
		'@scope to (:is(&, .limit)) {}',
		'@scope (.outer) { @scope (:is(&)) to (:not(&)) { @layer components { & {} } } }',
		'@supports selector(&) {}',
		'@keyframes foo { & {} } @-moz-keyframes bar { & {} } @-o-keyframes baz { & {} } @-webkit-keyframes qux { & {} }',
		// Tailwind CSS v4
		outdent`
			@utility scrollbar-hidden {
				&::-webkit-scrollbar {
					display: none;
				}
			}
		`,
		outdent`
			@custom-variant theme-midnight {
				&:where([data-theme="midnight"] *) {
					@slot;
				}
			}
		`,
		outdent`
			@custom-variant any-hover {
				@media (any-hover: hover) {
					&:hover {
						@slot;
					}
				}
			}
		`,
		{
			code: '@custom-variant dark (&:where(.dark, .dark *));',
			languageOptions: {tolerant: true},
		},
		outdent`
			@custom-variant dark {
				@variant data-dark {
					&:where(.dark-theme) {
						@slot;
					}
				}
			}
		`,
		outdent`
			.my-element {
				background: white;
				@variant dark {
					& .icon {
						color: black;
					}
				}
			}
		`,
		{
			code: '@utility content-body { & p {} }',
			options: [{}],
		},
	],
	invalid: [
		// A top-level `@variant` compiles to a media query, so `&` stays unscoped.
		{
			code: outdent`
				@variant hover:focus {
					& .icon {
						color: black;
					}
				}
			`,
			languageOptions: {tolerant: true},
		},
		'& {}',
		'&.foo {}',
		'.foo & .bar {}',
		':not(&) {}',
		'&& {}',
		'&.foo, &.bar {}',
		outdent`
			@media all { & {} }
			@supports (display: grid) { & {} }
			@layer components { & {} }
			@container (width > 1px) { & {} }
		`,
		'@scope (&) to (&) {}',
		'@scope (:is(&, .root)) to (:is(&, .limit)) {}',
		'@scope (&) { & {} }',
		'@foo { & p {} }',
		'@utilities content-body { & p {} }',
		'@-custom-keyframes foo { & {} }',
		'@-ms-keyframes foo { & {} }',
		String.raw`a { @\4B EYFRAMES foo { from { & {} } } }`,
		'@scope { @keyframes foo { from { & {} } } }',
	],
});

test.snapshot({
	valid: [
		withScopingRootAtRules(outdent`
			@utility content-body {
				@media all { & p {} }
				@container (width > 1px) { & p {} }
			}
		`),
		withScopingRootAtRules('@UTILITY content-body { & p {} }'),
		withScopingRootAtRules(String.raw`@\75 tility content-body { & p {} }`),
		withScopingRootAtRules('@utility content-body { @supports (display: grid) { & p {} } }', ['UTILITY']),
		withScopingRootAtRules('@utility content-body { & p {} }', ['variant', 'utility']),
		withScopingRootAtRules('@K content-body { & p {} }', ['K']),
		withScopingRootAtRules('@utility content-body { @scope (:is(&)) {} }'),
	],
	invalid: [
		withScopingRootAtRules('@variant content-body { & p {} }'),
		withScopingRootAtRules('@k content-body { & p {} }', ['K']),
		withScopingRootAtRules('@K content-body { & p {} }', ['k']),
		withScopingRootAtRules('@keyframes foo { from { & {} } }', ['keyframes']),
		withScopingRootAtRules('@utility content-body { @keyframes foo { from { & {} } } }'),
		withScopingRootAtRules('@utility content-body { & p {} }', []),
		withScopingRootAtRules('@custom-variant dark { &:where(.dark) { @slot; } }', []),
	],
});
