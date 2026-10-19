import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';

export const ARRAY_METHOD_ENTRIES: Method<Array<unknown>> = method(
  Array.prototype.entries.length,
  (a) => new IteratorWrapper(Array.prototype.entries.call(a))
);
