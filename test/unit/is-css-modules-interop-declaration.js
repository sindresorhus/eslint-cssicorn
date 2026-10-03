import test from 'node:test';
import assert from 'node:assert/strict';
import css from '@eslint/css';
import {Linter} from 'eslint';
import isCssModulesInteropDeclaration from '../../rules/utils/is-css-modules-interop-declaration.js';

const check = code => {
	const results = [];
	new Linter().verify(code, {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {
			css,
			test: {
				rules: {
					capture: {
						create: context => ({
							Declaration(node) {
								results.push(isCssModulesInteropDeclaration(node, context));
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	}, {filename: 'file.css'});
	return results;
};

test('finds declarations in `:export` and `:import()` blocks', () => {
	assert.deepEqual(check(':export { a: b; c: d; }'), [true, true]);
	assert.deepEqual(check(':import("./theme.css") { a: b; }'), [true]);
	assert.deepEqual(check(':import(./theme.css) { a: b; }'), [true]);
	assert.deepEqual(check(':EXPORT { a: b; }'), [true]);
	assert.deepEqual(check(String.raw`:\65xport { a: b; }`), [true]);
});

test('ignores other selectors and declarations', () => {
	assert.deepEqual(check('a { color: red; }'), [false]);
	assert.deepEqual(check('.a:export { a: b; } :export .a { a: b; } :export, .a { a: b; }'), [false, false, false]);
	assert.deepEqual(check('::export { a: b; } :import { a: b; } :export() { a: b; }'), [false, false, false]);
	assert.deepEqual(check(':export { .a { color: red; } }'), [false]);
	assert.deepEqual(check('@font-face { font-family: a; } @media (width > 1px) { :export { a: b; } }'), [false, true]);
	assert.deepEqual(check('@supports (color: red) {}'), [false]);
});
