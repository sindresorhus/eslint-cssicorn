// @ts-check

import path from 'node:path';
import packageJson from '../../package.json' with {type: 'json'};

const repositoryUrl = 'https://github.com/sindresorhus/eslint-cssicorn';

/**
@param {string} filename
*/
export default function getDocumentationUrl(filename) {
	const ruleName = path.basename(filename, '.js');
	return `${repositoryUrl}/blob/v${packageJson.version}/docs/rules/${ruleName}.md`;
}
