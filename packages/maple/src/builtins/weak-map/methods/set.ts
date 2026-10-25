import { canBeHeldWeakly } from '../../../support/can-be-held-weakly.ts';
import { method, type Method } from '../../../values/native.ts';
import type { WeakMapWrapper } from '../../../values/wrappers/weak-map-wrapper.ts';

export const INVALID_WEAK_MAP_KEY = 'Invalid value used as weak map key';

/** A primitive key throws, as in JavaScript: `new WeakMap().set('a', 1)`. */
export const WEAK_MAP_METHOD_SET: Method<WeakMapWrapper> = method(
  WeakMap.prototype.set.length,
  (m, [key, value], { fail }) => {
    if (!canBeHeldWeakly(key)) {
      return fail('TypeError', INVALID_WEAK_MAP_KEY);
    }
    m.map.set(key, value);
    return m;
  }
);
