import type { Method } from '../../values/native.ts';
import type { IteratorWrapper } from '../../values/wrappers.ts';
import { ITERATOR_METHOD_DROP } from './methods/drop.ts';
import { ITERATOR_METHOD_EVERY } from './methods/every.ts';
import { ITERATOR_METHOD_FILTER } from './methods/filter.ts';
import { ITERATOR_METHOD_FIND } from './methods/find.ts';
import { ITERATOR_METHOD_FLAT_MAP } from './methods/flat-map.ts';
import { ITERATOR_METHOD_FOR_EACH } from './methods/for-each.ts';
import { ITERATOR_METHOD_MAP } from './methods/map.ts';
import { ITERATOR_METHOD_NEXT } from './methods/next.ts';
import { ITERATOR_METHOD_REDUCE } from './methods/reduce.ts';
import { ITERATOR_METHOD_SOME } from './methods/some.ts';
import { ITERATOR_METHOD_TAKE } from './methods/take.ts';
import { ITERATOR_METHOD_TO_ARRAY } from './methods/to-array.ts';

/**
 * `next()` hands out a fresh `{ value, done }` object each time, as the protocol requires. The
 * helpers consume the iterator they are called on; the lazy ones return a new iterator whose
 * callback runs, under the budget, only when a value is pulled.
 */
export const ITERATOR_METHODS: ReadonlyMap<string, Method<IteratorWrapper>> = new Map([
  ['drop', ITERATOR_METHOD_DROP],
  ['every', ITERATOR_METHOD_EVERY],
  ['filter', ITERATOR_METHOD_FILTER],
  ['find', ITERATOR_METHOD_FIND],
  ['flatMap', ITERATOR_METHOD_FLAT_MAP],
  ['forEach', ITERATOR_METHOD_FOR_EACH],
  ['map', ITERATOR_METHOD_MAP],
  ['next', ITERATOR_METHOD_NEXT],
  ['reduce', ITERATOR_METHOD_REDUCE],
  ['some', ITERATOR_METHOD_SOME],
  ['take', ITERATOR_METHOD_TAKE],
  ['toArray', ITERATOR_METHOD_TO_ARRAY]
]);
