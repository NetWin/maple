import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper, type SetWrapper } from '../../../values/wrappers.ts';

export const SET_METHOD_KEYS: Method<SetWrapper> = method(
  Set.prototype.keys.length,
  (s) => new IteratorWrapper(s.set.values())
);
