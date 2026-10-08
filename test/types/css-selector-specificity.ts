import type {PseudoClassSelectorPlain, SelectorListPlain, SelectorPlain} from '@eslint/css-tree';
import {getSelectorArgument, getSelectorSpecificity} from '../../rules/shared/css-selector-specificity.js';

declare const pseudoClass: PseudoClassSelectorPlain;
declare const selector: SelectorPlain;

const argument = getSelectorArgument(pseudoClass);
argument satisfies SelectorPlain | SelectorListPlain | null | undefined;
// @ts-expect-error Selector arguments do not have pseudo-class names.
argument?.name;
// @ts-expect-error Only pseudo-selectors have selector arguments.
getSelectorArgument(selector);

const result = getSelectorSpecificity(selector, [0, 1, 0]);
result.specificity satisfies [number, number, number];
result.hasNestingSelector satisfies boolean;
// @ts-expect-error Specificity has exactly three components.
result.specificity[3];
// @ts-expect-error Nesting specificity requires three components.
getSelectorSpecificity(selector, [0, 1]);
