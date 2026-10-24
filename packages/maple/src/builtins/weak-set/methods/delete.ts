import { canBeHeldWeakly } from '../../../support/can-be-held-weakly.ts';
import { method, type Method } from '../../../values/native.ts';
import type { WeakSetWrapper } from '../../../values/wrappers/weak-set-wrapper.ts';

export const WEAK_SET_METHOD_DELETE: Method<WeakSetWrapper> = method(
  WeakSet.prototype.delete.length,
  (s, [value]) => canBeHeldWeakly(value) && s.set.delete(value)
);
