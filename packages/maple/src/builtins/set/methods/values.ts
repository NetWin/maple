import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper, type SetWrapper } from '../../../values/wrappers.ts';

export const SET_METHOD_VALUES: Method<SetWrapper> = method(
  Set.prototype.values.length,
  (s) => new IteratorWrapper(s.set.values())
);
