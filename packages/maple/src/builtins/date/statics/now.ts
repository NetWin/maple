import { NativeFunction } from '../../../values/native.ts';

export const DATE_STATIC_NOW: NativeFunction = new NativeFunction('now', Date.now.length, () =>
  Date.now()
);
