import { NativeFunction } from '../../../values/native.ts';

export const NUMBER_STATIC_IS_FINITE: NativeFunction = new NativeFunction(
  'isFinite',
  Number.isFinite.length,
  (_, [value]) => Number.isFinite(value)
);
