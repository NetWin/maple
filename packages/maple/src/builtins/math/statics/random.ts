import { NativeFunction } from '../../../values/native.ts';

export const MATH_STATIC_RANDOM: NativeFunction = new NativeFunction(
  'random',
  Math.random.length,
  () => Math.random()
);
