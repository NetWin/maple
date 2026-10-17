import { toBoolean } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';
import type { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';
import { helpers } from '../utils/helpers.ts';
import { iteratorCallback } from '../utils/iterator-callback.ts';

export const ITERATOR_METHOD_SOME: Method<IteratorWrapper> = method(
  Iterator.prototype.some.length,
  (i, [fn], context) => {
    const call = iteratorCallback(fn, context);
    return helpers(i).some((value, index) => toBoolean(call(value, index)));
  }
);
