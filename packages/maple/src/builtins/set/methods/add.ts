import { method, type Method } from '../../../values/native.ts';
import { asMutableOrThrow, type SetWrapper } from '../../../values/wrappers.ts';

export const SET_METHOD_ADD: Method<SetWrapper> = method(
  Set.prototype.add.length,
  (s, [value], { fail }) => {
    asMutableOrThrow(s, fail, 'add').set.add(value);
    return s;
  }
);
