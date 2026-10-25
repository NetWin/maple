import { hasOwnMember, toArrayIndex, toPropertyKey } from '../../../values/members.ts';
import { NativeFunction } from '../../../values/native.ts';
import { asObjectCoercibleOrThrow } from '../utils/as-object-coercible-or-throw.ts';

/**
 * `Object.hasOwn(target, key)`: whether `target` has `key` as its own property, not only through
 * its type:
 *
 * - `Object.hasOwn([1], 'length')` is `true`;
 * - `Object.hasOwn(new Map(), 'size')` is `false`.
 *
 * A string's own keys are its indices and `length`; `null` and `undefined` are a TypeError.
 */
export const OBJECT_STATIC_HAS_OWN: NativeFunction = new NativeFunction(
  'hasOwn',
  Object.hasOwn.length,
  (_, [target, key], context) => {
    const object = asObjectCoercibleOrThrow(target, context.fail);
    const name = toPropertyKey(key);

    if (typeof object === 'string') {
      const index = toArrayIndex(name);
      return name === 'length' || (index !== undefined && index < object.length);
    }

    return typeof object === 'object' && object !== null
      ? hasOwnMember(object, name, context.runState)
      : false;
  }
);
