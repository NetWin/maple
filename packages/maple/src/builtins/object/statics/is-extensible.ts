import { isPlainObject } from '../../../support/is-plain-object.ts';
import { NativeFunction } from '../../../values/native.ts';
import { SandboxObject } from '../../../values/sandbox-object.ts';

/** A primitive is never extensible; a wrapper from the input is not from the start. */
export const OBJECT_STATIC_IS_EXTENSIBLE: NativeFunction = new NativeFunction(
  'isExtensible',
  Object.isExtensible.length,
  (_, [target], { runState }) => {
    if (Array.isArray(target) || isPlainObject(target)) {
      return Object.isExtensible(target);
    }
    return target instanceof SandboxObject && target.isExtensible(runState);
  }
);
