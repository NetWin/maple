import { isPlainObject } from '../../../support/is-plain-object.ts';
import { NativeFunction } from '../../../values/native.ts';
import { SandboxObject } from '../../../values/sandbox-object.ts';

/** Anything other than an object, an array or one of Maple's own values is returned as it is. */
export const OBJECT_STATIC_PREVENT_EXTENSIONS: NativeFunction = new NativeFunction(
  'preventExtensions',
  Object.preventExtensions.length,
  (_, [target], { runState }) => {
    if (Array.isArray(target) || isPlainObject(target)) {
      Object.preventExtensions(target);
    } else if (target instanceof SandboxObject) {
      target.preventExtensions(runState);
    }
    return target;
  }
);
