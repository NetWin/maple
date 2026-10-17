import { isPlainObject } from '../../../support/is-plain-object.ts';
import { getExtraPropertiesOf } from '../../../values/members.ts';
import { NativeFunction } from '../../../values/native.ts';

/**
 * Built-in functions and namespaces cannot be written to, so they count as frozen. An error, a
 * script function or a wrapper is frozen once its extra properties are; a wrapper from the input
 * is read-only and counts as frozen from the start.
 */
export const OBJECT_STATIC_IS_FROZEN: NativeFunction = new NativeFunction(
  'isFrozen',
  Object.isFrozen.length,
  (_, [target], { runState }) => {
    if (Array.isArray(target) || isPlainObject(target)) {
      return Object.isFrozen(target);
    }

    const extra = getExtraPropertiesOf(target, runState);
    return !extra || extra.locked;
  }
);
