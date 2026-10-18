import { method, type Method } from '../../../values/native.ts';
import type { SetWrapper } from '../../../values/wrappers/set-wrapper.ts';
import { asMutableOrThrow } from '../../../values/wrappers/wrapper.ts';

export const SET_METHOD_CLEAR: Method<SetWrapper> = method(
  Set.prototype.clear.length,
  (s, _args, { fail }) => asMutableOrThrow(s, fail, 'clear').set.clear()
);
