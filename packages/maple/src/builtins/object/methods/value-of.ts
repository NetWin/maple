import { method, type Method } from '../../../values/native.ts';

export const OBJECT_METHOD_VALUE_OF: Method<Record<string, unknown>> = method(
  Object.prototype.valueOf.length,
  (o) => o
);
