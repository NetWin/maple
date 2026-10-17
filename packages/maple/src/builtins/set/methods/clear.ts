import { method, type Method } from '../../../values/native.ts';
import { asMutableOrThrow, type SetWrapper } from '../../../values/wrappers.ts';

export const SET_METHOD_CLEAR: Method<SetWrapper> = method(
  Set.prototype.clear.length,
  (s, _args, { fail }) => asMutableOrThrow(s, fail, 'clear').set.clear()
);
