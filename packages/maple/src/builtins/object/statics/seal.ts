import { isPlainObject } from '../../../support/is-plain-object.ts';
import { NativeFunction } from '../../../values/native.ts';
import { SandboxObject } from '../../../values/sandbox-object.ts';

/**
 * Sealing reaches what the script can write to: objects, arrays and Maple's own values. Everything
 * else is returned as it is, as JavaScript does for primitives.
 */
export const OBJECT_STATIC_SEAL: NativeFunction = new NativeFunction(
  'seal',
  Object.seal.length,
  (_, [target], { runState }) => {
    if (Array.isArray(target) || isPlainObject(target)) {
      Object.seal(target);
    } else if (target instanceof SandboxObject) {
      target.setIntegrityLevel('sealed', runState);
    }
    return target;
  }
);
