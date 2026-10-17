import { toString } from '../../../values/coercion.ts';
import { type CallContext, isCallable } from '../../../values/native.ts';

export type IteratorCallback = (...args: Array<unknown>) => unknown;

/** Checked before the host sees it, since a host `TypeError` would surface as an internal error. */
export function iteratorCallback(fn: unknown, context: CallContext): IteratorCallback {
  if (!isCallable(fn)) {
    return context.fail('TypeError', `${toString(fn)} is not a function`);
  }
  return (...args) => context.call(fn, args);
}
