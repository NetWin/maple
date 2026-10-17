import type { NativeFunction } from '../../values/native.ts';
import { MAP_STATIC_GROUP_BY } from './statics/group-by.ts';

/** The `Map.*` functions. */
export const MAP_STATICS: Readonly<Record<string, NativeFunction>> = {
  groupBy: MAP_STATIC_GROUP_BY
};
