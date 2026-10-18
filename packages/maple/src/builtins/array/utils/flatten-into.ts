import { MAX_NESTING } from '../../../support/nesting-limit.ts';
import type { CallContext } from '../../../values/native.ts';

/**
 * Appends the elements of `source` to `target`, opening nested arrays `depth` levels deep and
 * skipping holes. Every element visited costs an operation: an array reached through several
 * slots is walked once per slot, so a few operations can build a structure that takes
 * exponentially many steps to flatten.
 */
export function flattenInto(
  target: Array<unknown>,
  source: ReadonlyArray<unknown>,
  depth: number,
  context: CallContext,
  nesting: number = 0
): void {
  if (nesting >= MAX_NESTING) {
    return context.fail(
      'RangeError',
      `An array nested deeper than ${MAX_NESTING} levels cannot be flattened`
    );
  }

  for (let index = 0; index < source.length; index++) {
    if (!Object.hasOwn(source, index)) {
      continue;
    }
    context.charge(1);
    const element = source[index];
    if (depth >= 1 && Array.isArray(element)) {
      flattenInto(target, element, depth - 1, context, nesting + 1);
    } else {
      target.push(element);
    }
  }
}
