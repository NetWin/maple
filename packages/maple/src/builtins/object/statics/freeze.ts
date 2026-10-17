import { isPlainObject } from '../../../support/is-plain-object.ts';
import { getExtraPropertiesOf } from '../../../values/members.ts';
import { NativeFunction } from '../../../values/native.ts';
import { SandboxError } from '../../../values/sandbox-error.ts';

/**
 * Freezing reaches what the script can write to: objects, arrays, and the properties it added to
 * an error, a script function or a wrapper. Everything else is returned as it is, as JavaScript
 * does for primitives.
 */
export const OBJECT_STATIC_FREEZE: NativeFunction = new NativeFunction(
  'freeze',
  Object.freeze.length,
  (_, [target]) => {
    if (Array.isArray(target) || isPlainObject(target) || target instanceof SandboxError) {
      Object.freeze(target);
    }
    getExtraPropertiesOf(target)?.lock();
    return target;
  }
);
