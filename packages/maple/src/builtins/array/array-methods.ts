import type { Method } from '../../values/native.ts';
import { ARRAY_METHOD_AT } from './methods/at.ts';
import { ARRAY_METHOD_CONCAT } from './methods/concat.ts';
import { ARRAY_METHOD_COPY_WITHIN } from './methods/copy-within.ts';
import { ARRAY_METHOD_ENTRIES } from './methods/entries.ts';
import { ARRAY_METHOD_EVERY } from './methods/every.ts';
import { ARRAY_METHOD_FILL } from './methods/fill.ts';
import { ARRAY_METHOD_FILTER } from './methods/filter.ts';
import { ARRAY_METHOD_FIND_INDEX } from './methods/find-index.ts';
import { ARRAY_METHOD_FIND_LAST_INDEX } from './methods/find-last-index.ts';
import { ARRAY_METHOD_FIND_LAST } from './methods/find-last.ts';
import { ARRAY_METHOD_FIND } from './methods/find.ts';
import { ARRAY_METHOD_FLAT_MAP } from './methods/flat-map.ts';
import { ARRAY_METHOD_FLAT } from './methods/flat.ts';
import { ARRAY_METHOD_FOR_EACH } from './methods/for-each.ts';
import { ARRAY_METHOD_INCLUDES } from './methods/includes.ts';
import { ARRAY_METHOD_INDEX_OF } from './methods/index-of.ts';
import { ARRAY_METHOD_JOIN } from './methods/join.ts';
import { ARRAY_METHOD_KEYS } from './methods/keys.ts';
import { ARRAY_METHOD_LAST_INDEX_OF } from './methods/last-index-of.ts';
import { ARRAY_METHOD_MAP } from './methods/map.ts';
import { ARRAY_METHOD_POP } from './methods/pop.ts';
import { ARRAY_METHOD_PUSH } from './methods/push.ts';
import { ARRAY_METHOD_REDUCE_RIGHT } from './methods/reduce-right.ts';
import { ARRAY_METHOD_REDUCE } from './methods/reduce.ts';
import { ARRAY_METHOD_REVERSE } from './methods/reverse.ts';
import { ARRAY_METHOD_SHIFT } from './methods/shift.ts';
import { ARRAY_METHOD_SLICE } from './methods/slice.ts';
import { ARRAY_METHOD_SOME } from './methods/some.ts';
import { ARRAY_METHOD_SORT } from './methods/sort.ts';
import { ARRAY_METHOD_SPLICE } from './methods/splice.ts';
import { ARRAY_METHOD_TO_LOCALE_STRING } from './methods/to-locale-string.ts';
import { ARRAY_METHOD_TO_REVERSED } from './methods/to-reversed.ts';
import { ARRAY_METHOD_TO_SORTED } from './methods/to-sorted.ts';
import { ARRAY_METHOD_TO_SPLICED } from './methods/to-spliced.ts';
import { ARRAY_METHOD_TO_STRING } from './methods/to-string.ts';
import { ARRAY_METHOD_UNSHIFT } from './methods/unshift.ts';
import { ARRAY_METHOD_VALUES } from './methods/values.ts';
import { ARRAY_METHOD_WITH } from './methods/with.ts';

/**
 * Callbacks always run through the interpreter, so they stay under the budget and the host never
 * holds a script function. Methods that mutate refuse read-only input arrays.
 */
export const ARRAY_METHODS: ReadonlyMap<string, Method<Array<unknown>>> = new Map([
  ['at', ARRAY_METHOD_AT],
  ['concat', ARRAY_METHOD_CONCAT],
  ['copyWithin', ARRAY_METHOD_COPY_WITHIN],
  ['entries', ARRAY_METHOD_ENTRIES],
  ['every', ARRAY_METHOD_EVERY],
  ['fill', ARRAY_METHOD_FILL],
  ['filter', ARRAY_METHOD_FILTER],
  ['find', ARRAY_METHOD_FIND],
  ['findIndex', ARRAY_METHOD_FIND_INDEX],
  ['findLast', ARRAY_METHOD_FIND_LAST],
  ['findLastIndex', ARRAY_METHOD_FIND_LAST_INDEX],
  ['flat', ARRAY_METHOD_FLAT],
  ['flatMap', ARRAY_METHOD_FLAT_MAP],
  ['forEach', ARRAY_METHOD_FOR_EACH],
  ['includes', ARRAY_METHOD_INCLUDES],
  ['indexOf', ARRAY_METHOD_INDEX_OF],
  ['join', ARRAY_METHOD_JOIN],
  ['keys', ARRAY_METHOD_KEYS],
  ['lastIndexOf', ARRAY_METHOD_LAST_INDEX_OF],
  ['map', ARRAY_METHOD_MAP],
  ['pop', ARRAY_METHOD_POP],
  ['push', ARRAY_METHOD_PUSH],
  ['reduce', ARRAY_METHOD_REDUCE],
  ['reduceRight', ARRAY_METHOD_REDUCE_RIGHT],
  ['reverse', ARRAY_METHOD_REVERSE],
  ['shift', ARRAY_METHOD_SHIFT],
  ['slice', ARRAY_METHOD_SLICE],
  ['some', ARRAY_METHOD_SOME],
  ['sort', ARRAY_METHOD_SORT],
  ['splice', ARRAY_METHOD_SPLICE],
  ['toReversed', ARRAY_METHOD_TO_REVERSED],
  ['toSorted', ARRAY_METHOD_TO_SORTED],
  ['toSpliced', ARRAY_METHOD_TO_SPLICED],
  ['toLocaleString', ARRAY_METHOD_TO_LOCALE_STRING],
  ['toString', ARRAY_METHOD_TO_STRING],
  ['unshift', ARRAY_METHOD_UNSHIFT],
  ['values', ARRAY_METHOD_VALUES],
  ['with', ARRAY_METHOD_WITH]
]);
