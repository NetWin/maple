import { defineOwn } from '../../../support/own-property.ts';
import { Closure } from '../../../values/closure.ts';
import { toString } from '../../../values/coercion.ts';
import { iterate } from '../../../values/iteration.ts';
import { toPropertyKey } from '../../../values/members.ts';
import { NativeFunction } from '../../../values/native.ts';
import { getMember } from '../../method-dispatch.ts';

/** Each entry is read like `entry[0]` and `entry[1]` would be, so any array-like pair works. */
export const OBJECT_STATIC_FROM_ENTRIES: NativeFunction = new NativeFunction(
  'fromEntries',
  Object.fromEntries.length,
  (_, [iterable], context) => {
    const fail = context.fail;
    const iterator = iterate(iterable);
    if (!iterator) {
      return fail('TypeError', `${toString(iterable)} is not iterable`);
    }

    const result: Record<string, unknown> = {};
    for (let step = iterator.next(); !step.done; step = iterator.next()) {
      const entry: unknown = step.value;
      if (typeof entry !== 'object' || entry === null || entry instanceof Closure) {
        return fail('TypeError', `Iterator value ${toString(entry)} is not an entry object`);
      }
      defineOwn(
        result,
        toPropertyKey(getMember(entry, '0', context)),
        getMember(entry, '1', context)
      );
    }

    return result;
  }
);
