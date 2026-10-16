import { toString } from '../values/coercion.ts';
import { type Method, method } from '../values/native.ts';

type FunctionMethod = Method<unknown>;

/**
 * The methods every function answers to, closures, built-ins and host functions alike. A function
 * converts to a fixed placeholder, so `toString` reveals no source text; `call`, `apply` and
 * `bind` have no receiver to set and are left out.
 */
export const FUNCTION_METHODS: ReadonlyMap<string, FunctionMethod> = new Map<
  string,
  FunctionMethod
>([
  ['toString', method(Function.prototype.toString.length, (fn) => toString(fn))],
  ['valueOf', method(Function.prototype.valueOf.length, (fn) => fn)]
]);
