import { toNumber, toString } from '../../../values/coercion.ts';
import type { CallContext } from '../../../values/native.ts';
import { arrayCallback } from './array-callback.ts';

/** `sort` without a comparator orders by the hook-free string form, undefined last. */
export function comparator(
  fn: unknown,
  context: CallContext
): (left: unknown, right: unknown) => number {
  if (fn === undefined) {
    return compareDefault;
  }
  const call = arrayCallback(fn, context);
  return (left, right) => {
    const order = toNumber(call(left, right));
    return Number.isNaN(order) ? 0 : order;
  };
}

function compareDefault(left: unknown, right: unknown): number {
  if (left === undefined) {
    return right === undefined ? 0 : 1;
  }
  if (right === undefined) {
    return -1;
  }
  const leftText = toString(left);
  const rightText = toString(right);
  return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
}
