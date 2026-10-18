import { isPlainObject } from '../../../support/is-plain-object.ts';
import { NativeFunction } from '../../../values/native.ts';
import { SandboxObject } from '../../../values/sandbox-object.ts';

/**
 * Derived from the properties, as JavaScript does: a primitive counts as frozen, and a wrapper
 * from the input is frozen from the start.
 */
export const OBJECT_STATIC_IS_FROZEN: NativeFunction = new NativeFunction(
  'isFrozen',
  Object.isFrozen.length,
  (_, [target], { runState }) => {
    if (Array.isArray(target) || isPlainObject(target)) {
      return Object.isFrozen(target);
    }
    return target instanceof SandboxObject ? target.testIntegrityLevel('frozen', runState) : true;
  }
);
