import { NativeFunction } from '../../../values/native.ts';

export const ARRAY_STATIC_IS_ARRAY: NativeFunction = new NativeFunction(
  'isArray',
  Array.isArray.length,
  ([value]) => Array.isArray(value)
);
