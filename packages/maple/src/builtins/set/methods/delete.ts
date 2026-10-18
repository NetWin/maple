import { method, type Method } from '../../../values/native.ts';
import type { SetWrapper } from '../../../values/wrappers/set-wrapper.ts';
import { asMutableOrThrow } from '../../../values/wrappers/wrapper.ts';

export const SET_METHOD_DELETE: Method<SetWrapper> = method(
  Set.prototype.delete.length,
  (s, [value], { fail }) => asMutableOrThrow(s, fail, 'delete').set.delete(value)
);
