import type { CallContext } from '../../../values/native.ts';

/** Input arrays are frozen; a mutator on one fails before it touches anything. */
export function asMutableArrayOrThrow(
  array: Array<unknown>,
  context: CallContext,
  methodName: string
): Array<unknown> {
  if (Object.isFrozen(array)) {
    return context.fail('TypeError', `Cannot call ${methodName} on a read-only array`);
  }
  return array;
}
