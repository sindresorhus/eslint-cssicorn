import {generate} from '@eslint/css-tree';
import {normalizeCssIdentifier} from '../utils/index.js';

const getValueKey = node => {
	switch (node.type) {
		case 'Dimension': {
			return `${node.type}:${node.value}${normalizeCssIdentifier(node.unit)}`;
		}

		case 'Hash': {
			return `${node.type}:${node.value.toLowerCase()}`;
		}

		case 'Identifier': {
			return `${node.type}:${normalizeCssIdentifier(node.name)}`;
		}

		default: {
			return `${node.type}:${generate(node)}`;
		}
	}
};

/**
Compare shorthand components without changing their numeric spelling.
*/
export const areEqualValues = (first, second) => getValueKey(first) === getValueKey(second);

/**
Get the shortest equivalent two-, three-, or four-component shorthand length.
*/
export const getCondensedValueCount = (values, preserveFourValueEdges, areEqual = areEqualValues) => {
	const [first, second, third, fourth] = values;

	if (values.length === 2 && areEqual(first, second)) {
		return 1;
	}

	if (values.length === 3 && areEqual(first, third)) {
		return areEqual(first, second) ? 1 : 2;
	}

	if (values.length !== 4) {
		return values.length;
	}

	if (
		areEqual(first, second)
		&& areEqual(first, third)
		&& areEqual(first, fourth)
	) {
		return 1;
	}

	if (
		areEqual(first, third)
		&& areEqual(second, fourth)
	) {
		return 2;
	}

	if (!preserveFourValueEdges && areEqual(second, fourth)) {
		return 3;
	}

	return 4;
};
