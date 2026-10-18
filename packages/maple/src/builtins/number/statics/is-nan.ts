import { NativeFunction } from '../../../values/native.ts';

export const NUMBER_STATIC_IS_NAN: NativeFunction = new NativeFunction(
  'isNaN',
  Number.isNaN.length,
  (_, [value]) => Number.isNaN(value)
);
