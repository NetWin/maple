import { method, type Method } from '../../../values/native.ts';
import type { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';
import { helpers } from '../utils/helpers.ts';
import { iteratorCallback } from '../utils/iterator-callback.ts';

export const ITERATOR_METHOD_FOR_EACH: Method<IteratorWrapper> = method(
  Iterator.prototype.forEach.length,
  (i, [fn], context) => {
    const call = iteratorCallback(fn, context);
    helpers(i).forEach((value, index) => call(value, index));
    return undefined;
  }
);
