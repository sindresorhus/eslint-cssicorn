import assert from 'node:assert/strict';
import nodeTest from 'node:test';
import css from '@eslint/css';
import {lexer, parse, toPlainObject} from '@eslint/css-tree';
import rule from '../rules/require-prefers-reduced-motion.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a { transform: translateX(10px); translate: 10px; width: 100px; --effect: slide 1s; }',
		'a { --animation-name: slide; --transition-duration: 1s; --scroll-behavior: smooth; }',
		':export { animation: slide 1s; transition: transform 1s; scroll-behavior: smooth; }',
		':import("effects.css") { animation-name: external; transition-duration: 1s; scroll-behavior: smooth; }',
		'a { animation-duration: 1s; animation-delay: 1s; animation-timeline: scroll(); transition-delay: 1s; }',
		'a { animation: 1s ease 2s infinite alternate both paused; }',
		'a { animation: none; animation-name: none; transition: none; transition-property: none; scroll-behavior: auto; }',
		'a { animation: initial; animation-name: unset; transition: initial; transition-property: unset; transition-duration: initial; scroll-behavior: unset; }',
		'a { transition: color 1s, opacity 2s; }',
		'a { transition: background-color var(--duration); }',
		'a { transition: opacity var(--duration, 1s) var(--delay); }',
		'a { transition: border-inline-start-color 1s, caret-color 2s, stop-opacity 1s; }',
		'a { transition-property: color, opacity; transition-duration: var(--duration); }',
		'a { transition-duration: 1s; transition-property: none; }',
		'a { transition-property: color; transition-duration: inherit; }',
		'a { transition: color 1s; transition-duration: 2s; }',
		'a { transition: none; transition-duration: 1s; }',
		'a { transition: none 1s; }',
		'a { transition-duration: 0s, 0ms; }',
		'a { transition: transform 0s 1s; }',
		'a { transition: transform 0s 1s, width 0ms 2s; }',
		'a { transition: transform; }',
		'a { transition: color 1s, transform 0ms; }',
		'a { transition: 0s; }',
		'a { transition: opacity 1s allow-discrete; }',
		String.raw`a { TRANSITION: OPACITY 1\73; transition: \63 olor var(--duration); }`,
		'a { -webkit-transition: opacity 1s; }',
		'@keyframes fade { from { opacity: 0; } to { opacity: 1; } } a { animation: fade 1s; }',
		'a { animation-name: tint; } @keyframes tint { to { color: red; background-color: blue; } }',
		'@keyframes fade { to { opacity: var(--opacity); animation-timing-function: ease; } } a { animation: fade var(--duration); }',
		'@keyframes fade { to { opacity: 1; } } @keyframes tint { to { color: red; } } a { animation: fade 1s, tint 2s; }',
		'@keyframes fade { to { opacity: 1; } } a { animation: fade 1s, none 2s; }',
		'@keyframes fade { to { opacity: 1; } } @media (hover) { @keyframes fade { to { color: red; } } } a { animation-name: fade; }',
		'@keyframes empty {} a { animation-name: empty; }',
		'@keyframes --fade { to { opacity: 1; } } a { animation-name: --fade; }',
		'@keyframes "none" { to { color: red; } } a { animation-name: "none"; }',
		String.raw`@keyframes f\61 de { to { opacity: 1; } } a { anim\61 tion: fade 1s; }`,
		'@-webkit-keyframes fade { to { opacity: 1; } } a { -webkit-animation: fade 1s; }',
		'@media (prefers-reduced-motion: no-preference) { a { animation: slide 1s; transition: transform 1s; scroll-behavior: smooth; } }',
		'@media (prefers-reduced-motion: no-preference) { a { animation: backwards none --missing; } }',
		'@media screen and (prefers-reduced-motion: no-preference) { a { transition-property: all; transition-duration: 1s; } }',
		'@media only screen and (prefers-reduced-motion: no-preference) { a { animation-name: slide; } }',
		'@media (hover) and (prefers-reduced-motion: no-preference) { a { scroll-behavior: smooth; } }',
		'@media (prefers-reduced-motion: no-preference) or (prefers-reduced-motion: no-preference) { a { scroll-behavior: smooth; } }',
		'@media (prefers-reduced-motion: no-preference), screen and (prefers-reduced-motion: no-preference) { a { animation: var(--effect); } }',
		'@media (prefers-reduced-motion: no-preference) { @supports (display: grid) { @layer components { a { &:hover { transition: transform 1s; } } } } }',
		'a { @media (prefers-reduced-motion: no-preference) { transition: width 1s; } }',
		'@media (prefers-reduced-motion: no-preference) { @media (hover), (width > 600px) { a { transition: transform 1s; } } }',
		'@MEDIA (PREFERS-REDUCED-MOTION: NO-PREFERENCE) { a { SCROLL-BEHAVIOR: SMOOTH; } }',
		String.raw`@media (prefers-reduced-m\6f tion: no-pr\65 ference) { a { scroll-behavior: smooth; } }`,
		'@media (prefers-reduced-motion: /* preference */ no-preference) { a { transition: transform /* target */ 1s !important; } }',
		'@keyframes slide { to { transform: translateX(10px); transition: transform 1s; } }',
		'@supports (scroll-behavior: smooth) { a { color: red; } }',
		'a { content: "animation: slide 1s"; background: url("transition.png"); }',
		'@font-face { font-family: demo; src: url(demo.woff2); scroll-behavior: smooth; }',
		{code: 'a { animation: ???; transition: ???; scroll-behavior: ???; }', languageOptions: {tolerant: true}},
		'@-webkit-keyframes fade { to { opacity: 1; -webkit-animation-timing-function: ease; } } a { -webkit-animation: fade 1s; }',
		String.raw`@KEYFRAMES Fade { TO { \6f pacity: 1; -WEBKIT-ANIMATION-TIMING-FUNCTION: ease; } } a { animation-name: Fade; }`,
		'@keyframes tint { to { -webkit-text-fill-color: red; } } a { animation-name: tint; }',
		'/* eslint-disable-next-line rule-to-test/require-prefers-reduced-motion -- Essential motion preview. */\na { animation: slide 1s; }\n@keyframes slide { to { transform: translateX(10px); } }',
		'@media (prefers-reduced-motion: no-preference) { @container (width > 20rem) { @scope (.card) { :scope { animation: slide 1s; transition: transform 1s; scroll-behavior: smooth; } } } }',
	],
	invalid: [
		'a { animation: slide 1s; }',
		'a { animation: --slide 1s; }',
		'a { animation: backwards none --missing; }',
		String.raw`a { animation: backwards none \2d -missing; }`,
		'a { animation: none var(--duration); }',
		'a { animation: ease-in ease-out 1s; }',
		String.raw`a { animation: slide \73 teps(2) 1\73; }`,
		'a { animation-name: external; }',
		'a { animation: var(--effect); }',
		'a { animation-name: var(--name, fade); }',
		'a { animation: slide var(--duration); }',
		'a { animation: inherit; animation-name: revert-layer; }',
		'@keyframes slide { to { transform: translateX(10px); } } a { animation: slide 0s; animation-timeline: scroll(); }',
		'@keyframes grow { to { width: 100px; } } a { animation-name: grow; }',
		'@keyframes fade { to { opacity: 1; } } @keyframes slide { to { translate: 10px; } } a { animation: fade 1s, slide 1s; }',
		'@keyframes fade { to { opacity: 1; } } a { animation: fade 1s, var(--effect); }',
		'@keyframes fade { to { opacity: 1; } } a { animation-name: Fade; }',
		'@keyframes fade { to { opacity: 1; } } @media (hover) { @keyframes fade { to { transform: scale(2); } } } a { animation-name: fade; }',
		'@keyframes fade { to { transform: scale(2); } } @keyframes fade { to { opacity: 1; } } a { animation-name: fade; }',
		'@media (prefers-reduced-motion: no-preference) { @keyframes slide { to { transform: translateX(10px); } } } a { animation-name: slide; }',
		'@keyframes blur { to { filter: blur(10px); } } a { animation: blur 1s; }',
		'@keyframes tint { to { background: red; } } a { animation-name: tint; }',
		'@keyframes custom { to { --position: 10px; } } a { animation: custom 1s; }',
		'@keyframes fake { to { future-color: red; } } a { animation-name: fake; }',
		'a { -webkit-animation: slide 1s; }',
		String.raw`a { anim\61 tion-name: sl\69 de; }`,
		'a { animation-name: "slide"; }',
		'a { transition: transform 1s; }',
		'a { transition: width 1s, opacity 1s; }',
		'a { transition: 1s ease; }',
		'a { transition: all 1s; }',
		'a { transition: transform var(--duration); }',
		'a { transition: var(--transition); }',
		'a { transition: var(--property) 1s; }',
		'a { transition-property: transform; }',
		'a { transition-property: opacity, width; }',
		'a { transition-property: transform; transition-duration: 0s; }',
		'a { transition-property: var(--property); }',
		'a { transition: --position 1s; }',
		'a { transition-property: --custom-color; }',
		'a { transition: filter 1s, background 1s, border 1s; }',
		'a { transition-duration: 1s; }',
		'a { transition-duration: var(--duration); }',
		'a { transition-duration: 1s; @media (hover) { transition-property: color; } }',
		'a { transition-duration: 0s, 100ms; }',
		'a { transition-duration: inherit; }',
		'a { transition: transform 0s; transition-duration: 1s; }',
		'a { transition: 0s; transition-duration: 1s; }',
		'a { transition-property: initial; transition-duration: 1s; }',
		'a { transition: unset; transition-duration: 1s; }',
		'a { transition-property: color; transition-property: opacity; transition-duration: 1s; }',
		'a { transition-property: opacity; transition-duration: 1s; } a:hover { transition-property: transform; }',
		'a { -webkit-transition: transform 1s; }',
		String.raw`a { TRANSITION: tr\61 nsform 1\73; }`,
		'a { scroll-behavior: smooth; }',
		'a { scroll-behavior: var(--scroll); }',
		'a { scroll-behavior: inherit; }',
		'a { SCROLL-BEHAVIOR: SMOOTH !important; }',
		String.raw`a { scroll-behavior: sm\6f oth; }`,
		'@media (prefers-reduced-motion: reduce) { a { scroll-behavior: smooth; } }',
		'@media (prefers-reduced-motion) { a { animation: slide 1s; } }',
		'@media (prefers-reduced-motion: no-preference), (hover) { a { transition: transform 1s; } }',
		'@media (prefers-reduced-motion: no-preference) or (hover) { a { scroll-behavior: smooth; } }',
		'@media not screen and (prefers-reduced-motion: no-preference) { a { animation-name: slide; } }',
		'@media not (prefers-reduced-motion: reduce) { a { animation-name: slide; } }',
		'@media (width > 600px) { a:hover { transition: transform 1s; } }',
		'@supports (prefers-reduced-motion: no-preference) { a { transition: transform 1s; } }',
		'a { transition: transform /* keep this */ 1s; }',
		'@scope (.component) { a { scroll-behavior: smooth; } }',
		'a {\r\n  &:hover {\r\n    transition: transform 1s;\r\n  }\r\n}',
		String.raw`@KEYFRAMES Fade { TO { \6f pacity: 1; \74 ransform: translateX(10px); -webkit-animation-timing-function: ease; } } a { animation-name: Fade; }`,
		'a { transition: transform calc(0s); }',
		'@container (width > 20rem) { @scope (.card) { :scope { animation: slide 1s; transition: transform 1s; scroll-behavior: smooth; } } }',
	],
});

