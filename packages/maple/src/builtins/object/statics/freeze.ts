import { isPlainObject } from '../../../support/is-plain-object.ts';
import { NativeFunction } from '../../../values/native.ts';
import { SandboxError } from '../../../values/sandbox-error.ts';

/**
 * Freezing reaches what the script can write to: objects, arrays and errors. Everything else is
 * returned as it is, as the language does for primitives.
 */
export const OBJECT_STATIC_FREEZE: NativeFunction = new NativeFunction(
  'freeze',
  Object.freeze.length,
  ([target]) => {
    if (Array.isArray(target) || isPlainObject(target) || target instanceof SandboxError) {
      Object.freeze(target);
    }
    return target;
  }
);
