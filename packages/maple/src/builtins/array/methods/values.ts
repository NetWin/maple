import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers.ts';

export const ARRAY_METHOD_VALUES: Method<Array<unknown>> = method(
  Array.prototype.values.length,
  (a) => new IteratorWrapper(a.values())
);
