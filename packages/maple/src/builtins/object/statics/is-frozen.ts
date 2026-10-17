import { isPlainObject } from '../../../support/is-plain-object.ts';
import { NativeFunction } from '../../../values/native.ts';
import { SandboxError } from '../../../values/sandbox-error.ts';
import { isWrapper, IteratorWrapper } from '../../../values/wrappers.ts';

/**
 * Functions and namespaces cannot be written to, so they count as frozen; collections from the
 * input are read-only and count as frozen too.
 */
export const OBJECT_STATIC_IS_FROZEN: NativeFunction = new NativeFunction(
  'isFrozen',
  Object.isFrozen.length,
  (_, [target]) => {
    if (Array.isArray(target) || isPlainObject(target) || target instanceof SandboxError) {
      return Object.isFrozen(target);
    }

    if (target instanceof IteratorWrapper) {
      return false;
    }

    if (isWrapper(target) && 'frozen' in target) {
      return target.frozen;
    }

    return true;
  }
);
