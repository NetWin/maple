import { NativeFunction } from '../../../values/native.ts';

export const OBJECT_STATIC_IS: NativeFunction = new NativeFunction(
  'is',
  Object.is.length,
  ([left, right]) => Object.is(left, right)
);
