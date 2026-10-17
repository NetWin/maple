import type { NativeFunction } from '../../values/native.ts';
import { ARRAY_STATIC_FROM } from './statics/from.ts';
import { ARRAY_STATIC_IS_ARRAY } from './statics/is-array.ts';
import { ARRAY_STATIC_OF } from './statics/of.ts';

/** The `Array.*` functions. */
export const ARRAY_STATICS: Readonly<Record<string, NativeFunction>> = {
  isArray: ARRAY_STATIC_IS_ARRAY,
  of: ARRAY_STATIC_OF,
  from: ARRAY_STATIC_FROM
};
