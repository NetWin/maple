import { ownEntries } from '../../../values/members.ts';
import { NativeFunction } from '../../../values/native.ts';
import { asObjectCoercibleOrThrow } from '../utils/as-object-coercible-or-throw.ts';

export const OBJECT_STATIC_KEYS: NativeFunction = new NativeFunction(
  'keys',
  Object.keys.length,
  ([target], { fail }) =>
    Array.from(ownEntries(asObjectCoercibleOrThrow(target, fail)), ([key]) => key)
);
