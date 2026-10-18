import { isPlainObject } from '../../../support/is-plain-object.ts';
import { NativeFunction } from '../../../values/native.ts';
import { SandboxObject } from '../../../values/sandbox-object.ts';

/**
 * Freezing reaches what the script can write to: objects, arrays and Maple's own values. Everything
 * else is returned as it is, as JavaScript does for primitives.
 */
export const OBJECT_STATIC_FREEZE: NativeFunction = new NativeFunction(
  'freeze',
  Object.freeze.length,
  (_, [target], { runState }) => {
    if (Array.isArray(target) || isPlainObject(target)) {
      Object.freeze(target);
    } else if (target instanceof SandboxObject) {
      target.setIntegrityLevel('frozen', runState);
    }
    return target;
  }
);
