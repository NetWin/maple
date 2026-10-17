import { ownPropertyNames } from '../../../values/members.ts';
import { NativeFunction } from '../../../values/native.ts';
import { asObjectCoercibleOrThrow } from '../utils/as-object-coercible-or-throw.ts';

export const OBJECT_STATIC_GET_OWN_PROPERTY_NAMES: NativeFunction = new NativeFunction(
  'getOwnPropertyNames',
  Object.getOwnPropertyNames.length,
  (_, [target], { fail }) => ownPropertyNames(asObjectCoercibleOrThrow(target, fail))
);
