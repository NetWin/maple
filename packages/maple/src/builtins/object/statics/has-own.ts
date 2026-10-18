import { hasMember, toArrayIndex, toPropertyKey } from '../../../values/members.ts';
import { NativeFunction } from '../../../values/native.ts';
import { asObjectCoercibleOrThrow } from '../utils/as-object-coercible-or-throw.ts';

/** Also answers for strings, whose own keys are the indices and `length`. */
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

    return typeof object === 'object' && object !== null ? hasMember(object, name, context) : false;
  }
);
