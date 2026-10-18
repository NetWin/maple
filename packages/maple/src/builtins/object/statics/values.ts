import { ownEntries } from '../../../values/members.ts';
import { NativeFunction } from '../../../values/native.ts';
import { asObjectCoercibleOrThrow } from '../utils/as-object-coercible-or-throw.ts';

export const OBJECT_STATIC_VALUES: NativeFunction = new NativeFunction(
  'values',
  Object.values.length,
  (_, [target], { fail, runState }) =>
    Array.from(ownEntries(asObjectCoercibleOrThrow(target, fail), runState), ([, value]) => value)
);
