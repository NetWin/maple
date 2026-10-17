import { method, type Method } from '../../../values/native.ts';
import { type SetWrapper } from '../../../values/wrappers.ts';

export const SET_METHOD_HAS: Method<SetWrapper> = method(Set.prototype.has.length, (s, [value]) =>
  s.set.has(value)
);
