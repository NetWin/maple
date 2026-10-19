import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';

export const ARRAY_METHOD_VALUES: Method<Array<unknown>> = method(
  Array.prototype.values.length,
  (a) => new IteratorWrapper(Array.prototype.values.call(a))
);
