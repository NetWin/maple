import { Prototype } from '../../values/prototype.ts';
import { SetWrapper } from '../../values/wrappers/set-wrapper.ts';
import { SET_METHOD_ADD } from './methods/add.ts';
import { SET_METHOD_CLEAR } from './methods/clear.ts';
import { SET_METHOD_DELETE } from './methods/delete.ts';
import { SET_METHOD_DIFFERENCE } from './methods/difference.ts';
import { SET_METHOD_ENTRIES } from './methods/entries.ts';
import { SET_METHOD_FOR_EACH } from './methods/for-each.ts';
import { SET_METHOD_HAS } from './methods/has.ts';
import { SET_METHOD_INTERSECTION } from './methods/intersection.ts';
import { SET_METHOD_IS_DISJOINT_FROM } from './methods/is-disjoint-from.ts';
import { SET_METHOD_IS_SUBSET_OF } from './methods/is-subset-of.ts';
import { SET_METHOD_IS_SUPERSET_OF } from './methods/is-superset-of.ts';
import { SET_METHOD_KEYS } from './methods/keys.ts';
import { SET_METHOD_SYMMETRIC_DIFFERENCE } from './methods/symmetric-difference.ts';
import { SET_METHOD_UNION } from './methods/union.ts';
import { SET_METHOD_VALUES } from './methods/values.ts';

/**
 * Membership is the host `Set`'s SameValueZero over sandbox values. The set algebra methods
 * accept a Set or a Map, unwrapped before the host sees it, so no script member is ever called.
 */
export const SET_PROTOTYPE: Prototype<SetWrapper> = new Prototype(
  'Set',
  (value): value is SetWrapper => value instanceof SetWrapper,
  {
    add: SET_METHOD_ADD,
    clear: SET_METHOD_CLEAR,
    delete: SET_METHOD_DELETE,
    difference: SET_METHOD_DIFFERENCE,
    entries: SET_METHOD_ENTRIES,
    forEach: SET_METHOD_FOR_EACH,
    has: SET_METHOD_HAS,
    intersection: SET_METHOD_INTERSECTION,
    isDisjointFrom: SET_METHOD_IS_DISJOINT_FROM,
    isSubsetOf: SET_METHOD_IS_SUBSET_OF,
    isSupersetOf: SET_METHOD_IS_SUPERSET_OF,
    keys: SET_METHOD_KEYS,
    symmetricDifference: SET_METHOD_SYMMETRIC_DIFFERENCE,
    union: SET_METHOD_UNION,
    values: SET_METHOD_VALUES
  }
);
