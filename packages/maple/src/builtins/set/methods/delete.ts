import { method, type Method } from '../../../values/native.ts';
import { asMutableOrThrow, type SetWrapper } from '../../../values/wrappers.ts';

export const SET_METHOD_DELETE: Method<SetWrapper> = method(
  Set.prototype.delete.length,
  (s, [value], { fail }) => asMutableOrThrow(s, fail, 'delete').set.delete(value)
);
