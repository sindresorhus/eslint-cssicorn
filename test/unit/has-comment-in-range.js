import test from 'node:test';
import assert from 'node:assert/strict';
import css from '@eslint/css';
import {Linter} from 'eslint';
import hasCommentInRange from '../../rules/utils/has-comment-in-range.js';

const check = (code, getRange) => {
	let result;
	new Linter().verify(code, {
		files: ['**/*.css'],
		language: 'css/css',
		plugins: {
			css,
			test: {
				rules: {
					capture: {
						create: context => ({
							StyleSheet() {
								result = hasCommentInRange(context, getRange(code));
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	}, {filename: 'file.css'});
	return result;
};

test('finds a comment inside the range', () => {
	assert.equal(check('a { color: /* x */ red; }', code => [code.indexOf('color'), code.indexOf(';')]), true);
});

test('ignores comments outside or only partly inside the range', () => {
	assert.equal(check('/* x */ a { color: red; }', code => [code.indexOf('a'), code.length]), false);
	assert.equal(check('a { color: /* x */ red; }', code => [code.indexOf('x'), code.indexOf(';')]), false);
	assert.equal(check('a { color: red; }', code => [0, code.length]), false);
});

test('finds the right comment among many', () => {
	const code = '/* a */ a { /* b */ color: red; /* c */ } /* d */ b { color: blue; } /* e */';
	assert.equal(check(code, code => [code.indexOf('/* c */'), code.indexOf('/* c */') + 7]), true);
	assert.equal(check(code, code => [code.indexOf('color: red'), code.indexOf('/* c */')]), false);
	assert.equal(check(code, code => [code.indexOf('b {'), code.indexOf('/* e */')]), false);
	assert.equal(check(code, code => [code.indexOf('b {'), code.length]), true);
	assert.equal(check(code, code => [code.indexOf('/* a */') + 1, code.indexOf('color: red')]), true);
	assert.equal(check(code, code => [code.indexOf('/* a */') + 1, code.indexOf('/* b */') + 6]), false);
});
