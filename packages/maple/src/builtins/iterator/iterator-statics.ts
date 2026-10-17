import type { NativeFunction } from '../../values/native.ts';
import { ITERATOR_STATIC_FROM } from './statics/from.ts';

/** The `Iterator.*` functions. */
export const ITERATOR_STATICS: Readonly<Record<string, NativeFunction>> = {
  from: ITERATOR_STATIC_FROM
};
