import { method, type Method } from '../../../values/native.ts';
import type { IteratorWrapper } from '../../../values/wrappers/iterator-wrapper.ts';

export const ITERATOR_METHOD_NEXT: Method<IteratorWrapper> = method(0, (i) => {
  const step = i.iterator.next();
  return step.done === true ? { value: undefined, done: true } : { value: step.value, done: false };
});
