import { canBeHeldWeakly } from '../../../support/can-be-held-weakly.ts';
import { method, type Method } from '../../../values/native.ts';
import type { WeakSetWrapper } from '../../../values/wrappers/weak-set-wrapper.ts';

export const INVALID_WEAK_SET_VALUE = 'Invalid value used in weak set';

/** A primitive throws, as in JavaScript: `new WeakSet().add('a')`. */
export const WEAK_SET_METHOD_ADD: Method<WeakSetWrapper> = method(
  WeakSet.prototype.add.length,
  (s, [value], { fail }) => {
    if (!canBeHeldWeakly(value)) {
      return fail('TypeError', INVALID_WEAK_SET_VALUE);
    }
    s.set.add(value);
    return s;
  }
);
