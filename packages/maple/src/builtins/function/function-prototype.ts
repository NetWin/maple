import { isCallable } from '../../values/native.ts';
import { Prototype } from '../../values/prototype.ts';
import { FUNCTION_METHOD_TO_STRING } from './methods/to-string.ts';
import { FUNCTION_METHOD_VALUE_OF } from './methods/value-of.ts';

/**
 * The methods every function answers to, closures, built-ins and host functions alike. `call`,
 * `apply` and `bind`, which would let a script pick the receiver, are left out.
 */
export const FUNCTION_PROTOTYPE: Prototype = new Prototype(
  'Function',
  (value): value is unknown => isCallable(value),
  {
    toString: FUNCTION_METHOD_TO_STRING,
    valueOf: FUNCTION_METHOD_VALUE_OF
  }
);
