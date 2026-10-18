import { toString } from '../../../values/coercion.ts';
import { method, type Method } from '../../../values/native.ts';

/** A function converts to a fixed placeholder, so this reveals no source text. */
export const FUNCTION_METHOD_TO_STRING: Method<unknown> = method(
  Function.prototype.toString.length,
  (fn) => toString(fn)
);
