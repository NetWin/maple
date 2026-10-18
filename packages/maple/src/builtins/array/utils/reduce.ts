import type { CallContext } from '../../../values/native.ts';
import { arrayCallback } from './array-callback.ts';
import { presentEntries, presentEntriesFromEnd } from './entries.ts';

export function reduce(
  array: ReadonlyArray<unknown>,
  args: ReadonlyArray<unknown>,
  context: CallContext,
  fromEnd: boolean
): unknown {
  const call = arrayCallback(args[0], context);
  const entries = fromEnd ? presentEntriesFromEnd(array) : presentEntries(array);

  let accumulator: unknown;
  if (args.length > 1) {
    accumulator = args[1];
  } else {
    const first = entries.next();
    if (first.done === true) {
      return context.fail('TypeError', 'Reduce of empty array with no initial value');
    }
    accumulator = first.value[1];
  }

  // The rest of the same walk, so each element is still read when it is reached
  for (const [index, element] of entries) {
    accumulator = call(accumulator, element, index, array);
  }

  return accumulator;
}
