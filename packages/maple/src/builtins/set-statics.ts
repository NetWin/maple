import { toString } from '../values/coercion.ts';
import { iterate } from '../values/iteration.ts';
import type { CallContext } from '../values/native.ts';
import { SetWrapper } from '../values/wrappers.ts';

/** `new Set(iterable?)`. */
export function constructSet(args: ReadonlyArray<unknown>, context: CallContext): SetWrapper {
  const set = new Set<unknown>();
  const [iterable] = args;
  if (iterable !== undefined && iterable !== null) {
    const iterator = iterate(iterable);
    if (!iterator) {
      return context.fail('TypeError', `${toString(iterable)} is not iterable`);
    }
    for (let step = iterator.next(); !step.done; step = iterator.next()) {
      set.add(step.value);
    }
  }
  return new SetWrapper(set);
}
