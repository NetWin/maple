import { Prototype } from '../../values/prototype.ts';
import { WeakMapWrapper } from '../../values/wrappers/weak-map-wrapper.ts';
import { WEAK_MAP_METHOD_DELETE } from './methods/delete.ts';
import { WEAK_MAP_METHOD_GET } from './methods/get.ts';
import { WEAK_MAP_METHOD_HAS } from './methods/has.ts';
import { WEAK_MAP_METHOD_SET } from './methods/set.ts';

/**
 * Keys are compared by identity in the host `WeakMap`, so `wm.get({})` never finds an entry stored
 * under another `{}`. Nothing lists the entries, so a script cannot tell whether one was collected.
 */
export const WEAK_MAP_PROTOTYPE: Prototype<WeakMapWrapper> = new Prototype(
  'WeakMap',
  (value): value is WeakMapWrapper => value instanceof WeakMapWrapper,
  {
    delete: WEAK_MAP_METHOD_DELETE,
    get: WEAK_MAP_METHOD_GET,
    has: WEAK_MAP_METHOD_HAS,
    set: WEAK_MAP_METHOD_SET
  }
);
