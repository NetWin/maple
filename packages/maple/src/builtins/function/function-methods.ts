import type { Method } from '../../values/native.ts';
import { FUNCTION_METHOD_TO_STRING } from './methods/to-string.ts';
import { FUNCTION_METHOD_VALUE_OF } from './methods/value-of.ts';

/**
 * The methods every function answers to, closures, built-ins and host functions alike. `call`,
 * `apply` and `bind` have no receiver to set and are left out.
 */
export const FUNCTION_METHODS: ReadonlyMap<string, Method<unknown>> = new Map([
  ['toString', FUNCTION_METHOD_TO_STRING],
  ['valueOf', FUNCTION_METHOD_VALUE_OF]
]);
