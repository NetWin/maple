import { ownEntries } from '../../../values/members.ts';
import { NativeFunction } from '../../../values/native.ts';
import { asObjectCoercibleOrThrow } from '../utils/as-object-coercible-or-throw.ts';

export const OBJECT_STATIC_ENTRIES: NativeFunction = new NativeFunction(
  'entries',
  Object.entries.length,
  (_, [target], { fail }) => Array.from(ownEntries(asObjectCoercibleOrThrow(target, fail)))
);
