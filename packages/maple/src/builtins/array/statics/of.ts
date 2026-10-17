import { NativeFunction } from '../../../values/native.ts';

export const ARRAY_STATIC_OF: NativeFunction = new NativeFunction(
  'of',
  Array.of.length,
  (items) => [...items]
);
