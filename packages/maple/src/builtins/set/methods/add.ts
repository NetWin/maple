import { method, type Method } from '../../../values/native.ts';
import type { SetWrapper } from '../../../values/wrappers/set-wrapper.ts';
import { asMutableOrThrow } from '../../../values/wrappers/wrapper.ts';

export const SET_METHOD_ADD: Method<SetWrapper> = method(
  Set.prototype.add.length,
  (s, [value], { fail }) => {
    asMutableOrThrow(s, fail, 'add').set.add(value);
    return s;
  }
);
