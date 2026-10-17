import { toBoolean } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';
import { type IteratorWrapper } from '../../../values/wrappers.ts';
import { helpers } from '../utils/helpers.ts';
import { iteratorCallback } from '../utils/iterator-callback.ts';

export const ITERATOR_METHOD_EVERY: Method<IteratorWrapper> = method(
  Iterator.prototype.every.length,
  (i, [fn], context) => {
    const call = iteratorCallback(fn, context);
    return helpers(i).every((value, index) => toBoolean(call(value, index)));
  }
);
