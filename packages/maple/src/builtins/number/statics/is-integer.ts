import { NativeFunction } from '../../../values/native.ts';

export const NUMBER_STATIC_IS_INTEGER: NativeFunction = new NativeFunction(
  'isInteger',
  Number.isInteger.length,
  ([value]) => Number.isInteger(value)
);
