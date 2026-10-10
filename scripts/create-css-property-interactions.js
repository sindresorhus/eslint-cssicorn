import fs from 'node:fs';
import webref from '@webref/css';
import {additionalResetProperties, shorthandToAffectedProperties} from '../rules/shared/css-shorthand-properties.js';
import {propertyNameAliases} from '../rules/shared/css-property-name-aliases.js';

const targetUrl = new URL('../rules/shared/css-property-interactions.js', import.meta.url);
const {properties} = await webref.listAll();
const definitions = new Map(properties.map(property => [property.name, property]));
// These properties have special value mappings or incomplete shorthand metadata in Webref.
const unsupportedProperties = new Set([
	'page-break-before',
	'page-break-after',
	'page-break-inside',
	'glyph-orientation-vertical',
	// The shorthands set both axes, but Webref only lists their column components: https://drafts.csswg.org/css-gaps-1/
	'rule-inset-cap',
	'rule-inset-junction',
	'rule-visibility-items',
]);

const compareNames = (first, second) => {
	if (first === second) {
		return 0;
	}

	return first < second ? -1 : 1;
};

/**
Collect cascade relationships, including reset-only properties and logical counterparts.
*/
const getPropertyInteractions = property => {
	const interactions = new Set();
	const visited = new Set();
	const addProperty = property => {
		if (visited.has(property)) {
			return;
		}

		visited.add(property);
		const definition = definitions.get(property);
		const alias = definition?.legacyAliasOf ?? propertyNameAliases.get(property);
		if (alias) {
			addProperty(alias);
			return;
		}

		interactions.add(`property:${property}`);
		if (definition?.logicalPropertyGroup) {
			interactions.add(`logical:${definition.logicalPropertyGroup}`);
		}

		for (const affectedProperty of [
			...definition?.longhands ?? [],
			...definition?.resetLonghands ?? [],
			...shorthandToAffectedProperties.get(property) ?? [],
			...additionalResetProperties.get(property) ?? [],
		]) {
			addProperty(affectedProperty);
		}

		// Property grammar references conservatively cover components missing from shorthand metadata.
		// References that only reuse syntax can cause extra suggestions, which is preferable to unsafe fixes.
		for (const match of definition?.syntax?.matchAll(/<'(?<property>[\w\-]+)'>/gv) ?? []) {
			addProperty(match.groups.property);
		}
	};

	addProperty(property);
	return [...interactions].toSorted(compareNames);
};

const content = [
	'// Generated file, DO NOT edit',
	'/* eslint-disable @stylistic/max-len -- Keep generated property footprints on one line. */',
	'',
	'/**',
	'@type {Map<string, Set<string>>}',
	'*/',
	'const propertyInteractions = new Map([',
	...properties.map(({name}) => name).filter(name => !name.startsWith('-') && !unsupportedProperties.has(name)).toSorted(compareNames).map(property => {
		const interactions = getPropertyInteractions(property).map(interaction => `'${interaction}'`).join(', ');
		return `\t['${property}', new Set([${interactions}])],`;
	}),
	']);',
	'',
	'export default propertyInteractions;',
	'',
].join('\n');

if (process.argv.includes('--check')) {
	if (fs.readFileSync(targetUrl, 'utf8') !== content) {
		console.error('The property interactions are out of date. Run `npm run fix:css-property-interactions`.');
		process.exitCode = 1;
	}
} else {
	fs.writeFileSync(targetUrl, content);
}
