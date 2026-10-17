import { method, type Method } from '../../../values/native.ts';
import { type IteratorWrapper } from '../../../values/wrappers.ts';
import { helpers } from '../utils/helpers.ts';

export const ITERATOR_METHOD_TO_ARRAY: Method<IteratorWrapper> = method(
  Iterator.prototype.toArray.length,
  (i) => helpers(i).toArray()
);
