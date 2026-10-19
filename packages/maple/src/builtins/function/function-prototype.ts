import type { Builtin } from '../../values/builtin.ts';
import type { Closure } from '../../values/closure.ts';
import { isCallable, type NativeFunction } from '../../values/native.ts';
import { Prototype } from '../../values/prototype.ts';
import { FUNCTION_METHOD_APPLY } from './methods/apply.ts';
import { FUNCTION_METHOD_BIND } from './methods/bind.ts';
import { FUNCTION_METHOD_CALL } from './methods/call.ts';
import { FUNCTION_METHOD_TO_STRING } from './methods/to-string.ts';
import { FUNCTION_METHOD_VALUE_OF } from './methods/value-of.ts';

/** What a script can call: a script function, a built-in or host function, or a callable global. */
export type SandboxFunction = Closure | NativeFunction | Builtin;

/**
 * The methods every function answers to, closures, built-ins and host functions alike. The
 * receiver `call`, `apply` and `bind` pass on reaches a built-in method, which checks it, and is
 * invisible to a script function, which has no `this`.
 */
export const FUNCTION_PROTOTYPE: Prototype<SandboxFunction> = new Prototype(
  'Function',
  (value): value is SandboxFunction => isCallable(value),
  {
    apply: FUNCTION_METHOD_APPLY,
    bind: FUNCTION_METHOD_BIND,
    call: FUNCTION_METHOD_CALL,
    toString: FUNCTION_METHOD_TO_STRING,
    valueOf: FUNCTION_METHOD_VALUE_OF
  }
);
