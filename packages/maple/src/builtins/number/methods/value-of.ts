import { method, type Method } from '../../../values/native.ts';

export const NUMBER_METHOD_VALUE_OF: Method<number> = method(
  Number.prototype.valueOf.length,
  (n) => n
);
