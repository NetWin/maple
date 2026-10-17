import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper, type SetWrapper } from '../../../values/wrappers.ts';

export const SET_METHOD_ENTRIES: Method<SetWrapper> = method(
  Set.prototype.entries.length,
  (s) => new IteratorWrapper(s.set.entries())
);
