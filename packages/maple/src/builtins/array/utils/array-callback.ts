import { describeValue } from '../../../values/coercion.ts';
import { isCallable, type CallContext } from '../../../values/native.ts';

export type ArrayCallback = (...args: Array<unknown>) => unknown;

/**
 * The script callback as a host function; a non-callable argument fails like the host would. It
 * runs with `thisArg` as `this`, which is `undefined` for the methods that take none.
 */
export function arrayCallback(fn: unknown, context: CallContext, thisArg?: unknown): ArrayCallback {
  if (!isCallable(fn)) {
    context.fail('TypeError', `${describeValue(fn)} is not a function`);
  }
  return (...args) => context.call(thisArg, fn, args);
}
