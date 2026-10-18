import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';
import type { SetWrapper } from '../../../values/wrappers/set-wrapper.ts';

export const SET_METHOD_VALUES: Method<SetWrapper> = method(
  Set.prototype.values.length,
  (s) => new IteratorWrapper(s.set.values())
);
