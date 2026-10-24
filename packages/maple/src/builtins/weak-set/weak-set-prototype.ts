import { Prototype } from '../../values/prototype.ts';
import { WeakSetWrapper } from '../../values/wrappers/weak-set-wrapper.ts';
import { WEAK_SET_METHOD_ADD } from './methods/add.ts';
import { WEAK_SET_METHOD_DELETE } from './methods/delete.ts';
import { WEAK_SET_METHOD_HAS } from './methods/has.ts';

/**
 * Membership is identity in the host `WeakSet`, so `ws.has({})` is false for a different `{}`.
 * Nothing lists the entries, so a script cannot tell whether one was collected.
 */
export const WEAK_SET_PROTOTYPE: Prototype<WeakSetWrapper> = new Prototype(
  'WeakSet',
  (value): value is WeakSetWrapper => value instanceof WeakSetWrapper,
  {
    add: WEAK_SET_METHOD_ADD,
    delete: WEAK_SET_METHOD_DELETE,
    has: WEAK_SET_METHOD_HAS
  }
);
