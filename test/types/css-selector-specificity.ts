import type {PseudoClassSelectorPlain, SelectorListPlain, SelectorPlain} from '@eslint/css-tree';
import {getMaximumSpecificity, getSelectorArgument, getSelectorSpecificity} from '../../rules/shared/css-selector-specificity.js';

declare const pseudoClass: PseudoClassSelectorPlain;
declare const selector: SelectorPlain;

const argument = getSelectorArgument(pseudoClass);
argument satisfies SelectorPlain | SelectorListPlain | null | undefined;
// @ts-expect-error Selector arguments do not have pseudo-class names.
argument?.name;
// @ts-expect-error Only pseudo-selectors have selector arguments.
getSelectorArgument(selector);

const nestingSpecificity = [0, 1, 0] as const;
const result = getSelectorSpecificity(selector, nestingSpecificity);
result.specificity satisfies readonly [number, number, number];
result.hasNestingSelector satisfies boolean;
// @ts-expect-error Calculated specificity is readonly.
result.specificity[0] = 1;
// @ts-expect-error Specificity has exactly three components.
result.specificity[3];
// @ts-expect-error Nesting specificity requires three components.
getSelectorSpecificity(selector, [0, 1]);

const specificities = [[0, 1, 0], [1, 0, 0]] as const;
const maximum = getMaximumSpecificity(specificities);
maximum satisfies readonly [number, number, number];
// @ts-expect-error Maximum specificity is readonly because it can alias an input.
maximum[0] = 2;
