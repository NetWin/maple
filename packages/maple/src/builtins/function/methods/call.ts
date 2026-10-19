import { method, type Method } from '../../../values/native.ts';
import type { SandboxFunction } from '../function-prototype.ts';

export const FUNCTION_METHOD_CALL: Method<SandboxFunction> = method(
  Function.prototype.call.length,
  (fn, [thisArg, ...args], context) => context.call(thisArg, fn, args)
);
