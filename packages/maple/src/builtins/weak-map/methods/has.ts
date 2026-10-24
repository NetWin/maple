import { canBeHeldWeakly } from '../../../support/can-be-held-weakly.ts';
import { method, type Method } from '../../../values/native.ts';
import type { WeakMapWrapper } from '../../../values/wrappers/weak-map-wrapper.ts';

export const WEAK_MAP_METHOD_HAS: Method<WeakMapWrapper> = method(
  WeakMap.prototype.has.length,
  (m, [key]) => canBeHeldWeakly(key) && m.map.has(key)
);
