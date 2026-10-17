import type { CallContext } from '../../../values/native.ts';
import { arrayCallback } from './array-callback.ts';
import { presentEntries } from './entries.ts';

export function reduce(
  array: ReadonlyArray<unknown>,
  args: ReadonlyArray<unknown>,
  context: CallContext,
  fromEnd: boolean
): unknown {
  const call = arrayCallback(args[0], context);
  const entries = presentEntries(array);
  if (fromEnd) {
    entries.reverse();
  }

  let accumulator: unknown;
  if (args.length > 1) {
    accumulator = args[1];
  } else {
    const first = entries.shift();
    if (!first) {
      context.fail('TypeError', 'Reduce of empty array with no initial value');
    }
    accumulator = first[1];
  }

  for (const [index, element] of entries) {
    accumulator = call(accumulator, element, index, array);
  }

  return accumulator;
}
