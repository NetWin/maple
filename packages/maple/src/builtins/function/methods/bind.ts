import { method, type Method, NativeFunction } from '../../../values/native.ts';
import type { SandboxFunction } from '../function-prototype.ts';

/**
 * A bound function is a built-in of the run that made it. A host function bound keeps showing no
 * properties, as host functions do.
 */
export const FUNCTION_METHOD_BIND: Method<SandboxFunction> = method(
  Function.prototype.bind.length,
  (fn, [thisArg, ...boundArgs]) =>
    new NativeFunction(
      `bound ${fn.name}`,
      fn.length === undefined ? undefined : Math.max(0, fn.length - boundArgs.length),
      (_, args, context) => {
        // Copying the bound arguments into each call costs one operation apiece
        context.charge(boundArgs.length);
        return context.call(thisArg, fn, [...boundArgs, ...args]);
      },
      false
    )
);
