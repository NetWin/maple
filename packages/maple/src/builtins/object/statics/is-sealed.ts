import { isPlainObject } from '../../../support/is-plain-object.ts';
import { NativeFunction } from '../../../values/native.ts';
import { SandboxObject } from '../../../values/sandbox-object.ts';

/**
 * Derived from the properties, as JavaScript does: a primitive counts as sealed, and so does
 * anything frozen.
 */
export const OBJECT_STATIC_IS_SEALED: NativeFunction = new NativeFunction(
  'isSealed',
  Object.isSealed.length,
  (_, [target], { runState }) => {
    if (Array.isArray(target) || isPlainObject(target)) {
      return Object.isSealed(target);
    }
    return target instanceof SandboxObject ? target.testIntegrityLevel('sealed', runState) : true;
  }
);
