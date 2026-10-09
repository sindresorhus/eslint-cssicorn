import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [

		'.element { height: 100dvh; width: 100dvw; }',
		'.element { min-height: 100svh; max-width: 100lvw; }',
		'.element { block-size: 100dvh; inline-size: 100dvw; }',
		'.element { height: 99.9vh; width: 101vw; }',
		'.element { height: 50vh; width: 50vw; }',
		'.element { top: 100vh; left: 100vw; }',
		'.element { flex-basis: 100vh; grid-template-columns: 100vw; }',
		'.element { --viewport-size: 100vh; }',
		'.element { block-size: 100vb; inline-size: 100vi; }',
		'@media (min-height: 100vh) { .element { color: red; } }',
		'@supports (height: 100vh) { .element { color: red; } }',
		'@supports (height: calc(100vh - 1rem)) { .element { color: red; } }',
		'@container style(height: 100vh) { .element { color: red; } }',
		// CSS Modules interop blocks are read by JavaScript as exact strings.
		':export { height: 100vh; width: 100vw; }',
		':import("./theme.css") { height: 100vh; }',
		// Explicit viewport units other than the default are left alone.
		'.element { height: 100lvh; width: 100lvw; }',
		// Only a value of 100 with a `vh`/`vw` unit is reported.
		'.element { height: 200vh; width: 100%; }',
		'.element { height: 100; }',
		// Non-size properties are ignored.
		'.element { padding: 100vh; margin: 100vw; outline-offset: 100vh; }',
		'.element { transform: translateY(100vh); transition: height 100vh; }',
		'.element { -webkit-height: 100vh; }',
		// Viewport units in media and container features are ignored.
		'@media (width <= 100vw) { .element { color: red; } }',
		'@container (min-height: 100vh) { .element { color: red; } }',
		// `var()` hides its fallback, so it is not seen as a dimension.
		'.element { height: var(--h, 100vh); }',
	],
	invalid: [

		'.element { height: 100vh; width: 100vw; }',
		'.element { min-height: 100vh; max-height: 100vh; min-width: 100vw; max-width: 100vw; }',
		'.element { block-size: 100vh; min-block-size: 100vh; max-block-size: 100vh; inline-size: 100vw; min-inline-size: 100vw; max-inline-size: 100vw; }',
		'.element { height: calc(100vh - 1rem); width: min(100vw, 80rem); block-size: clamp(20rem, 100vh /* fill */, 100vh); }',
		'.uppercase { min-height: 100.0VH; WIDTH: 100VW; }',
		'.scientific { height: 1e2vh; }',
		'.fallback { height: 100vh; height: 100dvh; }',
		'@supports (height: 100dvh) { .element { height: 100vh; } }',
		String.raw`.escaped { w\idth: 100vh; height: 100v\68; }`,
		'.element { height: calc(100vh + 0px); max-block-size: clamp(10rem, 100vh, 20rem); }',
		'.element { height: 100.00vh; }',
		'.element { height: +100vh; }',
		'.element { height: 0100vh; }',
		'.element { height: 100vh !important; }',
		'.element { height: 100vh /* keep */; }',
		'.element { height: /* keep */ 100vh; }',
		// The replacement matches the axis of the unit that is written.
		'.element { height: 100vw; width: 100vh; }',
		'.element { min-inline-size: min(100vw, 40rem); }',
		'@media (width > 0px) { .element { height: 100vh; } }',
		'@layer theme { .element { height: 100vh; width: 100vw; } }',
		'.element { &:hover { height: 100vh; } }',
	],
});

test.snapshot({
	valid: [
		'.small { height: 100svh; width: 100svw; }',
	].map(code => ({code, options: [{unit: 'svh'}]})),
	invalid: [
		'.small { height: 100vh; width: 100vw; }',
		'.small { block-size: 100vh; inline-size: 100vw; }',
	].map(code => ({code, options: [{unit: 'svh'}]})),
});

test.snapshot({
	valid: [
		'.large { height: 100lvh; width: 100lvw; }',
	].map(code => ({code, options: [{unit: 'lvh'}]})),
	invalid: [
		'.large { height: 100vh; width: 100vw; }',
		'.large { height: 100vh !important; }',
	].map(code => ({code, options: [{unit: 'lvh'}]})),
});
