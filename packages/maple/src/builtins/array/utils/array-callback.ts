import { describeValue } from '../../../values/coercion.ts';
import { isCallable, type CallContext } from '../../../values/native.ts';

export type ArrayCallback = (...args: Array<unknown>) => unknown;

/** The script callback as a host function; a non-callable argument fails like the host would. */
export function arrayCallback(fn: unknown, context: CallContext): ArrayCallback {
  if (!isCallable(fn)) {
    context.fail('TypeError', `${describeValue(fn)} is not a function`);
  }
  return (...args) => context.call(undefined, fn, args);
}