// The CSS language reports speculative parser fallback errors for valid nested conditions. Exercise their recovered AST directly.
nodeTest('nested media conditions guarantee a preference on every branch', () => {
	for (const {query, guarded} of [
		{query: '((prefers-reduced-motion: no-preference) and (hover)) or ((prefers-reduced-motion: no-preference) and (width > 600px))', guarded: true},
		{query: '(prefers-reduced-motion: no-preference) and ((hover) or (width > 600px))', guarded: true},
		{query: '((prefers-reduced-motion: no-preference) and (hover)) or (width > 600px)', guarded: false},
		{query: 'not ((prefers-reduced-motion: no-preference) and (hover))', guarded: false},
		{query: '(prefers-reduced-motion: no-preference) and (not (hover))', guarded: true},
		{query: '(prefers-reduced-motion: no-preference) or (not (hover))', guarded: false},
	]) {
		const code = `@media ${query} { a { scroll-behavior: smooth; } }`;
		const ast = toPlainObject(parse(code, {positions: true}));
		const sourceCode = css.languages.css.createSourceCode({body: code}, {ast, lexer, comments: []});
		const listeners = new Map();
		rule.create({
			sourceCode,
			on: (type, listener) => listeners.set(type, listener),
			onExit() {},
		});

		const problems = [];
		for (const {target, phase, args} of sourceCode.traverse()) {
			if (phase !== 1) {
				continue;
			}

			const problem = listeners.get(target.type)?.(...args);
			if (problem) {
				problems.push(problem);
			}
		}

		assert.equal(problems.length, guarded ? 0 : 1, query);
	}
});
