import { method, type Method } from '../../../values/native.ts';
import { IteratorWrapper } from '../../../values/wrappers.ts';

export const ARRAY_METHOD_ENTRIES: Method<Array<unknown>> = method(
  Array.prototype.entries.length,
  (a) => new IteratorWrapper(a.entries())
);
