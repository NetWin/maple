import type { Method } from '../../values/native.ts';
import type { MapWrapper } from '../../values/wrappers.ts';
import { MAP_METHOD_CLEAR } from './methods/clear.ts';
import { MAP_METHOD_DELETE } from './methods/delete.ts';
import { MAP_METHOD_ENTRIES } from './methods/entries.ts';
import { MAP_METHOD_FOR_EACH } from './methods/for-each.ts';
import { MAP_METHOD_GET } from './methods/get.ts';
import { MAP_METHOD_HAS } from './methods/has.ts';
import { MAP_METHOD_KEYS } from './methods/keys.ts';
import { MAP_METHOD_SET } from './methods/set.ts';
import { MAP_METHOD_VALUES } from './methods/values.ts';

/** Key identity and SameValueZero equality are the host `Map`'s; the entries are sandbox values. */
export const MAP_METHODS: ReadonlyMap<string, Method<MapWrapper>> = new Map([
  ['clear', MAP_METHOD_CLEAR],
  ['delete', MAP_METHOD_DELETE],
  ['entries', MAP_METHOD_ENTRIES],
  ['forEach', MAP_METHOD_FOR_EACH],
  ['get', MAP_METHOD_GET],
  ['has', MAP_METHOD_HAS],
  ['keys', MAP_METHOD_KEYS],
  ['set', MAP_METHOD_SET],
  ['values', MAP_METHOD_VALUES]
]);
