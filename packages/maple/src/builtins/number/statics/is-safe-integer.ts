import { NativeFunction } from '../../../values/native.ts';

export const NUMBER_STATIC_IS_SAFE_INTEGER: NativeFunction = new NativeFunction(
  'isSafeInteger',
  Number.isSafeInteger.length,
  (_, [value]) => Number.isSafeInteger(value)
);
