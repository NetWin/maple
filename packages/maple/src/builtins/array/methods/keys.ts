import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';

export const ARRAY_METHOD_KEYS: Method<Array<unknown>> = method(
  Array.prototype.keys.length,
  (a) => new IteratorWrapper(a.keys())
);
